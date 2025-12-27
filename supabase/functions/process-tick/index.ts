import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only admins can trigger ticks manually (or schedule)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Sessão inválida' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
      });
    }
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403
      });
    }

    // Config and current tick
    const { data: config } = await supabase.from('world_config').select('*').limit(1).maybeSingle();
    const tickInterval = config?.tick_interval_hours ?? 24;

    const started_at = new Date().toISOString();
    const { data: lastLog } = await supabase
      .from('tick_logs')
      .select('tick_number')
      .order('tick_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextTickNumber = (lastLog?.tick_number || 0) + 1;

    // Consolidate states
    const { data: territories } = await supabase
      .from('territories')
      .select('id, stability, level, vocation, pd_points, pi_points, capital_city_id');

    let territoriesProcessed = 0;
    let citiesProcessed = 0;
    let eventsGenerated = 0;
    const perStateSnapshots: any[] = [];

    // Preload laws for multipliers
    const { data: enactedLaws } = await supabase
      .from('laws')
      .select('territory_id, positive_effects, negative_effects, population_sympathy, population_repulsion, rural_popularity, urban_popularity, synergy_score')
      .eq('legal_level', 'national')
      .eq('status', 'enacted');

    const lawsByTerritory = new Map<string, any[]>();
    for (const law of enactedLaws || []) {
      const arr = lawsByTerritory.get(law.territory_id) || [];
      arr.push(law);
      lawsByTerritory.set(law.territory_id, arr);
    }

    for (const t of territories || []) {
      const territory_id = t.id;

      // Aggregate cells
      const { data: cells } = await supabase
        .from('cells')
        .select('id, rural_population, urban_population, fertility, habitability, mineral_richness, energy_potential, urbanization_pull, resource_nodes, owner_territory_id')
        .eq('owner_territory_id', territory_id);

      const ruralPop = (cells || []).reduce((sum: number, c: any) => sum + (c.rural_population || 0), 0);
      const urbanPop = (cells || []).reduce((sum: number, c: any) => sum + (c.urban_population || 0), 0);
      const totalPop = ruralPop + urbanPop;

      // Aggregate cities
      const { data: cities } = await supabase
        .from('cities')
        .select('id, population, status')
        .eq('owner_territory_id', territory_id);
      const cityCount = (cities || []).length;
      citiesProcessed += cityCount;

      // Save aggregates on territory
      await supabase
        .from('territories')
        .update({
          total_rural_population: ruralPop,
          total_urban_population: urbanPop,
          cells_owned_count: (cells || []).length,
          cities_owned_count: cityCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', territory_id);

      // Production base per resource from cells
      let baseFood = 0, baseMinerals = 0, baseEnergy = 0, baseTech = 0, baseInfluence = 0;
      for (const c of cells || []) {
        const nodes = (c.resource_nodes || []) as any[];
        const fertility = c.fertility || 0;
        const hab = c.habitability || 0;
        const mineral = c.mineral_richness || 0;
        const energyPot = c.energy_potential || 0;
        const urbanPull = c.urbanization_pull || 0;

        const ruralActive = (c.rural_population || 0) * 0.6; // active proportion
        const urbanActive = (c.urban_population || 0) * 0.6;

        baseFood += ruralActive * (fertility * 0.0005 + nodeRichness(nodes, 'food') * 0.0004);
        baseMinerals += (ruralActive * 0.0002 + urbanActive * 0.0001) * (mineral * 1 + nodeRichness(nodes, 'minerals'));
        baseEnergy += (urbanActive * 0.00015) * (energyPot * 1 + nodeRichness(nodes, 'energy')) + cityCount * 2;
        baseTech += (urbanActive * 0.00012) * (urbanPull * 1 + nodeRichness(nodes, 'technology')) * (clamp(hab, 0.3, 1));
        baseInfluence += (urbanActive * 0.00005) * (0.8 + (cityCount * 0.02));
      }

      // Laws multipliers and popularity for stability
      const laws = lawsByTerritory.get(territory_id) || [];
      const lawBonus = computeLawBonus(laws);
      const ruralBias = laws.reduce((sum: number, l: any) => sum + (l.rural_popularity || 0) * 0.01, 0);
      const urbanBias = laws.reduce((sum: number, l: any) => sum + (l.urban_popularity || 0) * 0.01, 0);

      const stabilityFactor = 0.6 + (t.stability || 50) / 100 * 0.8;
      const prodFood = baseFood * (1 + lawBonus.food) * stabilityFactor;
      const prodEnergy = baseEnergy * (1 + lawBonus.energy) * stabilityFactor;
      const prodMinerals = baseMinerals * (1 + lawBonus.minerals) * stabilityFactor;
      const prodTech = baseTech * (1 + lawBonus.tech) * stabilityFactor;

      // Add to warehouse (respect capacity)
      const { data: rb } = await supabase
        .from('resource_balances')
        .select('*')
        .eq('territory_id', territory_id)
        .maybeSingle();

      const capacity = rb?.capacity_total || 10000;
      let newFood = (rb?.food || 0) + prodFood;
      let newEnergy = (rb?.energy || 0) + prodEnergy;
      let newMinerals = (rb?.minerals || 0) + prodMinerals;
      let newTech = (rb?.tech || 0) + prodTech;

      const totalStocks = newFood + newEnergy + newMinerals + newTech;
      let overflowLost = 0;
      if (totalStocks > capacity) {
        const overflow = totalStocks - capacity;
        // Remove proportionally
        const ratio = capacity / totalStocks;
        newFood *= ratio; newEnergy *= ratio; newMinerals *= ratio; newTech *= ratio;
        overflowLost = overflow;
        await supabase.from('event_logs').insert({
          territory_id,
          event_type: 'global',
          title: 'Armazém Cheio',
          description: `Excesso descartado: ${Math.round(overflow)}`,
          effects: { overflow, capacity },
        });
        eventsGenerated++;
      }

      // Consumption per tick
      const foodConsumption = totalPop * 0.001;
      const energyConsumption = totalPop * 0.0006 + cityCount * 30;
      let techConsumption = 0;

      // Research active?
      const { data: rq } = await supabase
        .from('territory_research_queue')
        .select('id, queue_position')
        .eq('territory_id', territory_id)
        .order('queue_position', { ascending: true })
        .limit(1);
      const hasResearch = (rq || []).length > 0;
      if (hasResearch) {
        const levelPenalty = 2; // simple level factor
        techConsumption = 10 + levelPenalty;
      }

      newFood -= foodConsumption;
      newEnergy -= energyConsumption;
      newTech -= techConsumption;

      // Crises handling
      let crisisFood = false, crisisEnergy = false, crisisMinerals = false, crisisTech = false;
      if (newFood < 0) {
        crisisFood = true;
        await supabase.from('event_logs').insert({
          territory_id,
          event_type: 'global',
          title: 'Crise Alimentar',
          description: 'Falta de alimento para a população',
        });
        eventsGenerated++;
      }
      if (newEnergy < 0) {
        crisisEnergy = true;
        await supabase.from('event_logs').insert({
          territory_id,
          event_type: 'global',
          title: 'Crise Energética',
          description: 'Apagão e queda de produção prevista',
        });
        eventsGenerated++;
      }
      if (newMinerals < 0) {
        crisisMinerals = true;
        await supabase.from('event_logs').insert({
          territory_id,
          event_type: 'global',
          title: 'Gargalo Mineral',
          description: 'Expansão/infra bloqueadas',
        });
        eventsGenerated++;
      }
      if (newTech < 0) {
        crisisTech = true;
        await supabase.from('event_logs').insert({
          territory_id,
          event_type: 'global',
          title: 'Estagnação Tecnológica',
          description: 'Pesquisa travada por falta de tecnologia',
        });
        eventsGenerated++;
      }

      // Clamp stocks to zero min
      newFood = Math.max(0, newFood);
      newEnergy = Math.max(0, newEnergy);
      newMinerals = Math.max(0, newMinerals);
      newTech = Math.max(0, newTech);

      // Growth + Urbanization per cell
      const GROWTH_BASE = 0.002;
      let growthSum = 0;
      for (const c of cells || []) {
        const cellTotal = (c.rural_population || 0) + (c.urban_population || 0);
        let growth = cellTotal * GROWTH_BASE * (c.habitability || 0.5) * (0.5 + (t.stability || 50) / 100);
        if (crisisFood || crisisEnergy) growth *= -0.5; // negative growth under crises

        // Distribute growth by fertility and urbanization_pull
        const ruralPull = (c.fertility || 0.5);
        const urbanPull = (c.urbanization_pull || 0.5);
        const ruralGrowth = growth * (0.5 + ruralPull * 0.5);
        const urbanGrowth = growth - ruralGrowth;

        const newRural = Math.max(0, Math.round((c.rural_population || 0) + ruralGrowth));
        const newUrban = Math.max(0, Math.round((c.urban_population || 0) + urbanGrowth));
        growthSum += (newRural + newUrban) - cellTotal;

        await supabase
          .from('cells')
          .update({
            rural_population: newRural,
            urban_population: newUrban,
            updated_at: new Date().toISOString(),
          })
          .eq('id', c.id);
      }

      // Migration (abstract): attractiveness score
      const surplusFood = newFood - foodConsumption;
      const surplusEnergy = newEnergy - energyConsumption;
      let attractiveness = (t.stability || 50);
      attractiveness += surplusFood > 0 ? 2 : -2;
      attractiveness += surplusEnergy > 0 ? 2 : -2;
      attractiveness += hasResearch ? 1 : 0;
      if (crisisFood) attractiveness -= 6;
      if (crisisEnergy) attractiveness -= 4;

      const migrationCap = totalPop * 0.002;
      const migrationNet = clamp(Math.round((attractiveness - 50) / 50 * migrationCap), -migrationCap, migrationCap);

      // Apply migration on territory populations proportionally (urban first)
      const urbanChange = Math.round(migrationNet * 0.6);
      const ruralChange = Math.round(migrationNet - urbanChange);

      const newUrbanPop = Math.max(0, urbanPop + urbanChange);
      const newRuralPop = Math.max(0, ruralPop + ruralChange);

      await supabase
        .from('territories')
        .update({
          total_rural_population: newRuralPop,
          total_urban_population: newUrbanPop,
          updated_at: new Date().toISOString(),
        })
        .eq('id', territory_id);

      // Stability and popularity adjustments
      let stabilityDelta = 0;
      if (surplusFood > 0) stabilityDelta += 2;
      if (surplusEnergy > 0) stabilityDelta += 2;
      if (crisisFood) stabilityDelta -= 10;
      if (crisisEnergy) stabilityDelta -= 7;
      stabilityDelta += Math.round(ruralBias + urbanBias); // popular laws

      const newStability = clamp((t.stability || 50) + stabilityDelta, 0, 100);

      await supabase
        .from('territories')
        .update({ stability: newStability, updated_at: new Date().toISOString() })
        .eq('id', territory_id);

      // Update warehouse stocks
      await supabase
        .from('resource_balances')
        .update({
          food: Math.round(newFood),
          energy: Math.round(newEnergy),
          minerals: Math.round(newMinerals),
          tech: Math.round(newTech),
          tick_number: nextTickNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('territory_id', territory_id);

      territoriesProcessed++;

      // Per-state snapshot for UI
      perStateSnapshots.push({
        territory_id,
        prod: { food: Math.round(prodFood), energy: Math.round(prodEnergy), minerals: Math.round(prodMinerals), tech: Math.round(prodTech) },
        cons: { food: Math.round(foodConsumption), energy: Math.round(energyConsumption), tech: Math.round(techConsumption) },
        crises: { food: crisisFood, energy: crisisEnergy, minerals: crisisMinerals, tech: crisisTech },
        migration_net: migrationNet,
        stability_after: newStability,
        overflow_lost: Math.round(overflowLost),
      });
    }

    // Auto-execution of market orders using existing RPC
    const { data: openListings } = await supabase
      .from('market_listings')
      .select('*')
      .eq('status', 'open');
    let tradesExecuted = 0;

    // Simplified matching: use existing match_market_order for sells
    for (const listing of openListings || []) {
      const { data: matchResult, error: matchError } = await supabase.rpc('match_market_order', {
        p_filled_quantity: listing.filled_quantity || 0,
        p_listing_id: listing.id,
        p_listing_type: listing.listing_type,
        p_price_per_unit: listing.price_per_unit,
        p_quantity: listing.quantity,
        p_resource_type: listing.resource_type,
        p_seller_territory_id: listing.seller_territory_id,
        p_seller_user_id: listing.seller_user_id,
      });
      if (!matchError && matchResult && matchResult.length > 0) {
        tradesExecuted += matchResult.reduce((acc: number, r: any) => acc + (r.trades_executed || 0), 0);
      }
    }

    // Tick log
    const summary = {
      per_state: perStateSnapshots,
      trades_executed: tradesExecuted,
      tick_interval_hours: tickInterval,
    };

    await supabase
      .from('tick_logs')
      .insert({
        id: crypto.randomUUID(),
        tick_number: nextTickNumber,
        started_at,
        status: 'completed',
        completed_at: new Date().toISOString(),
        territories_processed: territoriesProcessed,
        cities_processed: citiesProcessed,
        events_generated: eventsGenerated,
        summary,
      });

    // Update world_config counters
    await supabase
      .from('world_config')
      .update({
        last_tick_at: new Date().toISOString(),
        total_ticks: (config?.total_ticks || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .neq('id', '');

    return new Response(JSON.stringify({ success: true, tick_number: nextTickNumber, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[process-tick] error', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function nodeRichness(nodes: any[], type: string) {
  try {
    const n = (nodes || []).find((x: any) => x.type === type);
    return typeof n?.richness === 'number' ? n.richness : 0;
  } catch {
    return 0;
  }
}

function computeLawBonus(laws: any[]) {
  // Simple aggregation of bonuses from tags/effects
  let food = 0, energy = 0, minerals = 0, tech = 0;
  for (const l of laws || []) {
    const pos = l.positive_effects || [];
    if (pos.some((e: string) => /agric|alimento|rural/i.test(e))) food += 0.05;
    if (pos.some((e: string) => /energia|infra/i.test(e))) energy += 0.05;
    if (pos.some((e: string) => /mineral|indústria/i.test(e))) minerals += 0.05;
    if (pos.some((e: string) => /pesquisa|tecnolog/i.test(e))) tech += 0.05;
  }
  return { food, energy, minerals, tech };
}