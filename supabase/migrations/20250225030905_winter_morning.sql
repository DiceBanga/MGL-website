/*
  # Fix player profile policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Add comprehensive policies for player profile management
    - Add storage policies for avatar management
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can create their own profile" ON players;
DROP POLICY IF EXISTS "Anyone can read player profiles" ON players;
DROP POLICY IF EXISTS "Players can edit their own profile" ON players;
DROP POLICY IF EXISTS "Users can update their own profile" ON players;

-- Create comprehensive policies for player profiles
CREATE POLICY "Enable read access for all users"
  ON players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
  ON players FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage policies for avatars
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read avatars" ON storage.objects;

CREATE POLICY "Avatar upload policy"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar read policy"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar update policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Avatar delete policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );