import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Supa = ReturnType<typeof createClient>;

type Territory = {
  id: string;
  stability: number | null;
  level: string | null;
  vocation: string | null;
  pd_points: number | null;
  pi_points: number | null;
  capital_city_id: string | null;
};

type Law = {
  territory_id: string;
  positive_effects?: string[];
  negative_effects?: string[];
  population_sympathy?: number;
  population_repulsion?: number;
  rural_popularity?: number;
  urban_popularity?: number;
  synergy_score?: number;
};

type Cell = {
  id: string;
  region_id: string | null;
  rural_population: number | null;
  urban_population: number | null;
  fertility: number | null;
  habitability: number | null;
  mineral_richness: number | null;
  energy_potential: number | null;
  urbanization_pull: number | null;
  resource_nodes: any[] | null;
  owner_territory_id: string | null;
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function nodeRichness(nodes: any[] | null | undefined, type: string) {
  try {
    const arr = Array.isArray(nodes) ? nodes : [];
    const n = arr.find((x: any) => x.type === type);
    return typeof n?.richness === 'number' ? n.richness : 0;
  } catch {
    return 0;
  }
}

function computeLawBonus(laws: Law[]) {
  // Agrega bônus simples por efeitos textuais
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

// Auth admin
async function authenticateAdmin(req: Request, supabase: Supa) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { ok: false, status: 401, error: 'Não autorizado' as const };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return { ok: false, status: 401, error: 'Sessão inválida' as const };

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!role) return { ok: false, status: 403, error: 'Acesso negado' as const };
  return { ok: true, user };
}

