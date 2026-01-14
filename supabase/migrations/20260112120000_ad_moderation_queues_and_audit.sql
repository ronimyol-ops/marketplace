-- Add moderation metadata columns to ads table
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS review_source TEXT CHECK (review_source IN ('user','admin','system')) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS needs_verification BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_auto_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS first_time_poster BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS last_reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Create ad_audit_logs table
CREATE TABLE IF NOT EXISTS public.ad_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT NOT NULL DEFAULT 'system' CHECK (actor_role IN ('user','admin','system')),
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create enum and table for ad edit requests (edit queue)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_edit_status') THEN
    CREATE TYPE public.ad_edit_status AS ENUM ('pending','approved','rejected');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.ad_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.ad_edit_status NOT NULL DEFAULT 'pending',
  old_values JSONB NOT NULL,
  new_values JSONB NOT NULL,
  review_message TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settings table for the auto-moderation system
CREATE TABLE IF NOT EXISTS public.auto_moderation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_approve_first_time_posters BOOLEAN NOT NULL DEFAULT false,
  require_phone_verification BOOLEAN NOT NULL DEFAULT true,
  min_description_length INTEGER NOT NULL DEFAULT 40,
  blocked_keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger to keep updated_at in sync on auto_moderation_settings
CREATE OR REPLACE FUNCTION public.update_auto_moderation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_auto_moderation_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_auto_moderation_settings_updated_at
      BEFORE UPDATE ON public.auto_moderation_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_auto_moderation_settings_updated_at();
  END IF;
END$$;

-- Seed a single default settings row if none exists
INSERT INTO public.auto_moderation_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.auto_moderation_settings);

-- Function to log ad changes into ad_audit_logs
CREATE OR REPLACE FUNCTION public.log_ad_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_actor_role TEXT;
  v_action TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    v_actor_role := 'system';
  ELSIF public.has_role(v_actor_id, 'admin'::public.app_role) THEN
    v_actor_role := 'admin';
  ELSE
    v_actor_role := 'user';
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    INSERT INTO public.ad_audit_logs (ad_id, actor_id, actor_role, action, new_values)
    VALUES (NEW.id, v_actor_id, v_actor_role, v_action, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := 'status_changed_from_' || OLD.status || '_to_' || NEW.status;
    ELSE
      v_action := 'updated';
    END IF;

    INSERT INTO public.ad_audit_logs (ad_id, actor_id, actor_role, action, old_values, new_values)
    VALUES (NEW.id, v_actor_id, v_actor_role, v_action, to_jsonb(OLD), to_jsonb(NEW));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to set first_time_poster flag and apply simple auto-moderation on new ads
CREATE OR REPLACE FUNCTION public.apply_auto_moderation()
RETURNS TRIGGER AS $$
DECLARE
  v_settings public.auto_moderation_settings;
  v_profile public.profiles;
  v_previous_ads_count INTEGER;
BEGIN
  -- First-time poster?
  SELECT COUNT(*) INTO v_previous_ads_count
  FROM public.ads
  WHERE user_id = NEW.user_id
    AND id <> NEW.id;

  NEW.first_time_poster := (v_previous_ads_count = 0);

  -- Load current moderation settings (single row)
  SELECT * INTO v_settings
  FROM public.auto_moderation_settings
  ORDER BY created_at
  LIMIT 1;

  IF v_settings.is_enabled THEN
    -- Check phone verification
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF v_settings.require_phone_verification AND (v_profile.phone_verified IS DISTINCT FROM true) THEN
      -- Skip auto-approval
      RETURN NEW;
    END IF;

    -- Check description length
    IF NEW.description IS NULL OR length(NEW.description) < v_settings.min_description_length THEN
      RETURN NEW;
    END IF;

    -- Check blocked keywords in title or description
    IF v_settings.blocked_keywords IS NOT NULL AND array_length(v_settings.blocked_keywords, 1) > 0 THEN
      IF EXISTS (
        SELECT 1
        FROM unnest(v_settings.blocked_keywords) AS kw
        WHERE (NEW.title ILIKE '%' || kw || '%')
           OR (NEW.description ILIKE '%' || kw || '%')
      ) THEN
        RETURN NEW;
      END IF;
    END IF;

    -- If we reached here, the ad is considered safe for auto-approval
    NEW.status := 'approved'::public.ad_status;
    NEW.is_auto_approved := true;
    NEW.needs_verification := true;
    NEW.review_source := 'system';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach triggers to ads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ads_log_ad_audit'
  ) THEN
    CREATE TRIGGER ads_log_ad_audit
      AFTER INSERT OR UPDATE ON public.ads
      FOR EACH ROW
      EXECUTE FUNCTION public.log_ad_audit();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'ads_apply_auto_moderation'
  ) THEN
    CREATE TRIGGER ads_apply_auto_moderation
      BEFORE INSERT ON public.ads
      FOR EACH ROW
      EXECUTE FUNCTION public.apply_auto_moderation();
  END IF;
END$$;

-- Enable RLS on new tables
ALTER TABLE public.ad_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_moderation_settings ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can see audit logs
CREATE POLICY "Admins can view ad audit logs"
ON public.ad_audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS: audit logs are written by triggers with definer rights; no direct insert from client
CREATE POLICY "No direct insert into ad_audit_logs"
ON public.ad_audit_logs FOR INSERT
WITH CHECK (false);

-- RLS: edit requests - users can create for their own ads, admins can manage
CREATE POLICY "Users can create own ad edit requests"
ON public.ad_edit_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ad edit requests"
ON public.ad_edit_requests FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update edit requests"
ON public.ad_edit_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- RLS: auto_moderation_settings - only admins can view/manage
CREATE POLICY "Admins can manage auto moderation settings"
ON public.auto_moderation_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role));