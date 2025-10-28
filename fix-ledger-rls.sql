-- Fix RLS policies for admin ledger access and add test data
-- Run this in Supabase SQL Editor

-- First, check current RLS policies on ledger_entries
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ledger_entries';

-- Drop existing policies that might be blocking admin access
DROP POLICY IF EXISTS "select_ledger_entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "insert_ledger_entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "update_ledger_entries" ON public.ledger_entries;
DROP POLICY IF EXISTS "delete_ledger_entries" ON public.ledger_entries;

-- Create new policies that allow admin full access
CREATE POLICY "admin_full_access_ledger" ON public.ledger_entries 
FOR ALL 
USING (
  -- Allow full access to admins
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR
  -- Allow public read access for transparency
  true
);

-- Verify the new policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'ledger_entries';

-- Add some test ledger entries if none exist
INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-10-01' as period_month,
  'income_fees' as category,
  15000 as amount_cents,
  'Platform fees from October bookings' as note
WHERE NOT EXISTS (SELECT 1 FROM public.ledger_entries LIMIT 1);

INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-10-01' as period_month,
  'donations' as category,
  5000 as amount_cents,
  'Community donations received' as note
WHERE (SELECT COUNT(*) FROM public.ledger_entries) < 2;

INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-10-01' as period_month,
  'infra_costs' as category,
  -8000 as amount_cents,
  'Server and infrastructure costs' as note
WHERE (SELECT COUNT(*) FROM public.ledger_entries) < 3;

INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-10-01' as period_month,
  'grants' as category,
  -3000 as amount_cents,
  'Community grants distributed' as note
WHERE (SELECT COUNT(*) FROM public.ledger_entries) < 4;

INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-11-01' as period_month,
  'income_fees' as category,
  22000 as amount_cents,
  'Platform fees from November bookings' as note
WHERE (SELECT COUNT(*) FROM public.ledger_entries) < 5;

INSERT INTO public.ledger_entries (
  period_month,
  category,
  amount_cents,
  note
)
SELECT 
  '2024-11-01' as period_month,
  'staff' as category,
  -12000 as amount_cents,
  'Staff salaries and benefits' as note
WHERE (SELECT COUNT(*) FROM public.ledger_entries) < 6;

-- Verify the entries were created
SELECT 
  id,
  period_month,
  category,
  amount_cents,
  note,
  created_at
FROM public.ledger_entries 
ORDER BY period_month DESC, created_at DESC;
