-- Add phone column to businesses table
alter table public.businesses add column phone text;

-- Add service_type column (single value) to businesses table
alter table public.businesses add column service_type text;

-- Update existing records to use the first service_type from service_types array
update public.businesses 
set service_type = service_types[1] 
where service_types is not null and array_length(service_types, 1) > 0;

-- Make service_type not null for new records (optional, can be removed if you want to allow null)
-- alter table public.businesses alter column service_type set not null;