// Carrega config e próximo tick
async function getConfigAndTick(supabase: Supa) {
  const { data: config } = await supabase.from('world_config').select('*').limit(1).maybeSingle();
  const { data: lastLog } = await supabase
    .from('tick_logs')
    .select('tick_number')
    .order('tick_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const started_at = new Date().toISOString();
  const nextTickNumber = (lastLog?.tick_number || 0) + 1;

  return { config, nextTickNumber, started_at };
}

// Processa obras em construção (fila)
async function processConstructionQueue(supabase: Supa) {
  const { data: queue } = await supabase
    .from('construction_queue')
    .select('*')
    .eq('status', 'in_progress');

  for (const q of queue || []) {
    const remaining = Math.max(0, (q.remaining_ticks || 0) - 1);
    const newStatus = remaining <= 0 ? 'completed' : 'in_progress';

    await supabase
      .from('construction_queue')
      .update({ remaining_ticks: remaining, status: newStatus })
      .eq('id', q.id);

    if (newStatus === 'completed') {
      if (q.level === 'national') {
        await supabase.from('infra_national').insert({
          territory_id: q.territory_id,
          type_key: q.type_key,
          started_at: q.started_at,
          completed_at: new Date().toISOString(),
          status: 'active',
          maintenance_active: true
        });

        const { data: tdef } = await supabase
          .from('national_infrastructure_types')
          .select('effects')
          .eq('key', q.type_key)
          .maybeSingle();

        const eff = tdef?.effects || {};
        if (eff.capacity_bonus) {
          const { data: rb } = await supabase
            .from('resource_balances')
            .select('*')
            .eq('territory_id', q.territory_id)
            .maybeSingle();
          if (rb) {
            await supabase
              .from('resource_balances')
              .update({ capacity_total: (rb.capacity_total || 10000) + Number(eff.capacity_bonus), updated_at: new Date().toISOString() })
              .eq('territory_id', q.territory_id);
          }
        }
        if (eff.stability_bonus) {
          const { data: tt } = await supabase
            .from('territories')
            .select('stability')
            .eq('id', q.territory_id)
            .maybeSingle();
          if (tt) {
            await supabase
              .from('territories')
              .update({ stability: clamp((tt.stability || 50) + Number(eff.stability_bonus), 0, 100), updated_at: new Date().toISOString() })
              .eq('id', q.territory_id);
          }
        }

        await supabase.from('event_logs').insert({
          territory_id: q.territory_id,
          event_type: 'global',
          title: 'Infraestrutura Concluída',
          description: `Construção nacional concluída: ${q.type_key}`,
        });
      } else {
        await supabase.from('infra_cell').insert({
          territory_id: q.territory_id,
          cell_id: q.cell_id,
          type_key: q.type_key,
          started_at: q.started_at,
          completed_at: new Date().toISOString(),
          status: 'active',
          maintenance_active: true
        });

        await supabase.from('event_logs').insert({
          territory_id: q.territory_id,
          event_type: 'global',
          title: 'Infraestrutura Local Concluída',
          description: `Construção local concluída na célula ${q.cell_id}: ${q.type_key}`,
        });
      }
    }
  }
}

// Leis ativas por território
async function loadEnactedLawsByTerritory(supabase: Supa) {
  const { data: enactedLaws } = await supabase
    .from('laws')
    .select('territory_id, positive_effects, negative_effects, population_sympathy, population_repulsion, rural_popularity, urban_popularity, synergy_score')
    .eq('legal_level', 'national')
    .eq('status', 'enacted');

  const map = new Map<string, Law[]>();
  for (const law of enactedLaws || []) {
    const arr = map.get(law.territory_id) || [];
    arr.push(law as Law);
    map.set(law.territory_id, arr);
  }
  return map;
}

// Agrega dados de um Estado
async function aggregateTerritory(supabase: Supa, territory_id: string) {
  const { data: cells } = await supabase
    .from('cells')
    .select('id, region_id, rural_population, urban_population, fertility, habitability, mineral_richness, energy_potential, urbanization_pull, resource_nodes, owner_territory_id')
    .eq('owner_territory_id', territory_id);

  const ruralPop = (cells || []).reduce((sum: number, c: any) => sum + (c.rural_population || 0), 0);
  const urbanPop = (cells || []).reduce((sum: number, c: any) => sum + (c.urban_population || 0), 0);
  const totalPop = ruralPop + urbanPop;

  const { data: cities } = await supabase
    .from('cities')
    .select('id, population, status')
    .eq('owner_territory_id', territory_id);

  const cityCount = (cities || []).length;

  return { cells: (cells || []) as Cell[], ruralPop, urbanPop, totalPop, cityCount };
}

// Aplica agregados no Estado
async function applyAggregatesToTerritory(supabase: Supa, territory_id: string, ruralPop: number, urbanPop: number, cellsCount: number, citiesCount: number) {
  await supabase
    .from('territories')
    .update({
      total_rural_population: ruralPop,
      total_urban_population: urbanPop,
      cells_owned_count: cellsCount,
      cities_owned_count: citiesCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', territory_id);
}

// Produção por células
function computeProductionFromCells(cells: Cell[], cityCount: number, laws: Law[], stability: number) {
  let baseFood = 0, baseMinerals = 0, baseEnergy = 0, baseTech = 0, baseInfluence = 0;

  for (const c of cells || []) {
    const nodes = c.resource_nodes || [];
    const fertility = c.fertility || 0;
    const hab = c.habitability || 0;
    const mineral = c.mineral_richness || 0;
    const energyPot = c.energy_potential || 0;
    const urbanPull = c.urbanization_pull || 0;

    const ruralActive = (c.rural_population || 0) * 0.6;
    const urbanActive = (c.urban_population || 0) * 0.6;

    baseFood += ruralActive * (fertility * 0.0005 + nodeRichness(nodes, 'food') * 0.0004);
    baseMinerals += (ruralActive * 0.0002 + urbanActive * 0.0001) * (mineral * 1 + nodeRichness(nodes, 'minerals'));
    baseEnergy += (urbanActive * 0.00015) * (energyPot * 1 + nodeRichness(nodes, 'energy')) + cityCount * 2;
    baseTech += (urbanActive * 0.00012) * (urbanPull * 1 + nodeRichness(nodes, 'technology')) * (clamp(hab, 0.3, 1));
    baseInfluence += (urbanActive * 0.00005) * (0.8 + (cityCount * 0.02));
  }

  const lawBonus = computeLawBonus(laws);
  const stabilityFactor = 0.6 + (stability || 50) / 100 * 0.8;

  const prodFood = baseFood * (1 + lawBonus.food) * stabilityFactor;
  const prodEnergy = baseEnergy * (1 + lawBonus.energy) * stabilityFactor;
  const prodMinerals = baseMinerals * (1 + lawBonus.minerals) * stabilityFactor;
  const prodTech = baseTech * (1 + lawBonus.tech) * stabilityFactor;

  // Popularidade rural/urbana derivada das leis (influencia estabilidade depois)
  const ruralBias = laws.reduce((sum: number, l: Law) => sum + (l.rural_popularity || 0) * 0.01, 0);
  const urbanBias = laws.reduce((sum: number, l: Law) => sum + (l.urban_popularity || 0) * 0.01, 0);

  return { prodFood, prodEnergy, prodMinerals, prodTech, ruralBias, urbanBias };
}

// Capacidade de armazém e descarte
async function applyWarehouseCapacity(supabase: Supa, territory_id: string, rb: any, food: number, energy: number, minerals: number, tech: number) {
  const capacity = rb?.capacity_total || 10000;
  const totalStocks = food + energy + minerals + tech;
  let overflowLost = 0;

  if (totalStocks > capacity) {
    const overflow = totalStocks - capacity;
    const ratio = capacity / totalStocks;
    food *= ratio; energy *= ratio; minerals *= ratio; tech *= ratio;
    overflowLost = overflow;
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Armazém Cheio',
      description: `Excesso descartado: ${Math.round(overflow)}`,
      effects: { overflow, capacity },
    });
  }

  return { food, energy, minerals, tech, overflowLost };
}

// Consumo por tick
function computeConsumption(totalPop: number, cityCount: number, hasResearch: boolean) {
  const foodConsumption = totalPop * 0.001;
  const energyConsumption = totalPop * 0.0006 + cityCount * 30;
  const techConsumption = hasResearch ? (10 + 2) : 0; // level factor simples
  return { foodConsumption, energyConsumption, techConsumption };
}

// Crises e clamp
async function handleCrisesAndClamp(supabase: Supa, territory_id: string, vals: { food: number; energy: number; minerals: number; tech: number }) {
  let { food, energy, minerals, tech } = vals;
  let crisisFood = false, crisisEnergy = false, crisisMinerals = false, crisisTech = false;

  if (food < 0) {
    crisisFood = true;
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Crise Alimentar',
      description: 'Falta de alimento para a população',
    });
  }
  if (energy < 0) {
    crisisEnergy = true;
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Crise Energética',
      description: 'Apagão e queda de produção prevista',
    });
  }
  if (minerals < 0) {
    crisisMinerals = true;
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Gargalo Mineral',
      description: 'Expansão/infra bloqueadas',
    });
  }
  if (tech < 0) {
    crisisTech = true;
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Estagnação Tecnológica',
      description: 'Pesquisa travada por falta de tecnologia',
    });
  }

  food = Math.max(0, food);
  energy = Math.max(0, energy);
  minerals = Math.max(0, minerals);
  tech = Math.max(0, tech);

  return { food, energy, minerals, tech, crisisFood, crisisEnergy, crisisMinerals, crisisTech };
}

