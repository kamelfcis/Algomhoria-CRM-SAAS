-- =====================================================
-- Create User Function (SECURITY DEFINER)
-- =====================================================
-- This function creates a user in both auth.users and public.users
-- It bypasses RLS using SECURITY DEFINER

-- Step 1: Create function to insert user into public.users
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.create_user_record(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  phone_number TEXT,
  status TEXT,
  author_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
BEGIN
  -- Insert into users table
  INSERT INTO public.users (
    id,
    email,
    password_hash,
    name,
    phone_number,
    status
  ) VALUES (
    p_user_id,
    p_email,
    '', -- Password is handled by Supabase Auth
    p_name,
    p_phone_number,
    p_status
  )
  RETURNING * INTO v_user_record;
  
  -- Return the created user
  RETURN QUERY SELECT 
    v_user_record.id,
    v_user_record.email,
    v_user_record.name,
    v_user_record.phone_number,
    v_user_record.status,
    v_user_record.author_image_url,
    v_user_record.created_at,
    v_user_record.updated_at;
    
EXCEPTION WHEN OTHERS THEN
  -- Re-raise the error with context
  RAISE EXCEPTION 'Error creating user record: % - %', SQLSTATE, SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_record(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_record(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Step 2: Create a trigger function to auto-create user record (optional)
-- This will automatically create a user in public.users when created in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into users table using the create_user_record function
  PERFORM public.create_user_record(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NEW.raw_user_meta_data->>'phone_number',
    'active'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth user creation
  RAISE WARNING 'Failed to create user record: % - %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$;

-- Step 3: Create trigger (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Verify the functions exist
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('create_user_record', 'handle_new_user');


