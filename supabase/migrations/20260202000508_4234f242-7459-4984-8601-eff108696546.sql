-- Create table for external collection settings
CREATE TABLE public.external_collection_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  public_token TEXT NOT NULL UNIQUE,
  allow_multiple_submissions BOOLEAN NOT NULL DEFAULT true,
  respondent_field_label TEXT NOT NULL DEFAULT 'Email',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(table_id)
);

-- Create table for tracking external submissions
CREATE TABLE public.external_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  respondent_identifier TEXT NOT NULL,
  ip_hash TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.external_collection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_collection_settings
-- Only table owners can manage settings
CREATE POLICY "Table owners can view their collection settings"
ON public.external_collection_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = external_collection_settings.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

CREATE POLICY "Table owners can create collection settings"
ON public.external_collection_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = external_collection_settings.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

CREATE POLICY "Table owners can update collection settings"
ON public.external_collection_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = external_collection_settings.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

CREATE POLICY "Table owners can delete collection settings"
ON public.external_collection_settings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = external_collection_settings.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

-- RLS Policies for external_submissions
-- Table owners can view all submissions
CREATE POLICY "Table owners can view submissions"
ON public.external_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = external_submissions.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

-- Public submissions will be handled by edge function with service role
-- No direct INSERT policy for public users

-- Create trigger for updated_at
CREATE TRIGGER update_external_collection_settings_updated_at
BEFORE UPDATE ON public.external_collection_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();