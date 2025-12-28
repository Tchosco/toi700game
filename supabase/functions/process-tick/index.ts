import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Supa = ReturnType<typeof createClient>;

// ... existing code (all types and helpers unchanged) ...

async function runTick(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const auth = await authenticateAdmin(req, supabase);
  if (!auth.ok) {
    return {
      status: auth.status,
      body: { success: false, error: auth.error },
    };
  }

  // Acquire lock to avoid concurrent ticks
  const { data: lockOk } = await (supabase as any).rpc('acquire_tick_lock');
  if (!lockOk) {
    return {
      status: 429,
      body: { success: false, error: 'Tick já está em execução' },
    };
  }

  try {
    const { config, nextTickNumber, started_at } = await getConfigAndTick(supabase);

    await processConstructionQueue(supabase);
    await processInfrastructureMaintenance(supabase);

    const lawsByTerritory = await loadEnactedLawsByTerritory(supabase);

    const { data: territories } = await supabase
      .from('territories')
      .select('id, stability, level, vocation, pd_points, pi_points, capital_city_id');

    let territoriesProcessed = 0;
    let citiesProcessed = 0;
    let eventsGenerated = 0;
    const perStateSnapshots: any[] = [];

    for (const t of (territories || []) as Territory[]) {
      const territory_id = t.id;

      const { cells, ruralPop, urbanPop, totalPop, cityCount } = await aggregateTerritory(supabase, territory_id);
      citiesProcessed += cityCount;
      await applyAggregatesToTerritory(supabase, territory_id, ruralPop, urbanPop, cells.length, cityCount);

      const laws = lawsByTerritory.get(territory_id) || [];
      const { prodFood, prodEnergy, prodMinerals, prodTech, ruralBias, urbanBias } =
        computeProductionFromCells(cells, cityCount, laws, t.stability || 50);

      // Infra mods before consumption
      const mods = await getInfrastructureModifiers(supabase, territory_id);
      const prodMod = applyInfraModifiers(
        { food: prodFood, energy: prodEnergy, minerals: prodMinerals, tech: prodTech },
        { foodMult: mods.foodMult, energyMult: mods.energyMult, mineralsMult: mods.mineralsMult, techMult: mods.techMult }
      );

      const { data: rb } = await supabase
        .from('resource_balances')
        .select('*')
        .eq('territory_id', territory_id)
        .maybeSingle();

      let newFood = (rb?.food || 0) + prodMod.food;
      let newEnergy = (rb?.energy || 0) + prodMod.energy;
      let newMinerals = (rb?.minerals || 0) + prodMod.minerals;
      let newTech = (rb?.tech || 0) + prodMod.tech;

      // Capacity with infra waste reduction
      const capRes = await applyWarehouseCapacityWithInfra(supabase, territory_id, rb, newFood, newEnergy, newMinerals, newTech, mods.wasteReduction);
      newFood = capRes.food; newEnergy = capRes.energy; newMinerals = capRes.minerals; newTech = capRes.tech;
      const overflowLost = Math.round(capRes.overflowLost);
      if (overflowLost > 0) eventsGenerated++;

      // Consumption after production
      const { data: rq } = await supabase
        .from('territory_research_queue')
        .select('id, queue_position')
        .eq('territory_id', territory_id)
        .order('queue_position', { ascending: true })
        .limit(1);
      const hasResearch = (rq || []).length > 0;

      const { foodConsumption, energyConsumption, techConsumption } = computeConsumption(totalPop, cityCount, hasResearch, t.level);
      newFood -= foodConsumption;
      newEnergy -= energyConsumption;
      newTech -= techConsumption;

      // Crisis with clamp
      const crisis = await handleCrisesAndClamp(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech });
      if (crisis.crisisFood || crisis.crisisEnergy || crisis.crisisMinerals || crisis.crisisTech) {
        eventsGenerated++;
      }

      await updateCellGrowth(supabase, cells, t.stability || 50, crisis.crisisFood, crisis.crisisEnergy);

      // NEW: aplicar viés rural/urbano por célula com fator aleatório de crescimento
      await applyRuralUrbanBiases(supabase, territory_id, cells);

      const surplusFood = newFood - foodConsumption;
      const surplusEnergy = newEnergy - energyConsumption;

      const mig = await applyMigration(supabase, territory_id, urbanPop, ruralPop, totalPop, surplusFood, surplusEnergy, hasResearch, crisis.crisisFood, crisis.crisisEnergy);

      const newStability = await applyStability(supabase, territory_id, t.stability || 50, surplusFood, surplusEnergy, crisis.crisisFood, crisis.crisisEnergy, ruralBias, urbanBias);

      await (supabase as any).rpc('atomic_update_resource_balances', {
        p_territory_id: territory_id,
        p_food: Math.max(0, crisis.food),
        p_energy: Math.max(0, crisis.energy),
        p_minerals: Math.max(0, crisis.minerals),
        p_tech: Math.max(0, crisis.tech),
        p_tick_number: nextTickNumber,
      });

      territoriesProcessed++;

      perStateSnapshots.push({
        territory_id,
        prod: { food: Math.round(prodMod.food), energy: Math.round(prodMod.energy), minerals: Math.round(prodMod.minerals), tech: Math.round(prodMod.tech) },
        cons: { food: Math.round(foodConsumption), energy: Math.round(energyConsumption), tech: Math.round(techConsumption) },
        crises: { food: crisis.crisisFood, energy: crisis.crisisEnergy, minerals: crisis.crisisMinerals, tech: crisis.crisisTech },
        migration_net: mig.migrationNet,
        stability_after: newStability,
        overflow_lost: overflowLost,
      });
    }

    const tradesExecuted = await processMarket(supabase);

    const summary = {
      per_state: perStateSnapshots,
      trades_executed: tradesExecuted,
      tick_interval_hours: config?.tick_interval_hours ?? 24,
      territories_processed: territoriesProcessed,
      cities_processed: citiesProcessed,
      events_generated: eventsGenerated,
    };

    await finalizeTick(supabase, nextTickNumber, started_at, summary, config);

    await supabase.from('event_logs').insert({
      event_type: 'global',
      title: 'Tick concluído',
      description: `Tick #${nextTickNumber} finalizado: ${territoriesProcessed} Estados, ${eventsGenerated} eventos, ${tradesExecuted} trades.`,
    });

    await supabase
      .from('planet_config')
      .update({ tick_number: nextTickNumber })
      .neq('id', '');

    return {
      status: 200,
      body: { success: true, tick_number: nextTickNumber, summary },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return { status: 500, body: { success: false, error: msg } };
  } finally {
    // Always release lock
    await (supabase as any).rpc('release_tick_lock');
  }
}

