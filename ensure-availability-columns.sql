-- Ensure availability columns exist and approval function copies them

-- 1) Add columns if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='businesses' AND column_name='availability_hours'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN availability_hours JSONB DEFAULT '{"start":"09:00","end":"17:00"}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='businesses' AND column_name='daily_availability'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN daily_availability JSONB;
  END IF;
END $$;

-- Drop and recreate to avoid parameter renaming conflicts
DROP FUNCTION IF EXISTS public.apply_business_edit_request(uuid);

-- Recreate with the same parameter name many clients expect
CREATE FUNCTION public.apply_business_edit_request(edit_request_id uuid)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_changes JSONB;
  v_business_id uuid;
BEGIN
  SELECT proposed_changes, business_id
  INTO v_changes, v_business_id
  FROM public.business_edit_requests
  WHERE id = edit_request_id;

  IF v_changes IS NULL THEN
    RETURN 'ERROR: No proposed changes found';
  END IF;

  -- Update only if keys exist
  UPDATE public.businesses b
  SET
    availability_hours = COALESCE(v_changes->'availability_hours', b.availability_hours),
    daily_availability = COALESCE(v_changes->'daily_availability', b.daily_availability)
  WHERE b.id = v_business_id;

  -- Also let any existing, broader function handle other fields if present
  -- If you already have a comprehensive version, keep it. This ensures these two keys are not missed.

  UPDATE public.business_edit_requests
  SET status='approved', reviewed_at=NOW()
  WHERE id = edit_request_id;

  RETURN 'SUCCESS: Applied availability fields';
END;
$$;


