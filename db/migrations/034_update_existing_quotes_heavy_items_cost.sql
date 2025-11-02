-- Migration to update existing quotes to add heavy_items and heavy_items_cost to breakdown JSON
-- This ensures all existing quotes have heavy_items explicitly saved
-- Run this AFTER 033_create_quote_function.sql has been applied

-- Function to update breakdown JSON for existing quotes
DO $$
DECLARE
  quote_record RECORD;
  heavy_items_total numeric := 0;
  heavy_item jsonb;
  item_price numeric;
  updated_count int := 0;
  breakdown_total numeric := 0;
  calculated_subtotal numeric := 0;
  missing_amount numeric := 0;
BEGIN
  -- Loop through all quotes that have a breakdown but don't have heavy_items or heavy_items_cost
  FOR quote_record IN 
    SELECT id, breakdown, price_total_cents
    FROM movers_quotes 
    WHERE breakdown IS NOT NULL 
      AND breakdown != '{}'::jsonb
      AND (
        NOT (breakdown ? 'heavy_items')
        OR breakdown->>'heavy_items' IS NULL
        OR (
          NOT (breakdown ? 'heavy_items_cost')
          OR breakdown->>'heavy_items_cost' IS NULL
          OR (breakdown->>'heavy_items_cost')::numeric = 0
        )
      )
  LOOP
    heavy_items_total := 0;
    
    -- Method 1: Check if heavy_items already exists as a number
    IF quote_record.breakdown ? 'heavy_items' AND jsonb_typeof(quote_record.breakdown->'heavy_items') = 'number' THEN
      heavy_items_total := (quote_record.breakdown->>'heavy_items')::numeric;
    -- Method 2: Check if heavy_items_cost already exists
    ELSIF quote_record.breakdown ? 'heavy_items_cost' AND jsonb_typeof(quote_record.breakdown->'heavy_items_cost') = 'number' THEN
      heavy_items_total := (quote_record.breakdown->>'heavy_items_cost')::numeric;
    -- Method 3: Check if heavy_items is an array (calculate total from array)
    ELSIF quote_record.breakdown ? 'heavy_items' AND jsonb_typeof(quote_record.breakdown->'heavy_items') = 'array' THEN
      -- Calculate total cost from array of heavy items
      FOR heavy_item IN SELECT * FROM jsonb_array_elements(quote_record.breakdown->'heavy_items')
      LOOP
        -- Get price_cents or price from each item
        IF heavy_item ? 'price_cents' THEN
          heavy_items_total := heavy_items_total + ((heavy_item->>'price_cents')::numeric / 100.0);
        ELSIF heavy_item ? 'price' THEN
          item_price := (heavy_item->>'price')::numeric;
          IF item_price > 1000 THEN
            heavy_items_total := heavy_items_total + (item_price / 100.0);
          ELSE
            heavy_items_total := heavy_items_total + item_price;
          END IF;
        END IF;
      END LOOP;
    -- Method 4: Calculate missing amount from breakdown total vs actual total
    ELSE
      -- Calculate what's missing: actual total - breakdown subtotal
      breakdown_total := COALESCE((quote_record.breakdown->>'total')::numeric, 0);
      calculated_subtotal := 0;
      
      -- Sum all breakdown items
      IF quote_record.breakdown ? 'basePrice' THEN
        calculated_subtotal := calculated_subtotal + COALESCE((quote_record.breakdown->>'basePrice')::numeric, 0);
      END IF;
      IF quote_record.breakdown ? 'base_hourly' THEN
        calculated_subtotal := calculated_subtotal + COALESCE((quote_record.breakdown->>'base_hourly')::numeric, 0);
      END IF;
      IF quote_record.breakdown ? 'packingCost' THEN
        calculated_subtotal := calculated_subtotal + COALESCE((quote_record.breakdown->>'packingCost')::numeric, 0);
      END IF;
      IF quote_record.breakdown ? 'stairsCost' THEN
        calculated_subtotal := calculated_subtotal + COALESCE((quote_record.breakdown->>'stairsCost')::numeric, 0);
      END IF;
      
      -- Check actual total from price_total_cents
      IF quote_record.price_total_cents IS NOT NULL THEN
        missing_amount := (quote_record.price_total_cents::numeric / 100.0) - calculated_subtotal;
        
        -- If missing amount is significant (> $10) and positive, it might be heavy items
        IF missing_amount > 10 THEN
          heavy_items_total := missing_amount;
          RAISE NOTICE 'Quote %: Calculated heavy_items from difference: % (total: %, subtotal: %)', 
            quote_record.id, heavy_items_total, (quote_record.price_total_cents::numeric / 100.0), calculated_subtotal;
        END IF;
      END IF;
    END IF;
    
    -- If we found heavy_items_total > 0, update the breakdown
    IF heavy_items_total > 0 THEN
      UPDATE movers_quotes
      SET breakdown = breakdown || jsonb_build_object(
          'heavy_items', heavy_items_total,
          'heavy_items_cost', heavy_items_total
        ),
          updated_at = NOW()
      WHERE id = quote_record.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Updated quote % with heavy_items: % and heavy_items_cost: %', 
        quote_record.id, heavy_items_total, heavy_items_total;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Updated % quotes with heavy_items and heavy_items_cost', updated_count;
END $$;

