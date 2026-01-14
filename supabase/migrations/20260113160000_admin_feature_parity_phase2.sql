-- Phase 2: expand admin feature parity (filters, statuses, and review form fields)
-- This migration is additive and keeps existing app behavior intact.

-- -----------------------------------------------------------------------------
-- 1) Expand app_permission enum with additional permissions seen in the admin HTML
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- NOTE: Supabase runs Postgres where ADD VALUE IF NOT EXISTS is available.
  -- We still guard each label explicitly to be safe.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'create_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'create_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_blacklists'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_blacklists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_site_users'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_site_users';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'review_items'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'review_items';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'search_archived_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'search_archived_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'search_pending_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'search_pending_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'search_enqueued_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'search_enqueued_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'search_published_rejected_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'search_published_rejected_ads';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'set_target_response_time'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'set_target_response_time';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'edit_ads_outside_review_flow'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'edit_ads_outside_review_flow';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_shops'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_shops';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'search_site_users'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'search_site_users';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_doorstep_delivery_orders'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_doorstep_delivery_orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'view_transactions'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'view_transactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_skin_banners'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_skin_banners';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_listing_fee_paid_button'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_listing_fee_paid_button';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'view_ads_outside_review_flow'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'view_ads_outside_review_flow';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_memberships'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_memberships';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_skip_manual_ad_review'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_skip_manual_ad_review';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_deal_of_the_day_dsd'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_deal_of_the_day_dsd';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'manage_featured_shop_dsd'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'manage_featured_shop_dsd';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_permission' AND e.enumlabel = 'reindex_account_ads'
  ) THEN
    ALTER TYPE public.app_permission ADD VALUE 'reindex_account_ads';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2) Profiles: add admin-oriented status fields (for Manage users parity)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('verified', 'verification_unsuccessful', 'pending_verification')),
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_type TEXT NOT NULL DEFAULT 'private' CHECK (seller_type IN ('private', 'business')),
  ADD COLUMN IF NOT EXISTS phone_number_secondary TEXT,
  ADD COLUMN IF NOT EXISTS show_phone_on_ads BOOLEAN NOT NULL DEFAULT true;

-- Backfill status_changed_at for existing rows
UPDATE public.profiles
SET status_changed_at = COALESCE(status_changed_at, updated_at, created_at)
WHERE status_changed_at IS NULL;

-- Keep status_changed_at and deleted_at in sync.
CREATE OR REPLACE FUNCTION public.sync_profile_status_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- deleted_at
  IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
    NEW.status_changed_at := now();
    IF NEW.is_deleted THEN
      NEW.deleted_at := COALESCE(NEW.deleted_at, now());
    ELSE
      NEW.deleted_at := NULL;
    END IF;
  END IF;

  -- verification_status
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    NEW.status_changed_at := now();
  END IF;

  -- blacklisted (is_blocked)
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    NEW.status_changed_at := now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'profiles_sync_status_fields'
  ) THEN
    CREATE TRIGGER profiles_sync_status_fields
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_profile_status_fields();
  END IF;
END $$;

-- RLS: allow admins to update any profile (needed for user management tools)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update profiles'
  ) THEN
    CREATE POLICY "Admins can update profiles"
    ON public.profiles
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Ads: add fields needed for Search for ads + General review parity
-- -----------------------------------------------------------------------------
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS ad_type TEXT CHECK (ad_type IN ('for_rent','for_sale','to_buy','to_rent')),
  ADD COLUMN IF NOT EXISTS is_unconfirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid')),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reasons TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS product_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS features TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mrp NUMERIC,
  ADD COLUMN IF NOT EXISTS discount NUMERIC,
  ADD COLUMN IF NOT EXISTS duplicate_of_ad_id UUID REFERENCES public.ads(id);

-- Timestamp sync for deactivation / archiving
CREATE OR REPLACE FUNCTION public.sync_ad_state_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deactivated IS DISTINCT FROM OLD.is_deactivated THEN
    IF NEW.is_deactivated THEN
      NEW.deactivated_at := COALESCE(NEW.deactivated_at, now());
    ELSE
      NEW.deactivated_at := NULL;
    END IF;
  END IF;

  IF NEW.is_archived IS DISTINCT FROM OLD.is_archived THEN
    IF NEW.is_archived THEN
      NEW.archived_at := COALESCE(NEW.archived_at, now());
    ELSE
      NEW.archived_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'ads_sync_state_timestamps'
  ) THEN
    CREATE TRIGGER ads_sync_state_timestamps
      BEFORE UPDATE ON public.ads
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_ad_state_timestamps();
  END IF;
END $$;

-- Improve ad audit log action classification for "Promoted" and "Deactivated" events
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
    ELSIF (NEW.is_featured IS DISTINCT FROM OLD.is_featured AND NEW.is_featured = true)
       OR (NEW.promotion_type IS DISTINCT FROM OLD.promotion_type AND NEW.promotion_type IS NOT NULL) THEN
      v_action := 'promoted';
    ELSIF (NEW.is_deactivated IS DISTINCT FROM OLD.is_deactivated AND NEW.is_deactivated = true) THEN
      v_action := 'deactivated';
    ELSE
      v_action := 'updated';
    END IF;

    INSERT INTO public.ad_audit_logs (ad_id, actor_id, actor_role, action, old_values, new_values)
    VALUES (NEW.id, v_actor_id, v_actor_role, v_action, to_jsonb(OLD), to_jsonb(NEW));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS: allow updating ad_images sort_order (needed for moderation re-order)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ad_images'
      AND policyname = 'Users can update own ad images'
  ) THEN
    CREATE POLICY "Users can update own ad images"
    ON public.ad_images
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1
        FROM public.ads
        WHERE id = ad_id
          AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.ads
        WHERE id = ad_id
          AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
      )
    );
  END IF;
END $$;
