-- Create activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  table_id uuid REFERENCES public.custom_tables(id) ON DELETE SET NULL,
  table_name text NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for tables they own or have access to
CREATE POLICY "Users can view relevant logs"
ON public.activity_logs
FOR SELECT
USING (
  user_id = auth.uid() 
  OR (table_id IS NOT NULL AND user_has_table_access(table_id))
);

-- Users can create their own logs
CREATE POLICY "Users can create logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_table_id ON public.activity_logs(table_id);