-- Add YouTube URL and Property Note fields to properties table

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS youtube_url TEXT NULL,
ADD COLUMN IF NOT EXISTS property_note TEXT NULL;

-- Add index for YouTube URL if needed for searching
CREATE INDEX IF NOT EXISTS idx_properties_youtube_url ON public.properties USING btree (youtube_url) TABLESPACE pg_default WHERE youtube_url IS NOT NULL;

