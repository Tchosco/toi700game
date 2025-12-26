import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoundCityRequest {
  cell_id: string;
  territory_id: string;
  city_name: string;
  profile_id?: string; // City profile ID (optional, will use default if not provided)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body: FoundCityRequest = await req.json();
    const { cell_id, territory_id, city_name, profile_id } = body;

    console.log(`User ${user.id} attempting to found city "${city_name}" on cell ${cell_id}`);

    // Validate input
    if (!cell_id || !territory_id || !city_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'cell_id, territory_id e city_name são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (city_name.trim().length < 2 || city_name.trim().length > 50) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nome da cidade deve ter entre 2 e 50 caracteres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Check if territory belongs to user
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territory_id)
      .eq('owner_id', user.id)
      .single();

    if (territoryError || !territory) {
      return new Response(
        JSON.stringify({ success: false, error: 'Território não encontrado ou não pertence a você' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 2. Check if cell is colonized and urban-eligible
    const { data: cell, error: cellError } = await supabase
      .from('cells')
      .select('*, regions(*)')
      .eq('id', cell_id)
      .single();

    if (cellError || !cell) {
      return new Response(
        JSON.stringify({ success: false, error: 'Célula não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (cell.status !== 'colonized') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula precisa ser colonizada primeiro' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (cell.owner_territory_id !== territory_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula não pertence ao seu território' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    if (!cell.is_urban_eligible) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula não é elegível para urbanização (apenas rural)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (cell.has_city) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula já possui uma cidade' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Check user has token_city
    const { data: userTokens, error: tokensError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokensError || !userTokens || userTokens.city_tokens < 1) {
      return new Response(
        JSON.stringify({ success: false, error: 'Você não possui tokens de cidade suficientes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Get default city profile if not provided
    let cityProfileId = profile_id;
    if (!cityProfileId) {
      const { data: defaultProfile } = await supabase
        .from('city_profiles')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      cityProfileId = defaultProfile?.id;
    }

    // 5. Deduct token
    const { error: deductError } = await supabase
      .from('user_tokens')
      .update({ 
        city_tokens: userTokens.city_tokens - 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (deductError) {
      console.error('Error deducting token:', deductError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao deduzir token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Log token transaction
    await supabase.from('token_transactions').insert({
      user_id: user.id,
      token_type: 'city',
      amount: -1,
      reason: `Fundação da cidade "${city_name.trim()}"`,
    });

    // 6. Create the city
    const { data: newCity, error: cityError } = await supabase
      .from('cities')
      .insert({
        name: city_name.trim(),
        cell_id: cell_id,
        owner_territory_id: territory_id,
        region_id: cell.region_id,
        profile_id: cityProfileId,
        population: 1000,
        status: 'free',
        is_neutral: false,
      })
      .select()
      .single();

    if (cityError) {
      console.error('Error creating city:', cityError);
      // Refund the token
      await supabase
        .from('user_tokens')
        .update({ city_tokens: userTokens.city_tokens })
        .eq('user_id', user.id);
      
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar cidade' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 7. Update cell to mark it has a city
    const { error: updateCellError } = await supabase
      .from('cells')
      .update({
        has_city: true,
        city_id: newCity.id,
        cell_type: 'urban',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cell_id);

    if (updateCellError) {
      console.error('Error updating cell:', updateCellError);
    }

    // 8. If this is the first city, set it as capital
    const { data: existingCities } = await supabase
      .from('cities')
      .select('id')
      .eq('owner_territory_id', territory_id);

    if (!existingCities || existingCities.length === 1) {
      await supabase
        .from('territories')
        .update({ 
          capital_city_id: newCity.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', territory_id);
    }

    // 9. Create resource balance for territory if not exists
    const { data: existingBalance } = await supabase
      .from('resource_balances')
      .select('id')
      .eq('territory_id', territory_id)
      .single();

    if (!existingBalance) {
      await supabase.from('resource_balances').insert({
        territory_id: territory_id,
        food: 100,
        energy: 100,
        minerals: 50,
        tech: 10,
      });
    }

    // 10. Log the event
    await supabase.from('event_logs').insert({
      territory_id: territory_id,
      event_type: 'city_founded',
      title: 'Nova Cidade Fundada',
      description: `${territory.name} fundou a cidade de ${city_name.trim()} na região ${(cell.regions as { name: string })?.name || 'desconhecida'}.`,
      effects: { city_id: newCity.id, cell_id, city_name: city_name.trim() },
    });

    console.log(`City "${city_name}" successfully founded on cell ${cell_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cidade "${city_name.trim()}" fundada com sucesso!`,
        city: newCity
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Found city error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
