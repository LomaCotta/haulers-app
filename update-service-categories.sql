-- Update service categories and add more comprehensive options
-- This will populate the service_type dropdown with all available categories

-- First, let's see what's currently in the categories table
SELECT '=== CURRENT CATEGORIES ===' as debug_info;
SELECT * FROM public.categories ORDER BY name;

-- If categories table doesn't exist or is empty, let's create/update it
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

-- Insert comprehensive service categories
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

-- Update existing businesses to use proper category slugs
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

-- Verify the categories were created
SELECT '=== VERIFIED CATEGORIES ===' as debug_info;
SELECT id, name, slug, description, is_active 
FROM public.categories 
ORDER BY name;

-- Show updated businesses
SELECT '=== UPDATED BUSINESSES ===' as debug_info;
SELECT id, name, service_type, created_at 
FROM public.businesses 
ORDER BY created_at DESC;
