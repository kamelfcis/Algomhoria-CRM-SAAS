-- Add Daily Rent section to the sections table
-- This section is required for the daily rent pricing feature

INSERT INTO sections (name_ar, name_en, status, created_at, updated_at)
VALUES (
  'إيجار يومي',  -- Arabic name
  'Daily Rent',   -- English name
  'active',       -- Status
  NOW(),          -- Created at
  NOW()           -- Updated at
)
ON CONFLICT DO NOTHING;

-- Verify the section was added
SELECT id, name_ar, name_en, status 
FROM sections 
WHERE name_en ILIKE '%daily%rent%' OR name_ar ILIKE '%يومي%';

