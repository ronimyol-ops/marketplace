-- Phase 4: Enforce blocked/deleted users cannot create new ads.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ads'
      AND policyname = 'Users can insert own ads'
  ) THEN
    EXECUTE 'DROP POLICY "Users can insert own ads" ON public.ads';
  END IF;
END $$;

CREATE POLICY "Users can insert own ads" ON public.ads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (
        COALESCE(p.is_blocked, false) = true
        OR COALESCE(p.is_deleted, false) = true
      )
  )
);
