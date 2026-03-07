-- Drop and recreate the SELECT policy for custom_tables
-- The current policy uses user_has_table_access which can cause issues
DROP POLICY IF EXISTS "Users can view own and shared tables" ON public.custom_tables;

-- Create a new policy that checks ownership directly first
-- This avoids calling the function for the owner's own tables
CREATE POLICY "Users can view own and shared tables" ON public.custom_tables
FOR SELECT USING (
  user_id = auth.uid() 
  OR user_has_table_access(id)
);

-- Also update table_shares SELECT policy to not query auth.users
DROP POLICY IF EXISTS "Shared users can view their shares" ON public.table_shares;

CREATE POLICY "Shared users can view their shares" ON public.table_shares
FOR SELECT USING (
  auth.uid() = shared_with_user_id 
  OR shared_with_email = (auth.jwt() ->> 'email')
);