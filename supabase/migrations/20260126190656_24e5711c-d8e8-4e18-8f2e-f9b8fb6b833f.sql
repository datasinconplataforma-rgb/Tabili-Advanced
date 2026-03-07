-- Recreate user_has_table_access function without querying auth.users directly
-- Using CREATE OR REPLACE to avoid dependency issues
CREATE OR REPLACE FUNCTION public.user_has_table_access(check_table_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current user email using auth.jwt()
  current_user_email := auth.jwt() ->> 'email';
  
  -- Check if user owns the table
  IF EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = current_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if table is shared with user
  IF EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND (
      shared_with_user_id = current_user_id 
      OR shared_with_email = current_user_email
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Recreate user_can_edit_table function without querying auth.users directly
CREATE OR REPLACE FUNCTION public.user_can_edit_table(check_table_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current user email using auth.jwt()
  current_user_email := auth.jwt() ->> 'email';
  
  -- Check if user owns the table (owners can always edit)
  IF EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = current_user_id
  ) THEN
    RETURN true;
  END IF;
  
  -- Check if table is shared with edit permission
  IF EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND permission = 'edit'
    AND (
      shared_with_user_id = current_user_id 
      OR shared_with_email = current_user_email
    )
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;