-- Add filter configuration to public_view_settings
ALTER TABLE public_view_settings 
ADD COLUMN filter_config JSONB DEFAULT NULL;

-- filter_config structure: { column: string, operator: string, value: string }
-- operators: 'equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than'

COMMENT ON COLUMN public_view_settings.filter_config IS 'Filter configuration: { column: string, operator: string, value: string }';