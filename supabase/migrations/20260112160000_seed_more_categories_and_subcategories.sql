-- Seed additional categories and subcategories (Phase 10)
-- This expands the default taxonomy to cover a broader Bangladesh marketplace.

-- 1) Additional top-level categories
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Pets & Animals', 'pets-animals', '🐾', 9),
  ('Sports & Hobbies', 'sports-hobbies', '⚽', 10),
  ('Health & Beauty', 'health-beauty', '💄', 11),
  ('Kids & Baby', 'kids-baby', '👶', 12),
  ('Business & Industry', 'business-industry', '🏭', 13),
  ('Agriculture', 'agriculture', '🌾', 14)
ON CONFLICT DO NOTHING;

-- 2) Expanded subcategories for existing categories

-- Electronics
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Mobile Phones', 'mobile-phones'),
  ('Mobile Accessories', 'mobile-accessories'),
  ('Laptops', 'laptops'),
  ('Desktops', 'desktops'),
  ('Tablets', 'tablets'),
  ('TV & Video', 'tv-video'),
  ('Cameras', 'cameras'),
  ('Audio & Headphones', 'audio-headphones'),
  ('Gaming Consoles', 'gaming-consoles'),
  ('Smart Watches', 'smart-watches'),
  ('Printers & Scanners', 'printers-scanners'),
  ('Networking & Wi-Fi', 'networking-wifi'),
  ('Computer Accessories', 'computer-accessories'),
  ('Home Appliances', 'home-appliances')
) AS v(name, slug)
WHERE c.slug = 'electronics'
ON CONFLICT DO NOTHING;

-- Vehicles
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Cars', 'cars'),
  ('Motorcycles', 'motorcycles'),
  ('Bicycles', 'bicycles'),
  ('Scooters', 'scooters'),
  ('CNG/Auto-rickshaw', 'cng-auto-rickshaw'),
  ('Microbus/Van', 'microbus-van'),
  ('Trucks & Pickups', 'trucks-pickups'),
  ('Bus & Coach', 'bus-coach'),
  ('Parts & Accessories', 'parts-accessories'),
  ('Car Rentals', 'car-rentals')
) AS v(name, slug)
WHERE c.slug = 'vehicles'
ON CONFLICT DO NOTHING;

-- Property
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Apartments', 'apartments'),
  ('Houses', 'houses'),
  ('Rooms', 'rooms'),
  ('Land', 'land'),
  ('Commercial Property', 'commercial-property'),
  ('Office Space', 'office-space'),
  ('Shop/Showroom', 'shop-showroom'),
  ('Sublet/Flatmates', 'sublet-flatmates'),
  ('Garage/Parking', 'garage-parking')
) AS v(name, slug)
WHERE c.slug = 'property'
ON CONFLICT DO NOTHING;

-- Jobs
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('IT & Software', 'it-software'),
  ('Marketing & Sales', 'marketing-sales'),
  ('Customer Service', 'customer-service'),
  ('Accounting & Finance', 'accounting-finance'),
  ('Education & Training', 'education-training'),
  ('Driver & Delivery', 'driver-delivery'),
  ('Hospitality & Tourism', 'hospitality-tourism'),
  ('Construction & Engineering', 'construction-engineering'),
  ('Healthcare', 'healthcare'),
  ('Part-time & Freelance', 'part-time-freelance')
) AS v(name, slug)
WHERE c.slug = 'jobs'
ON CONFLICT DO NOTHING;

-- Fashion
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Men''s Clothing', 'mens-clothing'),
  ('Women''s Clothing', 'womens-clothing'),
  ('Kids Clothing', 'kids-clothing'),
  ('Shoes', 'shoes'),
  ('Bags', 'bags'),
  ('Watches', 'watches'),
  ('Jewellery', 'jewellery'),
  ('Beauty Products', 'beauty-products'),
  ('Traditional Wear', 'traditional-wear'),
  ('Sunglasses', 'sunglasses')
) AS v(name, slug)
WHERE c.slug = 'fashion'
ON CONFLICT DO NOTHING;

-- Services
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Home Services', 'home-services'),
  ('Electronics Repair', 'electronics-repair'),
  ('Tuition & Coaching', 'tuition-coaching'),
  ('Moving & Transport', 'moving-transport'),
  ('Event Services', 'event-services'),
  ('Photography & Video', 'photography-video'),
  ('IT Services', 'it-services'),
  ('Cleaning Services', 'cleaning-services'),
  ('Beauty Services', 'beauty-services'),
  ('Travel & Tours', 'travel-tours')
) AS v(name, slug)
WHERE c.slug = 'services'
ON CONFLICT DO NOTHING;

