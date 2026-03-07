import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching form for token: ${token}`);

    // Get external collection settings by token
    const { data: settings, error: settingsError } = await supabase
      .from('external_collection_settings')
      .select('*')
      .eq('public_token', token)
      .eq('is_enabled', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings) {
      console.log('No settings found for token');
      return new Response(
        JSON.stringify({ error: 'Formulário não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get table information
    const { data: table, error: tableError } = await supabase
      .from('custom_tables')
      .select('id, name')
      .eq('id', settings.table_id)
      .single();

    if (tableError || !table) {
      console.error('Error fetching table:', tableError);
      return new Response(
        JSON.stringify({ error: 'Tabela não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get columns for the table (excluding formula columns for public form)
    const { data: columns, error: columnsError } = await supabase
      .from('custom_columns')
      .select('id, name, display_name, column_type, column_order, formula_config')
      .eq('table_id', settings.table_id)
      .neq('column_type', 'formula')
      .order('column_order', { ascending: true });

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      throw columnsError;
    }

    console.log(`Found ${columns?.length || 0} columns for table ${table.name}`);

    // Transform columns to include list_config from formula_config
    const transformedColumns = (columns || []).map(col => ({
      id: col.id,
      name: col.name,
      display_name: col.display_name,
      column_type: col.column_type,
      column_order: col.column_order,
      list_config: col.column_type === 'list' && col.formula_config?.items 
        ? { items: col.formula_config.items }
        : undefined,
    }));

    return new Response(
      JSON.stringify({
        table_id: table.id,
        table_name: table.name,
        columns: transformedColumns,
        settings: {
          allow_multiple_submissions: settings.allow_multiple_submissions,
          respondent_field_label: settings.respondent_field_label,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-public-form:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
