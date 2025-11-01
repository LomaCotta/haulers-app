-- Ensure one movers provider per business
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_movers_providers_business'
  ) THEN
    CREATE UNIQUE INDEX uniq_movers_providers_business ON movers_providers(business_id);
  END IF;
END $$;

