-- Add formula_config column to custom_columns table
ALTER TABLE public.custom_columns 
ADD COLUMN IF NOT EXISTS formula_config jsonb DEFAULT NULL;