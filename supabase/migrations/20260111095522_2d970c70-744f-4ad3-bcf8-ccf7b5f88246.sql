-- Add expiry and promotion fields to ads table
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotion_type TEXT CHECK (promotion_type IN ('featured', 'top', 'urgent')),
ADD COLUMN IF NOT EXISTS promotion_expires_at TIMESTAMP WITH TIME ZONE;

-- Create ad_posting_limits table
CREATE TABLE IF NOT EXISTS public.ad_posting_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  max_free_ads_per_month INTEGER NOT NULL DEFAULT 5,
  cooldown_minutes INTEGER NOT NULL DEFAULT 30,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  requires_payment BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_ad_counts table to track posting limits
CREATE TABLE IF NOT EXISTS public.user_ad_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  ad_count INTEGER NOT NULL DEFAULT 0,
  last_posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, month_year)
);

-- Enable RLS
ALTER TABLE public.ad_posting_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ad_counts ENABLE ROW LEVEL SECURITY;

-- RLS for ad_posting_limits (public read, admin manage)
CREATE POLICY "Posting limits are viewable by everyone" 
ON public.ad_posting_limits FOR SELECT USING (true);

CREATE POLICY "Admins can manage posting limits" 
ON public.ad_posting_limits FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for user_ad_counts
CREATE POLICY "Users can view own ad counts" 
ON public.user_ad_counts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad counts" 
ON public.user_ad_counts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad counts" 
ON public.user_ad_counts FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert default posting limits for restricted categories
INSERT INTO public.ad_posting_limits (category_id, max_free_ads_per_month, cooldown_minutes, requires_approval)
SELECT id, 3, 60, true FROM public.categories WHERE slug IN ('jobs', 'property', 'services')
ON CONFLICT DO NOTHING;