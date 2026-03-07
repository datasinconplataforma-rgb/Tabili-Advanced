-- Tabela para configurações de visualização pública
CREATE TABLE public.public_view_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id UUID NOT NULL UNIQUE REFERENCES public.custom_tables(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  public_token TEXT NOT NULL UNIQUE,
  visible_columns TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.public_view_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Table owners can manage their view settings
CREATE POLICY "Table owners can manage view settings"
ON public.public_view_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.custom_tables
    WHERE custom_tables.id = public_view_settings.table_id
    AND custom_tables.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_public_view_settings_updated_at
BEFORE UPDATE ON public.public_view_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();