import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado', code: 'AUTH_REQUIRED' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sessão inválida', code: 'INVALID_SESSION' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Se já existe território, retorne direto
    const { data: existing } = await supabase
      .from('territories')
      .select('id, name')
      .eq('owner_id', user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { territory_id: existing[0].id },
          message: 'Você já possui um Estado.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Variáveis para rollback lógico
    let territoryId: string | null = null;
    let cellId: string | null = null;
    let cityId: string | null = null;
    let warehouseId: string | null = null;
    let eventId: string | null = null;

    // 1) Criar território (absolute_monarchy via admin_style + government_type=monarchy)
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Jogador';
    const territoryName = `Estado de ${username}`;
    const now = new Date().toISOString();

    const { data: territoryInsert, error: terrErr } = await supabase
      .from('territories')
      .insert({
        name: territoryName,
        owner_id: user.id,
        government_type: 'monarchy',
        admin_style: 'absolute_monarchy',
        status: 'active',
        level: 'colony',
        is_neutral: false,
        stability: 50,
        treasury: 1000,
        total_rural_population: 0,
        total_urban_population: 0,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .limit(1);

    if (terrErr || !territoryInsert || territoryInsert.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: terrErr?.message || 'Falha ao criar território' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    territoryId = territoryInsert[0].id;

    // 2) Escolher célula livre top 40% por habitability
    const { count: freeCount } = await supabase
      .from('cells')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'explored')
      .is('owner_territory_id', null);

    const topFraction = Math.max(1, Math.floor((freeCount || 1) * 0.4));
    const { data: topCells, error: cellsErr } = await supabase
      .from('cells')
      .select('id, region_id, habitability, rural_population, urban_population')
      .eq('status', 'explored')
      .is('owner_territory_id', null)
      .order('habitability', { ascending: false })
      .limit(topFraction);

    if (cellsErr || !topCells || topCells.length === 0) {
      // rollback território
      await supabase.from('territories').delete().eq('id', territoryId!);
      territoryId = null;
      return new Response(
        JSON.stringify({ success: false, error: cellsErr?.message || 'Nenhuma célula elegível encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Seleção pseudo-aleatória dentro do topo
    const pickIndex = Math.floor(Math.random() * topCells.length);
    const chosen = topCells[pickIndex];
    cellId = chosen.id;

    // 3) Marcar célula como colonizada pelo novo Estado
    const { error: updCellErr } = await supabase
      .from('cells')
      .update({
        status: 'colonized',
        owner_territory_id: territoryId,
        colonized_by: user.id,
        colonized_at: now,
        updated_at: now,
      })
      .eq('id', cellId)
      .eq('status', 'explored')
      .is('owner_territory_id', null);

    if (updCellErr) {
      // rollback território
      await supabase.from('territories').delete().eq('id', territoryId!);
      territoryId = null;
      cellId = null;
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao ocupar a célula' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 4) Criar cidade capital na célula (slot primário)
    const capitalName = `Capital de ${territoryName}`;
    const { data: cityInsert, error: cityErr } = await supabase
      .from('cities')
      .insert({
        name: capitalName,
        owner_territory_id: territoryId,
        region_id: chosen.region_id,
        cell_id: cellId,
        population: chosen.urban_population || 0,
        urban_population: chosen.urban_population || 0,
        status: 'free',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .limit(1);

    if (cityErr || !cityInsert || cityInsert.length === 0) {
      // rollback célula e território
      await supabase
        .from('cells')
        .update({
          status: 'explored',
          owner_territory_id: null,
          colonized_by: null,
          colonized_at: null,
          updated_at: now,
        })
        .eq('id', cellId!);
      await supabase.from('territories').delete().eq('id', territoryId!);
      cellId = null;
      territoryId = null;
      return new Response(
        JSON.stringify({ success: false, error: cityErr?.message || 'Falha ao criar capital' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    cityId = cityInsert[0].id;

    // Vincular como principal na célula e atualizar a célula com city_id
    await supabase.from('cell_cities').insert({
      cell_id: cellId,
      city_id: cityId,
      is_primary: true,
      created_at: now,
    });

    await supabase
      .from('cells')
      .update({ has_city: true, city_id: cityId, updated_at: now })
      .eq('id', cellId);

    // 5) Atualizar territory.capital_city_id e populações agregadas
    const rural = chosen.rural_population || 0;
    const urban = chosen.urban_population || 0;
    const { error: terrUpdErr } = await supabase
      .from('territories')
      .update({
        capital_city_id: cityId,
        total_rural_population: rural,
        total_urban_population: urban,
        updated_at: now,
      })
      .eq('id', territoryId);

    if (terrUpdErr) {
      // rollback cidade, célula, território
      await supabase.from('cell_cities').delete().eq('city_id', cityId!);
      await supabase.from('cities').delete().eq('id', cityId!);
      await supabase
        .from('cells')
        .update({
          status: 'explored',
          owner_territory_id: null,
          city_id: null,
          has_city: false,
          colonized_by: null,
          colonized_at: null,
          updated_at: now,
        })
        .eq('id', cellId!);
      await supabase.from('territories').delete().eq('id', territoryId!);
      cityId = null;
      cellId = null;
      territoryId = null;
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao atualizar território' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 6) Criar warehouse para o Estado
    const { data: wbInsert, error: wbErr } = await supabase
      .from('resource_balances')
      .insert({
        territory_id: territoryId,
        food: 500,
        energy: 500,
        minerals: 500,
        tech: 200,
        tick_number: 0,
        updated_at: now,
      })
      .select('id')
      .limit(1);

    if (wbErr || !wbInsert || wbInsert.length === 0) {
      // rollback cidade, célula, território
      await supabase.from('cell_cies').delete().eq('city_id', cityId!); // typo guard (will be ignored if table doesn't exist)
      await supabase.from('cell_cities').delete().eq('city_id', cityId!);
      await supabase.from('cities').delete().eq('id', cityId!);
      await supabase
        .from('cells')
        .update({
          status: 'explored',
          owner_territory_id: null,
          city_id: null,
          has_city: false,
          colonized_by: null,
          colonized_at: null,
          updated_at: now,
        })
        .eq('id', cellId!);
      await supabase.from('territories').delete().eq('id', territoryId!);
      cityId = null;
      cellId = null;
      territoryId = null;
      return new Response(
        JSON.stringify({ success: false, error: wbErr?.message || 'Falha ao criar armazém' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    warehouseId = wbInsert[0].id;

    // 7) Registrar event_log
    const { data: evInsert } = await supabase
      .from('event_logs')
      .insert({
        territory_id: territoryId,
        event_type: 'global',
        title: 'Estado fundado',
        description: `Foi fundado o ${territoryName}. Capital criada na célula ${cellId}.`,
        effects: { city_id: cityId, cell_id: cellId, admin_style: 'absolute_monarchy' },
        created_at: now,
      })
      .select('id')
      .limit(1);

    eventId = evInsert && evInsert.length > 0 ? evInsert[0].id : null;

    // Sucesso
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          territory_id: territoryId,
          cell_id: cellId,
          city_id: cityId,
          auto_approved: true,
        },
        message: 'Território inicial criado com sucesso.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: msg, code: 'UNEXPECTED_ERROR' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});