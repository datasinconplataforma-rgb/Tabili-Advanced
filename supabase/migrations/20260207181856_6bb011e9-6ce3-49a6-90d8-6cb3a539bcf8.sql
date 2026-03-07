
-- Drop the old SELECT policy on table_projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.table_projects;

-- Recreate with shared access: users can see projects that contain tables shared with them
CREATE POLICY "Users can view accessible projects"
ON public.table_projects
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.custom_tables ct
    JOIN public.table_shares ts ON ts.table_id = ct.id
    WHERE ct.project_id = table_projects.id
    AND (
      ts.shared_with_user_id = auth.uid()
      OR ts.shared_with_email = (auth.jwt() ->> 'email')
    )
  )
);
