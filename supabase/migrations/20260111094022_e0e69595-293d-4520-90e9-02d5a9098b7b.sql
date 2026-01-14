-- 1. Add new columns to profiles for phone verification
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- 2. Add new columns to ads for extended location and category-specific fields
ALTER TABLE public.ads 
ADD COLUMN IF NOT EXISTS upazila TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- 3. Create messages table for chat system
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  buyer_blocked BOOLEAN DEFAULT false,
  seller_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ad_id, buyer_id, seller_id)
);

-- 5. Create category_fields table for dynamic fields per category
CREATE TABLE public.category_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, select, checkbox
  options JSONB, -- for select type fields
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Enable RLS on new tables
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_fields ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for messages
CREATE POLICY "Users can view own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark messages as read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- 8. RLS Policies for conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 9. RLS Policies for category_fields
CREATE POLICY "Category fields are viewable by everyone"
ON public.category_fields FOR SELECT
USING (true);

CREATE POLICY "Admins can manage category fields"
ON public.category_fields FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- 10. Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- 11. Insert default category fields for common categories
INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'brand',
  'Brand',
  'select',
  '["Samsung", "Apple", "Xiaomi", "Oppo", "Vivo", "Realme", "OnePlus", "Google", "Other"]'::jsonb,
  true,
  1
FROM public.categories c WHERE c.slug = 'electronics';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'storage',
  'Storage (GB)',
  'select',
  '["32", "64", "128", "256", "512", "1TB"]'::jsonb,
  false,
  2
FROM public.categories c WHERE c.slug = 'electronics';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'bedrooms',
  'Bedrooms',
  'select',
  '["1", "2", "3", "4", "5+"]'::jsonb,
  true,
  1
FROM public.categories c WHERE c.slug = 'property';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'bathrooms',
  'Bathrooms',
  'select',
  '["1", "2", "3", "4+"]'::jsonb,
  true,
  2
FROM public.categories c WHERE c.slug = 'property';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'size_sqft',
  'Size (sq ft)',
  'number',
  NULL,
  false,
  3
FROM public.categories c WHERE c.slug = 'property';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'property_type',
  'Property Type',
  'select',
  '["Apartment", "House", "Land", "Commercial", "Room"]'::jsonb,
  true,
  0
FROM public.categories c WHERE c.slug = 'property';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'vehicle_year',
  'Year',
  'number',
  NULL,
  true,
  1
FROM public.categories c WHERE c.slug = 'vehicles';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'mileage',
  'Mileage (km)',
  'number',
  NULL,
  false,
  2
FROM public.categories c WHERE c.slug = 'vehicles';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'fuel_type',
  'Fuel Type',
  'select',
  '["Petrol", "Diesel", "CNG", "Hybrid", "Electric"]'::jsonb,
  true,
  3
FROM public.categories c WHERE c.slug = 'vehicles';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'transmission',
  'Transmission',
  'select',
  '["Manual", "Automatic"]'::jsonb,
  false,
  4
FROM public.categories c WHERE c.slug = 'vehicles';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'salary_range',
  'Salary Range',
  'select',
  '["Negotiable", "10,000-20,000", "20,000-40,000", "40,000-60,000", "60,000-100,000", "100,000+"]'::jsonb,
  true,
  1
FROM public.categories c WHERE c.slug = 'jobs';

INSERT INTO public.category_fields (category_id, field_name, field_label, field_type, options, is_required, sort_order)
SELECT 
  c.id,
  'employment_type',
  'Employment Type',
  'select',
  '["Full-time", "Part-time", "Contract", "Freelance", "Internship"]'::jsonb,
  true,
  2
FROM public.categories c WHERE c.slug = 'jobs';