-- Add column_type field to custom_columns table
ALTER TABLE public.custom_columns 
ADD COLUMN column_type text NOT NULL DEFAULT 'text';

-- Add comment explaining the column types
COMMENT ON COLUMN public.custom_columns.column_type IS 'Column data type: text, number, date, boolean, email, url';