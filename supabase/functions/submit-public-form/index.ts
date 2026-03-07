import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple hash function for IP (for privacy)
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window
const RATE_LIMIT_WINDOW_MINUTES = 60; // 1 hour window

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, respondent_identifier, data } = await req.json();

    // Validate input
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!respondent_identifier || typeof respondent_identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Identificador do respondente é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanRespondent = respondent_identifier.trim().toLowerCase();
    if (cleanRespondent.length === 0 || cleanRespondent.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Identificador do respondente inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data || typeof data !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Dados são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Processing submission for token: ${token}, respondent: ${cleanRespondent}`);

    // Rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const ipHash = hashString(clientIP);
    
    // Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_ip_hash: ipHash,
      p_endpoint: 'submit-public-form',
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
      // Continue anyway to not block legitimate requests due to rate limit errors
    } else if (!rateLimitCheck) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment rate limit counter
    const { error: incrementError } = await supabase.rpc('increment_rate_limit', {
      p_ip_hash: ipHash,
      p_endpoint: 'submit-public-form'
    });

    if (incrementError) {
      console.error('Rate limit increment error:', incrementError);
      // Continue anyway
    }

    // Get external collection settings by token
    const { data: settings, error: settingsError } = await supabase
      .from('external_collection_settings')
      .select('*, custom_tables(id, name, user_id)')
      .eq('public_token', token)
      .eq('is_enabled', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    if (!settings) {
      return new Response(
        JSON.stringify({ error: 'Formulário não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const table = settings.custom_tables as { id: string; name: string; user_id: string };

    // Check for previous submission if multiple submissions are not allowed
    if (!settings.allow_multiple_submissions) {
      const { data: existingSubmission } = await supabase
        .from('external_submissions')
        .select('id')
        .eq('table_id', settings.table_id)
        .eq('respondent_identifier', cleanRespondent)
        .maybeSingle();

      if (existingSubmission) {
        console.log(`Duplicate submission attempt by: ${cleanRespondent}`);
        return new Response(
          JSON.stringify({ error: 'already_submitted' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get IP hash for tracking
    const ipHashForTracking = hashString(clientIP);

    // Get columns to validate data
    const { data: columns, error: columnsError } = await supabase
      .from('custom_columns')
      .select('name, column_type')
      .eq('table_id', settings.table_id);

    if (columnsError) {
      console.error('Error fetching columns:', columnsError);
      throw columnsError;
    }

    // Sanitize and validate data - only include valid columns
    const validColumnNames = new Set(columns?.map(c => c.name) || []);
    const sanitizedData: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (validColumnNames.has(key)) {
        // Sanitize string values
        if (typeof value === 'string') {
          sanitizedData[key] = value.substring(0, 1000); // Max 1000 chars per field
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          sanitizedData[key] = value;
        }
      }
    }

    // Add respondent identifier to the data
    sanitizedData['_respondent'] = cleanRespondent;
    sanitizedData['_submitted_at'] = new Date().toISOString();

    // Insert data into custom_data table
    const { error: insertError } = await supabase
      .from('custom_data')
      .insert({
        table_id: settings.table_id,
        user_id: table.user_id, // Use the table owner's ID
        data: sanitizedData,
      });

    if (insertError) {
      console.error('Error inserting data:', insertError);
      throw insertError;
    }

    // Record submission
    const { error: submissionError } = await supabase
      .from('external_submissions')
      .insert({
        table_id: settings.table_id,
        respondent_identifier: cleanRespondent,
        ip_hash: ipHashForTracking,
      });

    if (submissionError) {
      console.error('Error recording submission:', submissionError);
      // Don't fail the request, data was already saved
    }

    // Log activity
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: table.user_id,
        table_id: settings.table_id,
        table_name: table.name,
        action: 'external_submission',
        user_email: cleanRespondent,
        details: `Submissão externa via formulário público`,
      });

    if (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the request
    }

    console.log(`Submission successful for: ${cleanRespondent}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in submit-public-form:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});