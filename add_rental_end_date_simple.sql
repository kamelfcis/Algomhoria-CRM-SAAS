-- Simplified version of the function that returns JSON
-- Use this if the original function doesn't work

-- Drop and recreate with simpler return type
DROP FUNCTION IF EXISTS public.update_expired_rentals();

CREATE OR REPLACE FUNCTION public.update_expired_rentals()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  property_ids UUID[] := ARRAY[]::UUID[];
  property_record RECORD;
BEGIN
  -- Update properties where rental_end_date has passed and is_rented is true
  FOR property_record IN
    SELECT id
    FROM public.properties
    WHERE 
      is_rented = true
      AND rental_end_date IS NOT NULL
      AND rental_end_date < NOW()
  LOOP
    property_ids := array_append(property_ids, property_record.id);
  END LOOP;
  
  -- Update the properties
  IF array_length(property_ids, 1) > 0 THEN
    UPDATE public.properties
    SET 
      is_rented = false,
      rental_end_date = NULL,
      updated_at = NOW()
    WHERE id = ANY(property_ids);
  END IF;
  
  updated_count := COALESCE(array_length(property_ids, 1), 0);
  
  -- Return JSON object
  RETURN json_build_object(
    'updated_count', updated_count,
    'property_ids', COALESCE(property_ids, ARRAY[]::UUID[])
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_expired_rentals() TO authenticated, anon;

-- Test the function
-- SELECT public.update_expired_rentals();

