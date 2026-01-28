-- Migration: Add pricing columns to properties table
-- This migration adds support for different pricing models based on property sections:
-- - daily_rent_pricing: JSONB column for daily rent properties with date ranges and day-of-week prices
-- - sale_price: DECIMAL column for sale price
-- - rent_price: DECIMAL column for rent price

-- Add daily_rent_pricing column (JSONB for flexible date range pricing)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS daily_rent_pricing JSONB DEFAULT NULL;

-- Add sale_price column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(15, 2) DEFAULT NULL;

-- Add rent_price column
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS rent_price DECIMAL(15, 2) DEFAULT NULL;

-- Add comment to explain the daily_rent_pricing structure
COMMENT ON COLUMN properties.daily_rent_pricing IS 'JSON array of date range pricing objects. Each object has: {from_date: "YYYY-MM-DD", to_date: "YYYY-MM-DD", monday: number, tuesday: number, wednesday: number, thursday: number, friday: number, saturday: number, sunday: number}';

-- Add comment to explain sale_price
COMMENT ON COLUMN properties.sale_price IS 'Price for sale properties';

-- Add comment to explain rent_price
COMMENT ON COLUMN properties.rent_price IS 'Price for rent properties';

