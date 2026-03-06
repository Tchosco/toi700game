import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Supa = ReturnType<typeof createClient>;

// ── Types ──────────────────────────────────────────────────

interface Territory {
  id: string;
  stability: number | null;
  level: string | null;
  vocation: string | null;
  pd_points: number;
  pi_points: number;
  capital_city_id: string | null;
}

interface CellRow {
  id: string;
  rural_population: number;
  urban_population: number;
  resource_food: number;
  resource_energy: number;
  resource_minerals: number;
  resource_tech: number;
  has_city: boolean;
  is_urban_eligible: boolean;
  cell_type: string;
}

interface ResourceBundle {
  food: number;
  energy: number;
  minerals: number;
  tech: number;
}

interface InfraMods {
  foodMult: number;
  energyMult: number;
  mineralsMult: number;
  techMult: number;
  wasteReduction: number;
}

// ── Auth helper ────────────────────────────────────────────

async function authenticateAdmin(req: Request, supabase: Supa) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { ok: false as const, status: 401, error: 'Missing authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { ok: false as const, status: 401, error: 'Invalid token' };
  }

  // Check admin role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return { ok: false as const, status: 403, error: 'Apenas administradores podem executar ticks' };
  }

  return { ok: true as const, user };
}

// ── Config & tick number ───────────────────────────────────

async function getConfigAndTick(supabase: Supa) {
  const { data: config } = await supabase
    .from('world_config')
    .select('*')
    .limit(1)
    .single();

  const currentTick = config?.total_ticks ?? 0;
  const nextTickNumber = currentTick + 1;
  const started_at = new Date().toISOString();

  // Create tick log entry
  await supabase.from('tick_logs').insert({
    tick_number: nextTickNumber,
    started_at,
    status: 'running',
  });

  return { config, nextTickNumber, started_at };
}

// ── Construction queue (stub – table may not exist) ───────

async function processConstructionQueue(supabase: Supa) {
  // No construction_queue table exists yet – no-op
}

// ── Infrastructure maintenance (stub) ─────────────────────

async function processInfrastructureMaintenance(supabase: Supa) {
  // No infrastructure table exists yet – no-op
}

// ── Load enacted laws per territory ───────────────────────

async function loadEnactedLawsByTerritory(supabase: Supa): Promise<Map<string, any[]>> {
  const { data: laws } = await supabase
    .from('laws')
    .select('*')
    .eq('status', 'enacted');

  const map = new Map<string, any[]>();
  for (const law of (laws || [])) {
    const tid = law.territory_id;
    if (!tid) continue;
    if (!map.has(tid)) map.set(tid, []);
    map.get(tid)!.push(law);
  }
  return map;
}

// ── Aggregate territory data from cells ───────────────────

async function aggregateTerritory(supabase: Supa, territory_id: string) {
  const { data: cells } = await supabase
    .from('cells')
    .select('id, rural_population, urban_population, resource_food, resource_energy, resource_minerals, resource_tech, has_city, is_urban_eligible, cell_type')
    .eq('owner_territory_id', territory_id);

  const rows = (cells || []) as CellRow[];
  let ruralPop = 0;
  let urbanPop = 0;
  let cityCount = 0;

  for (const c of rows) {
    ruralPop += Number(c.rural_population || 0);
    urbanPop += Number(c.urban_population || 0);
    if (c.has_city) cityCount++;
  }

  return {
    cells: rows,
    ruralPop,
    urbanPop,
    totalPop: ruralPop + urbanPop,
    cityCount,
  };
}

async function applyAggregatesToTerritory(
  supabase: Supa,
  territory_id: string,
  ruralPop: number,
  urbanPop: number,
  cellCount: number,
  cityCount: number,
) {
  await supabase
    .from('territories')
    .update({
      total_rural_population: ruralPop,
      total_urban_population: urbanPop,
    })
    .eq('id', territory_id);
}

// ── Production from cells ─────────────────────────────────

