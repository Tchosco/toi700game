import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColonizeRequest {
  cell_id: string;
  territory_id: string;
}

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
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const body: ColonizeRequest = await req.json();
    const { cell_id, territory_id } = body;

    if (!cell_id || !territory_id) {
      return new Response(JSON.stringify({ success: false, error: 'cell_id e territory_id são obrigatórios' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // 1. Check territory ownership
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territory_id)
      .eq('owner_id', user.id)
      .single();

    if (territoryError || !territory) {
      return new Response(JSON.stringify({ success: false, error: 'Território não encontrado ou não pertence a você' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // 2. Load cell
    const { data: cell, error: cellError } = await supabase
      .from('cells')
      .select('*, regions(*)')
      .eq('id', cell_id)
      .single();

    if (cellError || !cell) {
      return new Response(JSON.stringify({ success: false, error: 'Célula não encontrada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 });
    }

    if (cell.status !== 'explored' || cell.owner_territory_id) {
      return new Response(JSON.stringify({ success: false, error: 'Esta célula não está livre para colonização' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // 3. Check remote colonization tech
    const { data: remoteTech } = await supabase
      .from('territory_technologies')
      .select('technology_id, technologies(name)')
      .eq('territory_id', territory_id)
      .limit(1000);

    const hasRemoteColonization = (remoteTech || []).some((tt: any) => {
      const name = tt.technologies?.name?.toLowerCase() || '';
      return name.includes('remota') || name.includes('remote_colonization');
    });

    // 4. Adjacency by sector in the same region (if no remote tech)
    if (!hasRemoteColonization) {
      // compute sector_key for target
      const { data: targetSector } = await supabase
        .rpc('get_region_sectors', {
          p_region_id: cell.region_id,
          p_bucket_size: 300
        });
      // Determine sector_key of the target via the same hashtext logic using SQL
      const { data: targetRow } = await supabase
        .from('cells')
        .select(`
          id,
          region_id,
          sector_key: (abs(hashtext(id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / 300) FROM cells WHERE region_id = ${cell.region_id})))
        `)
        .eq('id', cell_id)
        .maybeSingle();

      const sectorKey = (targetRow as any)?.sector_key ?? null;

      // Check if territory owns any cell in same sector
      const { data: ownedNeighbors } = await supabase
        .from('cells')
        .select('id')
        .eq('region_id', cell.region_id)
        .eq('owner_territory_id', territory_id)
        .or(`(abs(hashtext(id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / 300) FROM cells WHERE region_id = ${cell.region_id})))::int.eq.${sectorKey}`);

      if (!ownedNeighbors || ownedNeighbors.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Colonização limitada: precisa ser adjacente a uma célula do seu Estado ou possuir tecnologia remota' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
      }
    }

    // 5. Costs (base)
    let costTokenLand = 1;
    let costFood = 5000;
    let costEnergy = 3000;
    let costMinerals = 4000;
    let costCurrency = 1000;

    // Adjust by habitability (worse = more expensive)
    const hab = typeof cell.habitability === 'number' ? cell.habitability : 0.5;
    if (hab < 0.5) {
      const penaltyFactor = 1 + (0.5 - hab); // up to +50% near 0
      costFood = Math.round(costFood * penaltyFactor);
      costEnergy = Math.round(costEnergy * penaltyFactor);
      costMinerals = Math.round(costMinerals * penaltyFactor);
      costCurrency = Math.round(costCurrency * penaltyFactor);
    }

    // Adjust for remote colonization (if used)
    if (hasRemoteColonization) {
      costEnergy = Math.round(costEnergy * 1.25);
      costCurrency = Math.round(costCurrency * 1.15);
    }

    // Laws and infrastructure can reduce costs slightly (logistics_network)
    const { data: infra } = await supabase.from('infra_national').select('type_key').eq('territory_id', territory_id);
    const hasLogistics = (infra || []).some((i: any) => i.type_key === 'logistics_network');
    if (hasLogistics) {
      costFood = Math.round(costFood * 0.9);
      costEnergy = Math.round(costEnergy * 0.9);
      costMinerals = Math.round(costMinerals * 0.9);
      costCurrency = Math.round(costCurrency * 0.9);
    }

    // 6. Deduct token_land
    const { data: deductToken, error: deductTokenErr } = await supabase.rpc('atomic_deduct_token', {
      p_user_id: user.id,
      p_token_type: 'land',
      p_amount: costTokenLand
    });
    if (deductTokenErr || !deductToken?.success) {
      return new Response(JSON.stringify({ success: false, error: 'Tokens de terra insuficientes' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // 7. Deduct resources from warehouse
    const { data: rb } = await supabase.from('resource_balances').select('*').eq('territory_id', territory_id).maybeSingle();
    if (!rb || (rb.food < costFood) || (rb.energy < costEnergy) || (rb.minerals < costMinerals)) {
      return new Response(JSON.stringify({ success: false, error: 'Recursos insuficientes no Armazém (food/energy/minerals)' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    await supabase
      .from('resource_balances')
      .update({
        food: rb.food - costFood,
        energy: rb.energy - costEnergy,
        minerals: rb.minerals - costMinerals,
        updated_at: new Date().toISOString()
      })
      .eq('territory_id', territory_id);

    // 8. Deduct currency from profile
    const { data: profile } = await supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle();
    if (!profile || profile.currency < costCurrency) {
      return new Response(JSON.stringify({ success: false, error: 'Moeda insuficiente (currency)' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
    await supabase
      .from('profiles')
      .update({ currency: profile.currency - costCurrency, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Log currency transaction
    await supabase.from('currency_transactions').insert({
      user_id: user.id,
      amount: -costCurrency,
      transaction_type: 'expense',
      category: 'colonization',
      description: `Colonização de célula ${cell_id}`,
      related_territory_id: territory_id,
    });

    // 9. Colonize the cell
    const { error: colonizeError } = await supabase
      .from('cells')
      .update({
        status: 'colonized',
        owner_territory_id: territory_id,
        colonized_by: user.id,
        colonized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cell_id)
      .eq('status', 'explored')
      .is('owner_territory_id', null);

    if (colonizeError) {
      return new Response(JSON.stringify({ success: false, error: 'Erro ao colonizar célula - pode já ter sido colonizada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    // 10. Event log
    await supabase.from('event_logs').insert({
      territory_id: territory_id,
      event_type: 'global',
      title: 'Nova Célula Colonizada',
      description: `Estado colonizou uma célula na região ${(cell.regions as { name: string })?.name || 'desconhecida'}. Custos: token_land=${costTokenLand}, food=${costFood}, energy=${costEnergy}, minerals=${costMinerals}, currency=${costCurrency}`,
      effects: { cell_id, has_remote: hasRemoteColonization, habitability: hab }
    });

    return new Response(JSON.stringify({ success: true, message: 'Célula colonizada com sucesso!', cell_id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});