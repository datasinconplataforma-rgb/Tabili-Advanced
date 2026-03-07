-- Create cash flow entries table
CREATE TABLE public.cash_flow_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    data date NOT NULL DEFAULT CURRENT_DATE,
    operacao text NOT NULL DEFAULT 'Entrada',
    grupo text,
    subgrupo text,
    cliente text,
    valor decimal(15,2) NOT NULL DEFAULT 0,
    nota text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own cash flow entries"
ON public.cash_flow_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cash flow entries"
ON public.cash_flow_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flow entries"
ON public.cash_flow_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flow entries"
ON public.cash_flow_entries FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_cash_flow_entries_updated_at
BEFORE UPDATE ON public.cash_flow_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();