function computeProductionFromCells(
  cells: CellRow[],
  cityCount: number,
  laws: any[],
  stability: number,
) {
  let prodFood = 0;
  let prodEnergy = 0;
  let prodMinerals = 0;
  let prodTech = 0;
  let ruralBias = 0;
  let urbanBias = 0;

  const stabilityFactor = Math.max(0.3, stability / 100);

  for (const c of cells) {
    const food = Number(c.resource_food || 0);
    const energy = Number(c.resource_energy || 0);
    const minerals = Number(c.resource_minerals || 0);
    const tech = Number(c.resource_tech || 0);
    const pop = Number(c.rural_population || 0) + Number(c.urban_population || 0);
    const popFactor = Math.min(1, pop / 100000);

    prodFood += food * popFactor * stabilityFactor;
    prodEnergy += energy * popFactor * stabilityFactor;
    prodMinerals += minerals * popFactor * stabilityFactor;
    prodTech += tech * popFactor * stabilityFactor;

    if (c.has_city || c.is_urban_eligible) {
      urbanBias += tech;
    } else {
      ruralBias += food;
    }
  }

  // Law modifiers
  for (const law of laws) {
    const effects = law.positive_effects;
    if (effects && typeof effects === 'object') {
      prodFood *= 1 + (Number((effects as any).food_bonus) || 0) / 100;
      prodEnergy *= 1 + (Number((effects as any).energy_bonus) || 0) / 100;
      prodMinerals *= 1 + (Number((effects as any).minerals_bonus) || 0) / 100;
      prodTech *= 1 + (Number((effects as any).tech_bonus) || 0) / 100;
    }
  }

  // City bonus
  prodTech += cityCount * 5;
  prodEnergy += cityCount * 3;

  return {
    prodFood: Math.round(prodFood),
    prodEnergy: Math.round(prodEnergy),
    prodMinerals: Math.round(prodMinerals),
    prodTech: Math.round(prodTech),
    ruralBias,
    urbanBias,
  };
}

// ── Infrastructure modifiers (stub) ───────────────────────

async function getInfrastructureModifiers(_supabase: Supa, _territory_id: string): Promise<InfraMods> {
  return {
    foodMult: 1,
    energyMult: 1,
    mineralsMult: 1,
    techMult: 1,
    wasteReduction: 0,
  };
}

function applyInfraModifiers(
  prod: ResourceBundle,
  mods: { foodMult: number; energyMult: number; mineralsMult: number; techMult: number },
): ResourceBundle {
  return {
    food: prod.food * mods.foodMult,
    energy: prod.energy * mods.energyMult,
    minerals: prod.minerals * mods.mineralsMult,
    tech: prod.tech * mods.techMult,
  };
}

// ── Warehouse capacity ────────────────────────────────────

async function applyWarehouseCapacityWithInfra(
  _supabase: Supa,
  _territory_id: string,
  _rb: any,
  food: number,
  energy: number,
  minerals: number,
  tech: number,
  wasteReduction: number,
) {
  const cap = 10000; // base capacity per resource
  const effectiveCap = cap * (1 + wasteReduction);
  let overflowLost = 0;

  if (food > effectiveCap) { overflowLost += food - effectiveCap; food = effectiveCap; }
  if (energy > effectiveCap) { overflowLost += energy - effectiveCap; energy = effectiveCap; }
  if (minerals > effectiveCap) { overflowLost += minerals - effectiveCap; minerals = effectiveCap; }
  if (tech > effectiveCap) { overflowLost += tech - effectiveCap; tech = effectiveCap; }

  return { food, energy, minerals, tech, overflowLost };
}

// ── Consumption ───────────────────────────────────────────

function computeConsumption(
  totalPop: number,
  cityCount: number,
  hasResearch: boolean,
  level: string | null,
) {
  const popUnits = totalPop / 10000;
  const foodConsumption = Math.round(popUnits * 2);
  const energyConsumption = Math.round(popUnits * 1.5 + cityCount * 5);
  const techConsumption = hasResearch ? Math.round(popUnits * 0.5 + 10) : 0;

  return { foodConsumption, energyConsumption, techConsumption };
}

// ── Crises & clamp ────────────────────────────────────────

