/*
  # Add avatar and Twitter fields to players table

  1. Changes
    - Add avatar_url column to players table
    - Add twitter_handle column to players table
    - Add bio column for user descriptions
    - Add social media handle columns
    - Create avatars storage bucket

  2. Security
    - Enable RLS on storage bucket
    - Add policy for authenticated users to upload avatars
*/

-- Add new columns to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS twitter_handle text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS twitch_handle text,
ADD COLUMN IF NOT EXISTS youtube_handle text,
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS discord_handle text;

-- Create storage bucket for avatars if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name)
  VALUES ('avatars', 'avatars')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Enable RLS on the avatars bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload avatars
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy to allow public to view avatars
CREATE POLICY "Allow public to view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');