-- Create table_shares for managing table sharing
CREATE TABLE public.table_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  shared_with_email text NOT NULL,
  shared_with_user_id uuid,
  permission text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(table_id, shared_with_email)
);

-- Enable RLS on table_shares
ALTER TABLE public.table_shares ENABLE ROW LEVEL SECURITY;

-- Owner can manage their shares
CREATE POLICY "Owners can manage their shares"
ON public.table_shares FOR ALL
USING (auth.uid() = owner_id);

-- Shared users can view shares they received
CREATE POLICY "Shared users can view their shares"
ON public.table_shares FOR SELECT
USING (
  auth.uid() = shared_with_user_id 
  OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Create security definer function to check if user has access to a table
CREATE OR REPLACE FUNCTION public.user_has_table_access(check_table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND (
      shared_with_user_id = auth.uid() 
      OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
$$;

-- Create function to check if user can edit table
CREATE OR REPLACE FUNCTION public.user_can_edit_table(check_table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_tables 
    WHERE id = check_table_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.table_shares
    WHERE table_id = check_table_id 
    AND permission = 'edit'
    AND (
      shared_with_user_id = auth.uid() 
      OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
$$;

-- Drop existing policies on custom_tables
DROP POLICY IF EXISTS "Users can view their own tables" ON public.custom_tables;
DROP POLICY IF EXISTS "Users can create their own tables" ON public.custom_tables;
DROP POLICY IF EXISTS "Users can update their own tables" ON public.custom_tables;
DROP POLICY IF EXISTS "Users can delete their own tables" ON public.custom_tables;

-- New policies for custom_tables (including shared access)
CREATE POLICY "Users can view own and shared tables"
ON public.custom_tables FOR SELECT
USING (public.user_has_table_access(id));

CREATE POLICY "Users can create their own tables"
ON public.custom_tables FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tables"
ON public.custom_tables FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tables"
ON public.custom_tables FOR DELETE
USING (auth.uid() = user_id);

-- Drop existing policies on custom_columns
DROP POLICY IF EXISTS "Users can view columns of their tables" ON public.custom_columns;
DROP POLICY IF EXISTS "Users can create columns in their tables" ON public.custom_columns;
DROP POLICY IF EXISTS "Users can update columns in their tables" ON public.custom_columns;
DROP POLICY IF EXISTS "Users can delete columns from their tables" ON public.custom_columns;

-- New policies for custom_columns (including shared access)
CREATE POLICY "Users can view columns of accessible tables"
ON public.custom_columns FOR SELECT
USING (public.user_has_table_access(table_id));

CREATE POLICY "Users can create columns in own tables"
ON public.custom_columns FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.custom_tables 
  WHERE id = table_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update columns in own tables"
ON public.custom_columns FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.custom_tables 
  WHERE id = table_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete columns from own tables"
ON public.custom_columns FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.custom_tables 
  WHERE id = table_id AND user_id = auth.uid()
));

-- Drop existing policies on custom_data
DROP POLICY IF EXISTS "Users can view their own data" ON public.custom_data;
DROP POLICY IF EXISTS "Users can create their own data" ON public.custom_data;
DROP POLICY IF EXISTS "Users can update their own data" ON public.custom_data;
DROP POLICY IF EXISTS "Users can delete their own data" ON public.custom_data;

-- New policies for custom_data (including shared access)
CREATE POLICY "Users can view data from accessible tables"
ON public.custom_data FOR SELECT
USING (public.user_has_table_access(table_id));

CREATE POLICY "Users can create data in editable tables"
ON public.custom_data FOR INSERT
WITH CHECK (public.user_can_edit_table(table_id) AND auth.uid() = user_id);

CREATE POLICY "Users can update data in editable tables"
ON public.custom_data FOR UPDATE
USING (public.user_can_edit_table(table_id));

CREATE POLICY "Users can delete data in editable tables"
ON public.custom_data FOR DELETE
USING (public.user_can_edit_table(table_id));