async function handleCrisesAndClamp(
  supabase: Supa,
  territory_id: string,
  res: ResourceBundle,
) {
  const crisisFood = res.food < 0;
  const crisisEnergy = res.energy < 0;
  const crisisMinerals = res.minerals < 0;
  const crisisTech = res.tech < 0;

  const crisisTypes: string[] = [];
  if (crisisFood) crisisTypes.push('alimento');
  if (crisisEnergy) crisisTypes.push('energia');
  if (crisisMinerals) crisisTypes.push('minerais');
  if (crisisTech) crisisTypes.push('tecnologia');

  if (crisisTypes.length > 0) {
    await supabase.from('event_logs').insert({
      event_type: 'crisis',
      territory_id,
      title: `Crise de ${crisisTypes.join(', ')}`,
      description: `O território está com déficit de ${crisisTypes.join(', ')}.`,
    });
  }

  return {
    food: Math.max(0, res.food),
    energy: Math.max(0, res.energy),
    minerals: Math.max(0, res.minerals),
    tech: Math.max(0, res.tech),
    crisisFood,
    crisisEnergy,
    crisisMinerals,
    crisisTech,
  };
}

// ── Cell growth ───────────────────────────────────────────

async function updateCellGrowth(
  supabase: Supa,
  cells: CellRow[],
  stability: number,
  crisisFood: boolean,
  crisisEnergy: boolean,
) {
  const stabilityFactor = stability / 100;
  const crisisPenalty = (crisisFood ? -0.005 : 0) + (crisisEnergy ? -0.003 : 0);
  const baseGrowth = 0.001 * stabilityFactor + crisisPenalty;

  const updates: { id: string; rural_population: number; urban_population: number }[] = [];

  for (const c of cells) {
    const rural = Number(c.rural_population || 0);
    const urban = Number(c.urban_population || 0);
    const total = rural + urban;
    if (total <= 0) continue;

    const growthRate = Math.max(-0.01, baseGrowth + (Math.random() - 0.5) * 0.001);
    const growth = Math.round(total * growthRate);

    const urbanShare = c.has_city ? 0.7 : c.is_urban_eligible ? 0.4 : 0.2;
    const urbanGrowth = Math.round(growth * urbanShare);
    const ruralGrowth = growth - urbanGrowth;

    updates.push({
      id: c.id,
      rural_population: Math.max(0, rural + ruralGrowth),
      urban_population: Math.max(0, urban + urbanGrowth),
    });
  }

  if (updates.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await (supabase as any).from('cells').upsert(chunk, { onConflict: 'id' });
  }
}

// ── Rural/Urban biases ────────────────────────────────────

async function applyRuralUrbanBiases(supabase: Supa, territory_id: string) {
  const { data: cells } = await supabase
    .from('cells')
    .select('id, rural_population, urban_population, resource_food, resource_tech, has_city, is_urban_eligible')
    .eq('owner_territory_id', territory_id);

  if (!cells || cells.length === 0) return;

  const updates: { id: string; rural_population: number; urban_population: number }[] = [];

  for (const c of cells as any[]) {
    const rural = Number(c.rural_population || 0);
    const urban = Number(c.urban_population || 0);
    const total = rural + urban;
    if (total <= 0) continue;

    const food = Number(c.resource_food || 0);
    const tech = Number(c.resource_tech || 0);
    const hasCity = !!c.has_city;
    const urbanEligible = !!c.is_urban_eligible;

    const ruralBias = Math.max(0, food);
    const urbanBias = Math.max(0, tech) + (hasCity ? 30 : 0) + (urbanEligible ? 20 : 0);
    const biasSum = ruralBias + urbanBias;
    const ruralShare = biasSum > 0 ? ruralBias / biasSum : 0.5;

    const randomFactor = 1 + (Math.random() - 0.5) * 0.02;
    const devFactor = Math.min(1, (food + tech) / 300);
    const growthRate = (0.001 + devFactor * 0.0005) * randomFactor;
    const growth = Math.max(0, Math.round(total * growthRate));

    const deltaRural = Math.round(growth * ruralShare);
    const deltaUrban = growth - deltaRural;

    updates.push({
      id: c.id,
      rural_population: rural + deltaRural,
      urban_population: urban + deltaUrban,
    });
  }

  if (updates.length === 0) return;

  const chunkSize = 100;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await (supabase as any).from('cells').upsert(chunk, { onConflict: 'id' });
  }
}

// ── Migration ─────────────────────────────────────────────

