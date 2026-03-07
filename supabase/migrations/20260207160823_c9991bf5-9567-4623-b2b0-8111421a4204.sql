
-- Create table_projects table
CREATE TABLE public.table_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.table_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own projects" ON public.table_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.table_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.table_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.table_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Add project_id column to custom_tables
ALTER TABLE public.custom_tables
  ADD COLUMN project_id uuid REFERENCES public.table_projects(id)
  ON DELETE SET NULL;
