-- Add rental_period column to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS rental_period TEXT NULL CHECK (rental_period IN ('monthly', 'weekly', 'yearly'));

-- Add index for rental_period
CREATE INDEX IF NOT EXISTS idx_properties_rental_period ON public.properties USING btree (rental_period);

-- Add comment
COMMENT ON COLUMN public.properties.rental_period IS 'Rental period for properties: monthly, weekly, or yearly';

