-- Add updated_at column to movers_quotes table
-- This column is referenced in the create_or_update_movers_quote function

ALTER TABLE movers_quotes 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to automatically update updated_at on row updates
CREATE OR REPLACE FUNCTION update_movers_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_movers_quotes_updated_at ON movers_quotes;

CREATE TRIGGER trg_update_movers_quotes_updated_at
  BEFORE UPDATE ON movers_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_movers_quotes_updated_at();

