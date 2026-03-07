
-- Create a function to transfer table ownership atomically
CREATE OR REPLACE FUNCTION public.transfer_table_ownership(
  p_table_id uuid,
  p_new_owner_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  new_owner_id uuid;
  new_owner_email_lower text;
BEGIN
  current_user_id := auth.uid();
  new_owner_email_lower := lower(p_new_owner_email);
  
  -- Verify current user is the owner
  IF NOT EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = p_table_id AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Only the owner can transfer ownership';
  END IF;

  -- Find the new owner's user ID from auth.users
  SELECT id INTO new_owner_id FROM auth.users WHERE email = new_owner_email_lower;
  
  IF new_owner_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email';
  END IF;
  
  IF new_owner_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  -- Remove any existing share for the new owner (they'll become the owner)
  DELETE FROM public.table_shares 
  WHERE table_id = p_table_id 
  AND (shared_with_user_id = new_owner_id OR shared_with_email = new_owner_email_lower);

  -- Transfer ownership
  UPDATE public.custom_tables 
  SET user_id = new_owner_id 
  WHERE id = p_table_id;

  -- Add old owner as viewer
  INSERT INTO public.table_shares (table_id, owner_id, shared_with_user_id, shared_with_email, permission)
  SELECT p_table_id, new_owner_id, current_user_id, u.email, 'view'
  FROM auth.users u WHERE u.id = current_user_id;

  RETURN true;
END;
$$;

-- Update user_can_edit_table to include 'admin' permission
CREATE OR REPLACE FUNCTION public.user_can_edit_table(check_table_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN false; END IF;
  current_user_email := auth.jwt() ->> 'email';
  
  -- Owner can always edit
  IF EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = current_user_id
  ) THEN RETURN true; END IF;
  
  -- Admin or edit permission can edit
  IF EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND permission IN ('edit', 'admin')
    AND (shared_with_user_id = current_user_id OR shared_with_email = current_user_email)
  ) THEN RETURN true; END IF;
  
  RETURN false;
END;
$$;

-- New function: check if user can admin (owner or admin permission)
CREATE OR REPLACE FUNCTION public.user_can_admin_table(check_table_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RETURN false; END IF;
  current_user_email := auth.jwt() ->> 'email';
  
  -- Owner
  IF EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = current_user_id
  ) THEN RETURN true; END IF;
  
  -- Admin permission
  IF EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND permission = 'admin'
    AND (shared_with_user_id = current_user_id OR shared_with_email = current_user_email)
  ) THEN RETURN true; END IF;
  
  RETURN false;
END;
$$;
