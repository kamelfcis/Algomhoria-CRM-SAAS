-- ============================================================================
-- Fix Newsletter Subscribers Update Policy
-- ============================================================================
-- Problem: Current policy only allows users to update their own subscription
-- Solution: Allow admins and moderators to update any subscriber
-- ============================================================================

-- Step 1: Create a security definer function to check if user is admin or moderator
-- This function bypasses RLS to avoid any potential recursion issues
CREATE OR REPLACE FUNCTION public.is_admin_or_moderator(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = user_id 
    AND role IN ('admin', 'moderator')
  );
END;
$$;

-- Step 2: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(UUID) TO anon;

-- Step 3: Drop the existing update policy
DROP POLICY IF EXISTS "newsletter_subscribers_update_own" ON newsletter_subscribers;

-- Step 4: Create a new update policy that allows admins and moderators to update any subscriber
-- This policy allows authenticated users with admin or moderator role to update any newsletter subscriber
CREATE POLICY "newsletter_subscribers_update_moderator" ON newsletter_subscribers FOR UPDATE
TO authenticated
USING (public.is_admin_or_moderator(auth.uid()))
WITH CHECK (public.is_admin_or_moderator(auth.uid()));

-- Step 5: Optional - Keep a policy for users to update their own subscription (if needed for self-service)
-- This allows users to update their own subscription by email match
-- Note: This policy will work alongside the moderator policy (PostgreSQL uses OR logic for multiple policies)
CREATE POLICY "newsletter_subscribers_update_own" ON newsletter_subscribers FOR UPDATE
TO authenticated, anon
USING (
  email = COALESCE(auth.jwt() ->> 'email', '')
)
WITH CHECK (
  email = COALESCE(auth.jwt() ->> 'email', '')
);

