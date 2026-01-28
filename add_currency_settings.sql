-- Add currency and dollar_rate settings to the settings table
-- This migration adds default currency settings if they don't exist

-- Insert currency setting (default to USD)
INSERT INTO settings (key, value, description, created_at, updated_at)
VALUES (
  'currency',
  'USD',
  'Selected currency for the website',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;

-- Insert dollar_rate setting (default to 30.00 as example)
INSERT INTO settings (key, value, description, created_at, updated_at)
VALUES (
  'dollar_rate',
  '30.00',
  'USD to EGP exchange rate',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO NOTHING;

