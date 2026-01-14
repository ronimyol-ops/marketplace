-- Seed a default row for auto_moderation_settings if none exists
INSERT INTO public.auto_moderation_settings (
  is_enabled,
  auto_approve_first_time_posters,
  require_phone_verification,
  min_description_length,
  blocked_keywords
)
SELECT
  true,
  false,
  true,
  40,
  '{}'::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.auto_moderation_settings
);
