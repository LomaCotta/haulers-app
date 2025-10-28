-- Avatar Upload System Setup
-- Run this in Supabase SQL Editor

-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create function to clean up old avatars when user uploads new one
CREATE OR REPLACE FUNCTION cleanup_old_avatar()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old avatar if user is updating their profile with a new avatar_url
  IF OLD.avatar_url IS NOT NULL AND NEW.avatar_url IS NOT NULL AND OLD.avatar_url != NEW.avatar_url THEN
    -- Extract filename from old URL and delete from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = 'avatars' 
    AND name LIKE '%' || split_part(OLD.avatar_url, '/', array_length(string_to_array(OLD.avatar_url, '/'), 1)) || '%';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to clean up old avatars
DROP TRIGGER IF EXISTS cleanup_old_avatar_trigger ON public.profiles;
CREATE TRIGGER cleanup_old_avatar_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_avatar();

-- Create function to get user avatar URL
CREATE OR REPLACE FUNCTION get_user_avatar(user_uuid uuid)
RETURNS text AS $$
DECLARE
  avatar_url text;
BEGIN
  SELECT p.avatar_url INTO avatar_url
  FROM public.profiles p
  WHERE p.id = user_uuid;
  
  RETURN COALESCE(avatar_url, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_avatar TO authenticated;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_url ON public.profiles(avatar_url) WHERE avatar_url IS NOT NULL;

-- Verify the setup
SELECT 'Avatar upload system created successfully!' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url';
SELECT name FROM storage.buckets WHERE id = 'avatars';