// Entry point unchanged
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await runTick(req);
    return new Response(JSON.stringify(result.body), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.status,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function applyRuralUrbanBiases(supabase: Supa, territory_id: string, cells: any[]) {
  if (!cells || cells.length === 0) return;

  // Preparar atualizações em lote
  const updates: { id: string; rural_population: number; urban_population: number }[] = [];

  for (const c of cells) {
    // Garantir campos necessários
    const id = c.id;
    const rural = Number(c.rural_population || 0);
    const urban = Number(c.urban_population || 0);

    // Aproximações:
    // - Fertilidade de solo: usar resource_food
    // - Infraestrutura/terreno plano: usar resource_tech, has_city, is_urban_eligible
    const food = Number(c.resource_food || 0);
    const tech = Number(c.resource_tech || 0);
    const hasCity = !!c.has_city;
    const urbanEligible = !!c.is_urban_eligible;

    const ruralBias = Math.max(0, food);
    const urbanBias = Math.max(0, tech) + (hasCity ? 30 : 0) + (urbanEligible ? 20 : 0);

    const biasSum = ruralBias + urbanBias;
    const ruralShare = biasSum > 0 ? ruralBias / biasSum : 0.5;

    // Fator aleatório de crescimento por tick (±2%)
    const randomFactor = 1 + (Math.random() - 0.5) * 0.02;

    const total = rural + urban;
    if (total <= 0) continue;

    // Crescimento base pequeno por tick (≈0.1%) ajustado pelo "desenvolvimento" (food+tech)
    const devFactor = Math.min(1, (food + tech) / 300); // normaliza algum desenvolvimento
    const growthRate = (0.001 + devFactor * 0.0005) * randomFactor;
    const growth = Math.max(0, Math.round(total * growthRate));

    const deltaRural = Math.round(growth * ruralShare);
    const deltaUrban = growth - deltaRural;

    updates.push({
      id,
      rural_population: rural + deltaRural,
      urban_population: urban + deltaUrban,
    });
  }

  if (updates.length === 0) return;

  // Enviar em blocos para evitar payloads grandes
  const chunkSize = 100;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const { error } = await supabase.from('cells').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error('Erro ao aplicar viés rural/urbano:', error.message);
      break;
    }
  }
}