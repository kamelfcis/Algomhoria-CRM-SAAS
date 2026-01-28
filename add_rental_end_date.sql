-- Add rental_end_date column to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS rental_end_date TIMESTAMP WITH TIME ZONE NULL;

-- Add index for rental_end_date
CREATE INDEX IF NOT EXISTS idx_properties_rental_end_date ON public.properties USING btree (rental_end_date);

-- Add comment
COMMENT ON COLUMN public.properties.rental_end_date IS 'End date for rental period. When this date passes, is_rented will be automatically set to false.';

-- Create function to automatically update expired rentals
CREATE OR REPLACE FUNCTION public.update_expired_rentals()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  property_ids UUID[] := ARRAY[]::UUID[];
  property_id UUID;
BEGIN
  -- Update properties where rental_end_date has passed and is_rented is true
  FOR property_id IN
    SELECT id
    FROM public.properties
    WHERE 
      is_rented = true
      AND rental_end_date IS NOT NULL
      AND rental_end_date < NOW()
  LOOP
    property_ids := array_append(property_ids, property_id);
  END LOOP;
  
  -- Update the properties
  UPDATE public.properties
  SET 
    is_rented = false,
    rental_end_date = NULL,
    updated_at = NOW()
  WHERE 
    is_rented = true
    AND rental_end_date IS NOT NULL
    AND rental_end_date < NOW();
  
  updated_count := array_length(property_ids, 1);
  
  -- Return JSON object
  RETURN json_build_object(
    'updated_count', COALESCE(updated_count, 0),
    'property_ids', COALESCE(property_ids, ARRAY[]::UUID[])
  );
END;
$$;

-- Grant execute permission to authenticated users and anon (for API routes)
GRANT EXECUTE ON FUNCTION public.update_expired_rentals() TO authenticated, anon;

-- Create a comment on the function
COMMENT ON FUNCTION public.update_expired_rentals() IS 'Automatically sets is_rented to false and rental_end_date to null for properties where rental_end_date has passed. Returns count of updated properties and their IDs.';

