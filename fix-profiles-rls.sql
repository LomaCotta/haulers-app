-- Fix RLS policies for profiles table
-- This allows users to create their own profiles when they sign up

-- First, check if the INSERT policy exists
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'insert_own_profile';

-- Drop the existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;

-- Create the INSERT policy for profiles
CREATE POLICY "insert_own_profile" ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'profiles';
