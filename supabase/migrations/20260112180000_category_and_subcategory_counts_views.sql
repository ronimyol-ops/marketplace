-- Phase 15
-- Add lightweight aggregated counts to power category/subcategory badges in the UI.

-- Indexes to improve common browse/search queries (status/category/subcategory filters)
CREATE INDEX IF NOT EXISTS idx_ads_status ON public.ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_category_status ON public.ads(category_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_subcategory_status ON public.ads(subcategory_id, status);

-- Approved ad counts per category
CREATE OR REPLACE VIEW public.category_ad_counts AS
SELECT
  category_id,
  COUNT(*)::int AS ad_count
FROM public.ads
WHERE status = 'approved'
GROUP BY category_id;

-- Approved ad counts per subcategory
CREATE OR REPLACE VIEW public.subcategory_ad_counts AS
SELECT
  subcategory_id,
  COUNT(*)::int AS ad_count
FROM public.ads
WHERE status = 'approved'
  AND subcategory_id IS NOT NULL
GROUP BY subcategory_id;

GRANT SELECT ON public.category_ad_counts TO anon, authenticated;
GRANT SELECT ON public.subcategory_ad_counts TO anon, authenticated;
