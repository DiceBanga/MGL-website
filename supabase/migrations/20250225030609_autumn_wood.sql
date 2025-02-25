/*
  # Fix RLS policies for player registration

  1. Changes
    - Add policy to allow authenticated users to create their own player profile
    - Add policy to allow authenticated users to upload avatars
    - Add policy to allow users to read player profiles
*/

-- Allow authenticated users to create their own player profile
CREATE POLICY "Users can create their own profile"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to read any player profile
CREATE POLICY "Anyone can read player profiles"
ON players FOR SELECT
TO public
USING (true);

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to read avatars
CREATE POLICY "Anyone can read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');