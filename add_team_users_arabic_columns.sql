-- Migration: Add Arabic columns to team_users table
-- Date: 2024
-- Description: Adds name_ar and poition_ar columns to support Arabic translations

ALTER TABLE team_users
ADD COLUMN IF NOT EXISTS name_ar TEXT,
ADD COLUMN IF NOT EXISTS poition_ar TEXT;

-- Add comments for clarity
COMMENT ON COLUMN team_users.name_ar IS 'Name in Arabic';
COMMENT ON COLUMN team_users.poition_ar IS 'Position in Arabic';

