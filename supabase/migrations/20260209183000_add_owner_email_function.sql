-- Create function to get owner email for a table
CREATE OR REPLACE FUNCTION public.get_table_owner_email(table_owner_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = table_owner_id;
$$;

-- Add owner_email column to table_shares for easier access
ALTER TABLE public.table_shares 
ADD COLUMN IF NOT EXISTS owner_email text;

-- Update existing shares with owner email
UPDATE public.table_shares ts
SET owner_email = u.email
FROM auth.users u
WHERE ts.owner_id = u.id AND ts.owner_email IS NULL;
