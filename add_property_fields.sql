-- Add new fields to properties table
-- Number of receptions, number of rooms, building number, and apartment number

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS no_of_receptions INTEGER NULL,
ADD COLUMN IF NOT EXISTS no_of_rooms INTEGER NULL,
ADD COLUMN IF NOT EXISTS building_no TEXT NULL,
ADD COLUMN IF NOT EXISTS apartment_no TEXT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_no_of_rooms ON public.properties USING btree (no_of_rooms) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_properties_no_of_receptions ON public.properties USING btree (no_of_receptions) TABLESPACE pg_default;

