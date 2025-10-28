-- Create categories table and populate with service types
-- This script handles the case where the categories table doesn't exist

-- Step 1: Create the categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Insert comprehensive service categories
INSERT INTO public.categories (name, slug, description, icon, is_active) VALUES
  ('Moving Services', 'moving-services', 'Professional moving and relocation services', 'truck', true),
  ('Junk Haul', 'junk-haul', 'Junk removal and disposal services', 'trash', true),
  ('Packing Services', 'packing-services', 'Professional packing and unpacking services', 'package', true),
  ('Piano Moving', 'piano-moving', 'Specialized piano and instrument moving', 'music', true),
  ('Storage Solutions', 'storage-solutions', 'Storage and warehousing services', 'warehouse', true),
  ('Cleaning Services', 'cleaning-services', 'Residential and commercial cleaning', 'sparkles', true),
  ('Fence Installers', 'fence-installers', 'Fence installation and repair services', 'fence', true),
  ('Movers', 'movers', 'General moving and relocation', 'move', true),
  ('Landscaping', 'landscaping', 'Landscaping and garden services', 'tree-pine', true),
  ('Plumbing', 'plumbing', 'Plumbing installation and repair', 'wrench', true),
  ('Electrical', 'electrical', 'Electrical installation and repair', 'zap', true),
  ('HVAC', 'hvac', 'Heating, ventilation, and air conditioning', 'thermometer', true),
  ('Roofing', 'roofing', 'Roof installation and repair', 'home', true),
  ('Painting', 'painting', 'Interior and exterior painting services', 'palette', true),
  ('Flooring', 'flooring', 'Floor installation and repair', 'layers', true),
  ('Handyman', 'handyman', 'General handyman and repair services', 'hammer', true),
  ('Demolition', 'demolition', 'Demolition and debris removal', 'demolition', true),
  ('Construction', 'construction', 'General construction services', 'construction', true),
  ('Renovation', 'renovation', 'Home and office renovation', 'home', true),
  ('Maintenance', 'maintenance', 'Property maintenance services', 'settings', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Step 3: Add donation_badge column to businesses table (if not exists)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS donation_badge boolean DEFAULT false;

-- Step 4: Update existing businesses to use proper category slugs
UPDATE public.businesses 
SET service_type = CASE 
  WHEN service_type = 'moving_services' THEN 'moving-services'
  WHEN service_type = 'junk_haul' THEN 'junk-haul'
  WHEN service_type = 'packing_services' THEN 'packing-services'
  WHEN service_type = 'piano_moving' THEN 'piano-moving'
  WHEN service_type = 'storage_solutions' THEN 'storage-solutions'
  WHEN service_type = 'cleaning_services' THEN 'cleaning-services'
  WHEN service_type = 'fenceinstallers' THEN 'fence-installers'
  WHEN service_type = 'movers' THEN 'movers'
  ELSE service_type
END
WHERE service_type IN ('moving_services', 'junk_haul', 'packing_services', 'piano_moving', 'storage_solutions', 'cleaning_services', 'fenceinstallers', 'movers');

-- Step 5: Add index for performance
CREATE INDEX IF NOT EXISTS idx_businesses_donation_badge ON public.businesses(donation_badge);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- Step 6: Verify everything was created successfully
SELECT '=== CATEGORIES CREATED ===' as debug_info;
SELECT id, name, slug, description, is_active 
FROM public.categories 
ORDER BY name;

SELECT '=== BUSINESSES WITH DONATION BADGE COLUMN ===' as debug_info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'businesses' AND column_name = 'donation_badge';

SELECT '=== SAMPLE BUSINESSES ===' as debug_info;
SELECT id, name, service_type, verified, donation_badge, created_at 
FROM public.businesses 
ORDER BY created_at DESC 
LIMIT 5;
