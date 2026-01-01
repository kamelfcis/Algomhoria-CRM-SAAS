-- Create storage bucket for team user images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('team-users', 'team-users', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for team-users bucket
-- Public read access
CREATE POLICY IF NOT EXISTS "Public read access for team-users"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-users');

-- Authenticated write access
CREATE POLICY IF NOT EXISTS "Authenticated write access for team-users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'team-users' AND auth.role() = 'authenticated');

-- Authenticated update access
CREATE POLICY IF NOT EXISTS "Authenticated update access for team-users"
ON storage.objects FOR UPDATE
USING (bucket_id = 'team-users' AND auth.role() = 'authenticated');

-- Authenticated delete access
CREATE POLICY IF NOT EXISTS "Authenticated delete access for team-users"
ON storage.objects FOR DELETE
USING (bucket_id = 'team-users' AND auth.role() = 'authenticated');

-- Alter team_users table to add image_url column
ALTER TABLE team_users
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN team_users.image_url IS 'URL of the team member profile image stored in team-users storage bucket';