-- Furniture
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Sofas & Chairs', 'sofas-chairs'),
  ('Beds & Mattresses', 'beds-mattresses'),
  ('Tables & Desks', 'tables-desks'),
  ('Wardrobes', 'wardrobes'),
  ('Dining Furniture', 'dining-furniture'),
  ('Office Furniture', 'office-furniture'),
  ('Kitchen Cabinets', 'kitchen-cabinets'),
  ('Home Decor', 'home-decor'),
  ('Curtains & Blinds', 'curtains-blinds'),
  ('Lighting', 'lighting')
) AS v(name, slug)
WHERE c.slug = 'furniture'
ON CONFLICT DO NOTHING;

-- Education
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Books & Magazines', 'books-magazines'),
  ('Textbooks', 'textbooks'),
  ('Tutors', 'tutors'),
  ('Admission Test Prep', 'admission-test-prep'),
  ('Online Courses', 'online-courses'),
  ('Computer Training', 'computer-training'),
  ('Language Learning', 'language-learning'),
  ('Musical Instruments', 'musical-instruments'),
  ('Stationery', 'stationery'),
  ('Sports Coaching', 'sports-coaching')
) AS v(name, slug)
WHERE c.slug = 'education'
ON CONFLICT DO NOTHING;

-- 3) Subcategories for new categories

-- Pets & Animals
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Dogs', 'dogs'),
  ('Cats', 'cats'),
  ('Birds', 'birds'),
  ('Fish & Aquariums', 'fish-aquariums'),
  ('Pet Food', 'pet-food'),
  ('Pet Accessories', 'pet-accessories'),
  ('Farm Animals', 'farm-animals'),
  ('Poultry', 'poultry'),
  ('Pet Services', 'pet-services')
) AS v(name, slug)
WHERE c.slug = 'pets-animals'
ON CONFLICT DO NOTHING;

-- Sports & Hobbies
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Sports Equipment', 'sports-equipment'),
  ('Fitness & Gym', 'fitness-gym'),
  ('Musical Instruments', 'musical-instruments'),
  ('Gaming', 'gaming'),
  ('Bicycles', 'bicycles'),
  ('Arts & Crafts', 'arts-crafts'),
  ('Travel & Outdoors', 'travel-outdoors'),
  ('Collectibles', 'collectibles'),
  ('Books & Reading', 'books-reading')
) AS v(name, slug)
WHERE c.slug = 'sports-hobbies'
ON CONFLICT DO NOTHING;

-- Health & Beauty
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Skincare', 'skincare'),
  ('Makeup', 'makeup'),
  ('Haircare', 'haircare'),
  ('Perfume', 'perfume'),
  ('Personal Care', 'personal-care'),
  ('Salon Services', 'salon-services'),
  ('Salon Equipment', 'salon-equipment')
) AS v(name, slug)
WHERE c.slug = 'health-beauty'
ON CONFLICT DO NOTHING;

-- Kids & Baby
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Baby Clothes', 'baby-clothes'),
  ('Kids Clothes', 'kids-clothes'),
  ('Toys', 'toys'),
  ('Baby Gear', 'baby-gear'),
  ('Strollers & Car Seats', 'strollers-car-seats'),
  ('Kids Furniture', 'kids-furniture'),
  ('School Supplies', 'school-supplies'),
  ('Maternity', 'maternity')
) AS v(name, slug)
WHERE c.slug = 'kids-baby'
ON CONFLICT DO NOTHING;

-- Business & Industry
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Office Equipment', 'office-equipment'),
  ('Industrial Machinery', 'industrial-machinery'),
  ('Shop & Restaurant Equipment', 'shop-restaurant-equipment'),
  ('Commercial Supplies', 'commercial-supplies'),
  ('Printing & Packaging', 'printing-packaging'),
  ('Raw Materials', 'raw-materials'),
  ('Wholesale', 'wholesale'),
  ('Business Services', 'business-services')
) AS v(name, slug)
WHERE c.slug = 'business-industry'
ON CONFLICT DO NOTHING;

-- Agriculture
INSERT INTO public.subcategories (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM public.categories c
CROSS JOIN (VALUES
  ('Seeds & Plants', 'seeds-plants'),
  ('Farming Machinery', 'farming-machinery'),
  ('Agro Tools', 'agro-tools'),
  ('Livestock', 'livestock'),
  ('Poultry', 'poultry'),
  ('Fishery', 'fishery'),
  ('Fertilizer & Crop Care', 'fertilizer-crop-care')
) AS v(name, slug)
WHERE c.slug = 'agriculture'
ON CONFLICT DO NOTHING;
