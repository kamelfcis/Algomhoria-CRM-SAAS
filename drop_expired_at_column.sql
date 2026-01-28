-- Drop expired_at column from properties table
-- This column is no longer used

ALTER TABLE public.properties
DROP COLUMN IF EXISTS expired_at;

-- Remove any indexes related to expired_at if they exist
DROP INDEX IF EXISTS idx_properties_expired_at;

