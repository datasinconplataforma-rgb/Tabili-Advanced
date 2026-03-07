import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FilterConfig {
  column: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
  value: string;
}

interface MultiFilterConfig {
  filters: FilterConfig[];
  logic: 'AND' | 'OR';
}

function applyFilter(data: Record<string, unknown>, filter: FilterConfig): boolean {
  const cellValue = String(data[filter.column] || '').toLowerCase();
  const filterValue = filter.value.toLowerCase();

  switch (filter.operator) {
    case 'equals':
      return cellValue === filterValue;
    case 'contains':
      return cellValue.includes(filterValue);
    case 'starts_with':
      return cellValue.startsWith(filterValue);
    case 'ends_with':
      return cellValue.endsWith(filterValue);
    case 'greater_than':
      return parseFloat(cellValue) > parseFloat(filterValue);
    case 'less_than':
      return parseFloat(cellValue) < parseFloat(filterValue);
    default:
      return true;
  }
}

function applyMultipleFilters(data: Record<string, unknown>, config: MultiFilterConfig): boolean {
  if (!config.filters || config.filters.length === 0) return true;
  
  if (config.logic === 'OR') {
    return config.filters.some(filter => applyFilter(data, filter));
  }
  return config.filters.every(filter => applyFilter(data, filter));
}

function parseFilterConfig(json: unknown): MultiFilterConfig | null {
  if (!json || typeof json !== 'object') return null;
  const obj = json as Record<string, unknown>;
  
  if (Array.isArray(obj.filters)) {
    const filters = (obj.filters as unknown[]).filter((f): f is FilterConfig => {
      if (!f || typeof f !== 'object') return false;
      const filter = f as Record<string, unknown>;
      return typeof filter.column === 'string' && 
             typeof filter.operator === 'string' && 
             typeof filter.value === 'string';
    });
    if (filters.length > 0) {
      return { filters, logic: (obj.logic === 'OR' ? 'OR' : 'AND') };
    }
    return null;
  }
  
  if (
    typeof obj.column === 'string' &&
    typeof obj.operator === 'string' &&
    typeof obj.value === 'string'
  ) {
    return {
      filters: [{ column: obj.column, operator: obj.operator as FilterConfig['operator'], value: obj.value }],
      logic: 'AND',
    };
  }
  
  return null;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

const RATE_LIMIT_MAX_REQUESTS = 200;
const RATE_LIMIT_WINDOW_MINUTES = 60;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, pin } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const ipHash = hashString(clientIP);
    
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip_hash: ipHash,
      p_endpoint: 'get-public-view',
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    } else if (!rateLimitCheck) {
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: incrementError } = await supabase.rpc('increment_rate_limit', {
      p_ip_hash: ipHash,
      p_endpoint: 'get-public-view'
    });

    if (incrementError) {
      console.error('Rate limit increment error:', incrementError);
    }

    // Get public view settings by token
    const { data: settings, error: settingsError } = await supabase
      .from('public_view_settings')
      .select('*')
      .eq('public_token', token)
      .eq('is_enabled', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar configurações' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Visualização não encontrada ou desabilitada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check PIN if configured
    if (settings.access_pin) {
      if (!pin) {
        return new Response(
          JSON.stringify({ error: 'pin_required', requires_pin: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (pin !== settings.access_pin) {
        return new Response(
          JSON.stringify({ error: 'PIN incorreto', requires_pin: true }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get table info
    const { data: table, error: tableError } = await supabase
      .from('custom_tables')
      .select('id, name, user_id')
      .eq('id', settings.table_id)
      .single();

    if (tableError || !table) {
      return new Response(
        JSON.stringify({ error: 'Tabela não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get columns
    const { data: allColumns, error: columnsError } = await supabase
      .from('custom_columns')
      .select('id, name, display_name, column_type, column_order, formula_config')
      .eq('table_id', settings.table_id)
      .order('column_order');

    if (columnsError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar colunas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const visibleColumnNames = settings.visible_columns || [];
    const columns = allColumns?.filter(col => visibleColumnNames.includes(col.name)) || [];

    // Get table data
    const { data: allData, error: dataError } = await supabase
      .from('custom_data')
      .select('id, data')
      .eq('table_id', settings.table_id)
      .order('created_at', { ascending: false });

    if (dataError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const filterConfig = parseFilterConfig(settings.filter_config);
    let filteredData = allData || [];

    if (filterConfig && filterConfig.filters.length > 0) {
      filteredData = filteredData.filter(row => {
        if (!row.data || typeof row.data !== 'object') return false;
        return applyMultipleFilters(row.data as Record<string, unknown>, filterConfig);
      });
    }

    const resultData = filteredData.map(row => {
      const filteredRowData: Record<string, string> = {};
      for (const colName of visibleColumnNames) {
        if (row.data && typeof row.data === 'object' && colName in (row.data as Record<string, unknown>)) {
          filteredRowData[colName] = String((row.data as Record<string, unknown>)[colName] || '');
        }
      }
      return { id: row.id, data: filteredRowData };
    });

    // Log access
    await supabase.from('activity_logs').insert({
      user_id: table.user_id,
      table_id: settings.table_id,
      table_name: table.name,
      action: 'public_view_access',
      user_email: 'anonymous',
      details: `Acesso à visualização pública via token`,
    });

    return new Response(
      JSON.stringify({ table_name: table.name, columns, data: resultData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
