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

    // Initialize Supabase client
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
          code: 'AUTH_REQUIRED'
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
          code: 'INVALID_SESSION'
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
          code: 'MISSING_FIELDS'
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
          code: 'INVALID_NAME'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (capital_name.trim().length < 3 || capital_name.trim().length > 100) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nome da capital deve ter entre 3 e 100 caracteres.',
          code: 'INVALID_CAPITAL_NAME'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (lore.trim().length < 50 || lore.trim().length > 2000) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lore deve ter entre 50 e 2000 caracteres.',
          code: 'INVALID_LORE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a territory
    const { data: existingTerritory, error: checkError } = await supabase
      .from('territories')
      .select('id, name')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('[create-territory] Error checking existing territory:', checkError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao verificar territórios existentes.',
          code: 'CHECK_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTerritory) {
      console.log('[create-territory] User already has territory:', existingTerritory.name);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Você já possui o território "${existingTerritory.name}". Cada usuário pode ter apenas um território.`,
          code: 'TERRITORY_EXISTS'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify region exists and is visible
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('id, name, is_visible')
      .eq('id', region_id)
      .single();

    if (regionError || !region) {
      console.error('[create-territory] Region not found:', regionError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Região selecionada não encontrada.',
          code: 'REGION_NOT_FOUND'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!region.is_visible) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Esta região ainda não foi revelada para colonização.',
          code: 'REGION_NOT_VISIBLE'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-territory] Creating territory in region:', region.name);

    // Find an available urban-eligible cell in the region
    const { data: availableCell, error: cellSearchError } = await supabase
      .from('cells')
      .select('id')
      .eq('region_id', region_id)
      .eq('status', 'explored')
      .eq('is_urban_eligible', true)
      .is('owner_territory_id', null)
      .is('city_id', null)
      .limit(1)
      .maybeSingle();

    if (cellSearchError) {
      console.error('[create-territory] Error searching for cells:', cellSearchError.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar células disponíveis na região.',
          code: 'CELL_SEARCH_ERROR'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no urban-eligible cell, try any explored cell
    let cellId = availableCell?.id;
    if (!cellId) {
      const { data: anyCell, error: anyCellError } = await supabase
        .from('cells')
        .select('id')
        .eq('region_id', region_id)
        .eq('status', 'explored')
        .is('owner_territory_id', null)
        .limit(1)
        .maybeSingle();

      if (anyCellError) {
        console.error('[create-territory] Error searching for any cell:', anyCellError.message);
      }

      cellId = anyCell?.id;
    }

    // If still no cell, create one for this region
    if (!cellId) {
      console.log('[create-territory] No available cell, creating new one');
      const { data: newCell, error: createCellError } = await supabase
        .from('cells')
        .insert({
          region_id: region_id,
          status: 'explored',
          is_urban_eligible: true,
          cell_type: 'rural',
          area_km2: 7500,
          colonization_cost: 0,
          explored_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (createCellError) {
        console.error('[create-territory] Error creating cell:', createCellError.message);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Não há células disponíveis nesta região. Tente outra região.',
            code: 'NO_CELLS_AVAILABLE'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      cellId = newCell.id;
    }

    console.log('[create-territory] Using cell:', cellId);

    // === ATOMIC CREATION FLOW ===
    // Create all entities in sequence with rollback on failure

    let createdCityId: string | null = null;
    let createdTerritoryId: string | null = null;

    try {
      // Step 1: Create the capital city
      console.log('[create-territory] Step 1: Creating capital city');
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .insert({
          name: capital_name.trim(),
          cell_id: cellId,
          region_id: region_id,
          status: 'occupied',
          is_neutral: false,
          population: 1000,
          urban_population: 1000,
        })
        .select('id')
        .single();

      if (cityError) {
        console.error('[create-territory] City creation failed:', cityError.message);
        throw new Error(`Erro ao criar capital: ${cityError.message}`);
      }

      createdCityId = cityData.id;
      console.log('[create-territory] Capital city created:', createdCityId);

      // Step 2: Create the territory
      console.log('[create-territory] Step 2: Creating territory');
      const { data: territoryData, error: territoryError } = await supabase
        .from('territories')
        .insert({
          name: name.trim(),
          owner_id: user.id,
          capital_city_id: createdCityId,
          region_id: region_id,
          government_type: government_type,
          style: style,
          lore: lore.trim(),
          accepted_statute: true,
          status: 'pending',
          level: 'colony',
          stability: 50,
          economy_rating: 50,
          treasury: 0,
          total_urban_population: 1000,
          total_rural_population: 0,
        })
        .select('id')
        .single();

      if (territoryError) {
        console.error('[create-territory] Territory creation failed:', territoryError.message);
        throw new Error(`Erro ao criar território: ${territoryError.message}`);
      }

      createdTerritoryId = territoryData.id;
      console.log('[create-territory] Territory created:', createdTerritoryId);

      // Step 3: Update the cell to be colonized and owned by the territory
      console.log('[create-territory] Step 3: Updating cell ownership');
      const { error: cellUpdateError } = await supabase
        .from('cells')
        .update({
          status: 'colonized',
          owner_territory_id: createdTerritoryId,
          colonized_by: user.id,
          colonized_at: new Date().toISOString(),
          has_city: true,
          city_id: createdCityId,
          cell_type: 'urban',
          urban_population: 1000,
        })
        .eq('id', cellId);

      if (cellUpdateError) {
        console.error('[create-territory] Cell update failed:', cellUpdateError.message);
        throw new Error(`Erro ao configurar célula: ${cellUpdateError.message}`);
      }

      // Step 4: Update city to be owned by territory
      console.log('[create-territory] Step 4: Linking city to territory');
      const { error: cityUpdateError } = await supabase
        .from('cities')
        .update({
          owner_territory_id: createdTerritoryId,
        })
        .eq('id', createdCityId);

      if (cityUpdateError) {
        console.error('[create-territory] City-territory link failed:', cityUpdateError.message);
        throw new Error(`Erro ao vincular cidade ao território: ${cityUpdateError.message}`);
      }

      // Step 5: Create resource balance for the territory
      console.log('[create-territory] Step 5: Creating resource balance');
      const { error: resourceError } = await supabase
        .from('resource_balances')
        .insert({
          territory_id: createdTerritoryId,
          food: 100,
          energy: 100,
          minerals: 50,
          tech: 10,
        });

      if (resourceError) {
        console.error('[create-territory] Resource balance creation failed:', resourceError.message);
        // Non-critical, log but don't fail
      }

      // Step 6: Log the event
      console.log('[create-territory] Step 6: Logging event');
      await supabase.from('event_logs').insert({
        event_type: 'territory_created',
        territory_id: createdTerritoryId,
        title: `Território "${name.trim()}" criado`,
        description: `Um novo território foi fundado na região ${region.name} com a capital ${capital_name.trim()}.`,
        effects: {
          capital_name: capital_name.trim(),
          region_name: region.name,
          government_type,
          style,
        },
      });

      console.log('[create-territory] Territory creation completed successfully');

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            territory_id: createdTerritoryId,
            city_id: createdCityId,
            cell_id: cellId,
          },
          message: 'Território criado com sucesso! Aguarde a análise do Administrador Planetário.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (innerError) {
      // Rollback: Clean up any created entities
      console.error('[create-territory] Error during creation, initiating rollback');

      if (createdTerritoryId) {
        console.log('[create-territory] Rolling back territory:', createdTerritoryId);
        await supabase.from('territories').delete().eq('id', createdTerritoryId);
        await supabase.from('resource_balances').delete().eq('territory_id', createdTerritoryId);
      }

      if (createdCityId) {
        console.log('[create-territory] Rolling back city:', createdCityId);
        await supabase.from('cities').delete().eq('id', createdCityId);
      }

      // Reset cell if it was updated
      if (cellId) {
        console.log('[create-territory] Resetting cell:', cellId);
        await supabase.from('cells').update({
          status: 'explored',
          owner_territory_id: null,
          colonized_by: null,
          colonized_at: null,
          has_city: false,
          city_id: null,
          cell_type: 'rural',
          urban_population: 0,
        }).eq('id', cellId);
      }

      throw innerError;
    }

  } catch (error) {
    console.error('[create-territory] Unexpected error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        code: 'UNEXPECTED_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
