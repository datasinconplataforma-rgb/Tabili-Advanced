-- Table to store custom table definitions
CREATE TABLE public.custom_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store column definitions for each custom table
CREATE TABLE public.custom_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  column_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store actual data rows for custom tables
CREATE TABLE public.custom_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_data ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_tables
CREATE POLICY "Users can view their own tables" ON public.custom_tables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tables" ON public.custom_tables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tables" ON public.custom_tables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tables" ON public.custom_tables FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for custom_columns (via table ownership)
CREATE POLICY "Users can view columns of their tables" ON public.custom_columns FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.custom_tables WHERE id = table_id AND user_id = auth.uid()));
CREATE POLICY "Users can create columns in their tables" ON public.custom_columns FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.custom_tables WHERE id = table_id AND user_id = auth.uid()));
CREATE POLICY "Users can update columns in their tables" ON public.custom_columns FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.custom_tables WHERE id = table_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete columns from their tables" ON public.custom_columns FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.custom_tables WHERE id = table_id AND user_id = auth.uid()));

-- RLS policies for custom_data
CREATE POLICY "Users can view their own data" ON public.custom_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own data" ON public.custom_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own data" ON public.custom_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own data" ON public.custom_data FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on custom_data
CREATE TRIGGER update_custom_data_updated_at
  BEFORE UPDATE ON public.custom_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();