async function applyMigration(
  supabase: Supa,
  territory_id: string,
  urbanPop: number,
  ruralPop: number,
  totalPop: number,
  surplusFood: number,
  surplusEnergy: number,
  hasResearch: boolean,
  crisisFood: boolean,
  crisisEnergy: boolean,
) {
  // Net migration based on conditions
  let migrationNet = 0;

  // Surplus attracts population
  if (surplusFood > 100) migrationNet += Math.round(surplusFood * 0.01);
  if (surplusEnergy > 100) migrationNet += Math.round(surplusEnergy * 0.005);
  if (hasResearch) migrationNet += Math.round(totalPop * 0.0005);

  // Crisis causes emigration
  if (crisisFood) migrationNet -= Math.round(totalPop * 0.002);
  if (crisisEnergy) migrationNet -= Math.round(totalPop * 0.001);

  // Clamp migration
  migrationNet = Math.max(-Math.round(totalPop * 0.01), Math.min(Math.round(totalPop * 0.01), migrationNet));

  return { migrationNet };
}

// ── Stability ─────────────────────────────────────────────

async function applyStability(
  supabase: Supa,
  territory_id: string,
  currentStability: number,
  surplusFood: number,
  surplusEnergy: number,
  crisisFood: boolean,
  crisisEnergy: boolean,
  ruralBias: number,
  urbanBias: number,
) {
  let delta = 0;

  // Surplus stabilises
  if (surplusFood > 0) delta += 1;
  if (surplusEnergy > 0) delta += 1;

  // Crises destabilise
  if (crisisFood) delta -= 3;
  if (crisisEnergy) delta -= 2;

  // Mean reversion to 50
  delta += Math.round((50 - currentStability) * 0.05);

  const newStability = Math.max(0, Math.min(100, currentStability + delta));

  await supabase
    .from('territories')
    .update({ stability: newStability })
    .eq('id', territory_id);

  return newStability;
}

// ── Market processing ─────────────────────────────────────

async function processMarket(supabase: Supa): Promise<number> {
  // Attempt auto-matching of open orders
  const { data: openSells } = await supabase
    .from('market_listings')
    .select('*')
    .eq('listing_type', 'sell')
    .in('status', ['open', 'partially_filled'])
    .order('created_at', { ascending: true })
    .limit(50);

  let tradesExecuted = 0;

  for (const sell of (openSells || []) as any[]) {
    const { data: results } = await (supabase as any).rpc('match_market_order', {
      p_listing_id: sell.id,
      p_seller_user_id: sell.seller_user_id,
      p_seller_territory_id: sell.seller_territory_id,
      p_listing_type: sell.listing_type,
      p_resource_type: sell.resource_type,
      p_price_per_unit: sell.price_per_unit,
      p_quantity: sell.quantity,
      p_filled_quantity: sell.filled_quantity,
    });

    if (results && results.length > 0) {
      tradesExecuted += results[0].trades_executed || 0;
    }
  }

  return tradesExecuted;
}

// ── Finalize tick ─────────────────────────────────────────

async function finalizeTick(
  supabase: Supa,
  tickNumber: number,
  started_at: string,
  summary: any,
  config: any,
) {
  await supabase
    .from('tick_logs')
    .update({
      completed_at: new Date().toISOString(),
      status: 'completed',
      territories_processed: summary.territories_processed,
      cities_processed: summary.cities_processed,
      events_generated: summary.events_generated,
      summary,
    })
    .eq('tick_number', tickNumber);

  await supabase
    .from('world_config')
    .update({
      last_tick_at: new Date().toISOString(),
      total_ticks: tickNumber,
    })
    .neq('id', '00000000-0000-0000-0000-000000000000');
}

// ══════════════════════════════════════════════════════════
// MAIN TICK LOGIC
// ══════════════════════════════════════════════════════════

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
        { foodMult: mods.foodMult, energyMult: mods.energyMult, mineralsMult: mods.mineralsMult, techMult: mods.techMult },
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

      // Aplicar viés rural/urbano por célula
      await applyRuralUrbanBiases(supabase, territory_id);

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
      .from('world_config')
      .update({ total_ticks: nextTickNumber })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return {
      status: 200,
      body: { success: true, tick_number: nextTickNumber, summary },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return { status: 500, body: { success: false, error: msg } };
  } finally {
    await (supabase as any).rpc('release_tick_lock');
  }
}

// ── Entry point ───────────────────────────────────────────

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
