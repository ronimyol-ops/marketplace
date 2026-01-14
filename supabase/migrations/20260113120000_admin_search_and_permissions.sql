-- Add admin management + search features support (permissions, email logs, profile email)

-- 1) Store email on profiles for admin search
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS profiles_email_lower_idx
ON public.profiles ((lower(email)));

-- Backfill profile emails from auth.users where possible
DO $$
BEGIN
  UPDATE public.profiles p
  SET email = u.email
  FROM auth.users u
  WHERE p.user_id = u.id
    AND p.email IS NULL;
EXCEPTION WHEN undefined_table THEN
  -- In case auth.users is not accessible in some environments
  NULL;
END;
$$;

-- Update the new-user trigger function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2) Add activation flag to roles so admins can be deactivated without deleting role rows
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

UPDATE public.user_roles
SET is_active = TRUE
WHERE is_active IS NULL;

-- Make has_role respect the activation flag
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND COALESCE(is_active, TRUE) = TRUE
  );
END;
$$;


-- 3) Admin permissions (lightweight capability flags)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_permission') THEN
    CREATE TYPE public.app_permission AS ENUM (
      'manage_admins',
      'manage_users',
      'review_ads',
      'search_ads',
      'search_emails',
      'manage_categories',
      'manage_reports',
      'manage_moderation_settings'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_permissions'
      AND policyname = 'Users can view own permissions'
  ) THEN
    CREATE POLICY "Users can view own permissions"
      ON public.user_permissions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_permissions'
      AND policyname = 'Admins can view all permissions'
  ) THEN
    CREATE POLICY "Admins can view all permissions"
      ON public.user_permissions
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_permissions'
      AND policyname = 'Admins can manage permissions'
  ) THEN
    CREATE POLICY "Admins can manage permissions"
      ON public.user_permissions
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END;
$$;

-- Seed all permissions for existing admins (so the new screens work immediately)
INSERT INTO public.user_permissions (user_id, permission)
SELECT ur.user_id, p.permission
FROM public.user_roles ur
CROSS JOIN (
  SELECT unnest(enum_range(NULL::public.app_permission)) AS permission
) p
WHERE ur.role = 'admin'
  AND COALESCE(ur.is_active, TRUE) = TRUE
ON CONFLICT DO NOTHING;


-- 4) Email moderation/search logging tables (simple internal log for admin search)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_state') THEN
    CREATE TYPE public.email_state AS ENUM (
      'approved',
      'enqueued',
      'rejected'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_event_type') THEN
    CREATE TYPE public.email_event_type AS ENUM (
      'created',
      'approved',
      'rejected',
      'sent'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.email_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NULL,
  recipient_phone TEXT NULL,
  subject TEXT NULL,
  template TEXT NULL,
  body_preview TEXT NULL,
  current_state public.email_state NOT NULL DEFAULT 'enqueued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_items_recipient_email_idx
ON public.email_items ((lower(recipient_email)));

CREATE INDEX IF NOT EXISTS email_items_recipient_phone_idx
ON public.email_items (recipient_phone);

CREATE INDEX IF NOT EXISTS email_items_state_idx
ON public.email_items (current_state);

CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID NOT NULL REFERENCES public.email_items(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type public.email_event_type NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_events_email_id_idx
ON public.email_events (email_id);

CREATE INDEX IF NOT EXISTS email_events_type_date_idx
ON public.email_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS email_events_actor_idx
ON public.email_events (actor_id);

-- updated_at trigger for email_items
CREATE OR REPLACE FUNCTION public.update_email_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_email_items_updated_at'
  ) THEN
    CREATE TRIGGER update_email_items_updated_at
      BEFORE UPDATE ON public.email_items
      FOR EACH ROW
      EXECUTE FUNCTION public.update_email_items_updated_at();
  END IF;
END;
$$;

ALTER TABLE public.email_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_items'
      AND policyname = 'Admins can view email items'
  ) THEN
    CREATE POLICY "Admins can view email items"
      ON public.email_items
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_items'
      AND policyname = 'Admins can manage email items'
  ) THEN
    CREATE POLICY "Admins can manage email items"
      ON public.email_items
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_events'
      AND policyname = 'Admins can view email events'
  ) THEN
    CREATE POLICY "Admins can view email events"
      ON public.email_events
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_events'
      AND policyname = 'Admins can manage email events'
  ) THEN
    CREATE POLICY "Admins can manage email events"
      ON public.email_events
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END;
$$;
