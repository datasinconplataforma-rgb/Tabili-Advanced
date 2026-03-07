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
    const { token, respondent_identifier } = await req.json();

    if (!token || !respondent_identifier) {
      return new Response(
        JSON.stringify({ error: 'Token e identificador são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking submission for token: ${token}, respondent: ${respondent_identifier}`);

    // Get external collection settings by token
    const { data: settings, error: settingsError } = await supabase
      .from('external_collection_settings')
      .select('table_id, allow_multiple_submissions')
      .eq('public_token', token)
      .eq('is_enabled', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Formulário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If multiple submissions are allowed, no need to check
    if (settings.allow_multiple_submissions) {
      return new Response(
        JSON.stringify({ has_submitted: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for previous submission
    const { data: existingSubmission, error: submissionError } = await supabase
      .from('external_submissions')
      .select('id')
      .eq('table_id', settings.table_id)
      .eq('respondent_identifier', respondent_identifier.toLowerCase().trim())
      .maybeSingle();

    if (submissionError) {
      console.error('Error checking submission:', submissionError);
      throw submissionError;
    }

    console.log(`Submission check result: ${existingSubmission ? 'already submitted' : 'not submitted'}`);

    return new Response(
      JSON.stringify({ has_submitted: !!existingSubmission }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-submission:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
