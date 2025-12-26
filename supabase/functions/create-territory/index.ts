import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateTerritoryRequest {
  name: string;
  region_id: string;
  capital_name: string;
  government_type: string;
  style: string;
  lore: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[create-territory] Starting territory creation flow');

    // Initialize Supabase client with service role for RPC call
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[create-territory] Missing authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Autenticação necessária. Faça login para continuar.',
          code: 'AUTH_REQUIRED',
          table: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[create-territory] Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Sessão inválida ou expirada. Faça login novamente.',
          code: 'INVALID_SESSION',
          table: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-territory] User authenticated:', user.id);

    // Parse request body
    const body: CreateTerritoryRequest = await req.json();
    const { name, region_id, capital_name, government_type, style, lore } = body;

    // Validate required fields
    if (!name || !region_id || !capital_name || !government_type || !style || !lore) {
      console.error('[create-territory] Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Todos os campos são obrigatórios.',
          code: 'MISSING_FIELDS',
          table: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field lengths
    if (name.trim().length < 3 || name.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome do território deve ter entre 3 e 100 caracteres.',
          code: 'INVALID_NAME',
          table: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (capital_name.trim().length < 3 || capital_name.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome da capital deve ter entre 3 e 100 caracteres.',
          code: 'INVALID_CAPITAL_NAME',
          table: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (lore.trim().length < 50 || lore.trim().length > 2000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lore deve ter entre 50 e 2000 caracteres.',
          code: 'INVALID_LORE',
          table: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-territory] Calling atomic_create_territory RPC');

    // Call the atomic database function - this handles all creation in a single transaction
    const { data: result, error: rpcError } = await supabase.rpc('atomic_create_territory', {
      p_user_id: user.id,
      p_name: name.trim(),
      p_region_id: region_id,
      p_capital_name: capital_name.trim(),
      p_government_type: government_type,
      p_style: style,
      p_lore: lore.trim(),
    });

    if (rpcError) {
      console.error('[create-territory] RPC error:', rpcError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro no banco de dados: ${rpcError.message}`,
          code: rpcError.code || 'RPC_ERROR',
          table: 'atomic_create_territory',
          details: rpcError.details || null,
          hint: rpcError.hint || null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-territory] RPC result:', JSON.stringify(result));

    // Check if the atomic function returned an error
    if (!result?.success) {
      const errorCode = result?.code || 'CREATION_FAILED';
      const errorTable = result?.table || 'unknown';
      const errorMessage = result?.error || 'Erro desconhecido ao criar território.';
      
      console.error('[create-territory] Creation failed:', errorMessage, 'Table:', errorTable, 'Code:', errorCode);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          code: errorCode,
          table: errorTable
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-territory] Territory created successfully:', result.territory_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          territory_id: result.territory_id,
          city_id: result.city_id,
          cell_id: result.cell_id,
        },
        message: result.message || 'Território criado com sucesso!',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-territory] Unexpected error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        code: 'UNEXPECTED_ERROR',
        table: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