// Crescimento e urbanização por célula
async function updateCellGrowth(supabase: Supa, cells: Cell[], stability: number, crisisFood: boolean, crisisEnergy: boolean) {
  const GROWTH_BASE = 0.002;
  let growthSum = 0;

  for (const c of cells || []) {
    const cellTotal = (c.rural_population || 0) + (c.urban_population || 0);
    let growth = cellTotal * GROWTH_BASE * (c.habitability || 0.5) * (0.5 + (stability || 50) / 100);
    if (crisisFood || crisisEnergy) growth *= -0.5;

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

  return growthSum;
}

// Migração líquida e ajuste de população do Estado
async function applyMigration(supabase: Supa, territory_id: string, urbanPop: number, ruralPop: number, totalPop: number, surplusFood: number, surplusEnergy: number, hasResearch: boolean, crisisFood: boolean, crisisEnergy: boolean) {
  let attractiveness = (await supabase.from('territories').select('stability').eq('id', territory_id).maybeSingle()).data?.stability || 50;
  attractiveness += surplusFood > 0 ? 2 : -2;
  attractiveness += surplusEnergy > 0 ? 2 : -2;
  attractiveness += hasResearch ? 1 : 0;
  if (crisisFood) attractiveness -= 6;
  if (crisisEnergy) attractiveness -= 4;

  const migrationCap = totalPop * 0.002;
  const migrationNet = clamp(Math.round((attractiveness - 50) / 50 * migrationCap), -migrationCap, migrationCap);

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

  return { migrationNet, newUrbanPop, newRuralPop };
}

// Estabilidade
async function applyStability(supabase: Supa, territory_id: string, stability: number, surplusFood: number, surplusEnergy: number, crisisFood: boolean, crisisEnergy: boolean, ruralBias: number, urbanBias: number) {
  let stabilityDelta = 0;
  if (surplusFood > 0) stabilityDelta += 2;
  if (surplusEnergy > 0) stabilityDelta += 2;
  if (crisisFood) stabilityDelta -= 10;
  if (crisisEnergy) stabilityDelta -= 7;
  stabilityDelta += Math.round(ruralBias + urbanBias);

  const newStability = clamp((stability || 50) + stabilityDelta, 0, 100);
  await supabase
    .from('territories')
    .update({ stability: newStability, updated_at: new Date().toISOString() })
    .eq('id', territory_id);

  return newStability;
}

// Atualiza armazém
async function updateResourceBalances(supabase: Supa, territory_id: string, vals: { food: number; energy: number; minerals: number; tech: number }, tickNumber: number) {
  await supabase
    .from('resource_balances')
    .update({
      food: Math.round(vals.food),
      energy: Math.round(vals.energy),
      minerals: Math.round(vals.minerals),
      tech: Math.round(vals.tech),
      tick_number: tickNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('territory_id', territory_id);
}

// Execução automática do mercado
async function processMarketAutoExecution(supabase: Supa) {
  const { data: openListings } = await supabase
    .from('market_listings')
    .select('*')
    .eq('status', 'open');
  let tradesExecuted = 0;

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

  return tradesExecuted;
}

// Registra tick e atualiza world_config
async function finalizeTick(supabase: Supa, nextTickNumber: number, started_at: string, summary: any, config: any) {
  await supabase
    .from('tick_logs')
    .insert({
      id: crypto.randomUUID(),
      tick_number: nextTickNumber,
      started_at,
      status: 'completed',
      completed_at: new Date().toISOString(),
      territories_processed: summary.territories_processed,
      cities_processed: summary.cities_processed,
      events_generated: summary.events_generated,
      summary,
    });

  await supabase
    .from('world_config')
    .update({
      last_tick_at: new Date().toISOString(),
      total_ticks: (config?.total_ticks || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .neq('id', '');
}

// Entry point
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await authenticateAdmin(req, supabase);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: auth.status,
      });
    }

    const { config, nextTickNumber, started_at } = await getConfigAndTick(supabase);

    // Pré: processa construções
    await processConstructionQueue(supabase);

    // Leis ativas
    const lawsByTerritory = await loadEnactedLawsByTerritory(supabase);

    // Estados
    const { data: territories } = await supabase
      .from('territories')
      .select('id, stability, level, vocation, pd_points, pi_points, capital_city_id');

    let territoriesProcessed = 0;
    let citiesProcessed = 0;
    let eventsGenerated = 0;
    const perStateSnapshots: any[] = [];

    for (const t of (territories || []) as Territory[]) {
      const territory_id = t.id;

      // Agregação
      const { cells, ruralPop, urbanPop, totalPop, cityCount } = await aggregateTerritory(supabase, territory_id);
      citiesProcessed += cityCount;

      // Salva agregados
      await applyAggregatesToTerritory(supabase, territory_id, ruralPop, urbanPop, cells.length, cityCount);

      // Produção
      const laws = lawsByTerritory.get(territory_id) || [];
      const { prodFood, prodEnergy, prodMinerals, prodTech, ruralBias, urbanBias } =
        computeProductionFromCells(cells, cityCount, laws, t.stability || 50);

      // Armazém atual
      const { data: rb } = await supabase
        .from('resource_balances')
        .select('*')
        .eq('territory_id', territory_id)
        .maybeSingle();

      let newFood = (rb?.food || 0) + prodFood;
      let newEnergy = (rb?.energy || 0) + prodEnergy;
      let newMinerals = (rb?.minerals || 0) + prodMinerals;
      let newTech = (rb?.tech || 0) + prodTech;

      // Capacidade
      const capRes = await applyWarehouseCapacity(supabase, territory_id, rb, newFood, newEnergy, newMinerals, newTech);
      newFood = capRes.food; newEnergy = capRes.energy; newMinerals = capRes.minerals; newTech = capRes.tech;
      const overflowLost = Math.round(capRes.overflowLost);
      if (overflowLost > 0) eventsGenerated++;

      // Consumo
      const { data: rq } = await supabase
        .from('territory_research_queue')
        .select('id, queue_position')
        .eq('territory_id', territory_id)
        .order('queue_position', { ascending: true })
        .limit(1);
      const hasResearch = (rq || []).length > 0;

      const { foodConsumption, energyConsumption, techConsumption } = computeConsumption(totalPop, cityCount, hasResearch);

      newFood -= foodConsumption;
      newEnergy -= energyConsumption;
      newTech -= techConsumption;

      // Crises
      const crisis = await handleCrisesAndClamp(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech });
      newFood = crisis.food; newEnergy = crisis.energy; newMinerals = crisis.minerals; newTech = crisis.tech;
      if (crisis.crisisFood || crisis.crisisEnergy || crisis.crisisMinerals || crisis.crisisTech) eventsGenerated++;

      // Crescimento
      await updateCellGrowth(supabase, cells, t.stability || 50, crisis.crisisFood, crisis.crisisEnergy);

      // Migração
      const surplusFood = newFood - foodConsumption;
      const surplusEnergy = newEnergy - energyConsumption;
      const mig = await applyMigration(supabase, territory_id, urbanPop, ruralPop, totalPop, surplusFood, surplusEnergy, hasResearch, crisis.crisisFood, crisis.crisisEnergy);

      // Estabilidade
      const newStability = await applyStability(supabase, territory_id, t.stability || 50, surplusFood, surplusEnergy, crisis.crisisFood, crisis.crisisEnergy, ruralBias, urbanBias);

      // Atualiza armazém
      await updateResourceBalances(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech }, nextTickNumber);

      territoriesProcessed++;

      // Snapshot
      perStateSnapshots.push({
        territory_id,
        prod: { food: Math.round(prodFood), energy: Math.round(prodEnergy), minerals: Math.round(prodMinerals), tech: Math.round(prodTech) },
        cons: { food: Math.round(foodConsumption), energy: Math.round(energyConsumption), tech: Math.round(techConsumption) },
        crises: { food: crisis.crisisFood, energy: crisis.crisisEnergy, minerals: crisis.crisisMinerals, tech: crisis.crisisTech },
        migration_net: mig.migrationNet,
        stability_after: newStability,
        overflow_lost: overflowLost,
      });
    }

    // Mercado
    const tradesExecuted = await processMarketAutoExecution(supabase);

    // Summary e finalize
    const summary = {
      per_state: perStateSnapshots,
      trades_executed: tradesExecuted,
      tick_interval_hours: config?.tick_interval_hours ?? 24,
      territories_processed: territoriesProcessed,
      cities_processed: citiesProcessed,
      events_generated: eventsGenerated,
    };

    await finalizeTick(supabase, nextTickNumber, started_at, summary, config);

    return new Response(JSON.stringify({ success: true, tick_number: nextTickNumber, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});