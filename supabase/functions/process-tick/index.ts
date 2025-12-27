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
function computeConsumption(totalPop: number, cityCount: number, hasResearch: boolean, level: string | null) {
  const foodConsumption = totalPop * 0.001;
  const energyConsumption = totalPop * 0.0006 + cityCount * 30;
  // Level factor: colony=1, autonomous=2, recognized=3, kingdom=4, power=5
  const levelMap: Record<string, number> = { colony: 1, autonomous: 2, recognized: 3, kingdom: 4, power: 5 };
  const lvl = level ? (levelMap[level] ?? 1) : 1;
  const techConsumption = hasResearch ? (10 + lvl * 2) : 0;
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

// Helper: compute attractiveness per requested formula
function computeAttractiveness(stability: number, foodSurplus: number, energySurplus: number, tech: number) {
  const base = stability;
  const foodBonus = Math.min(10, (foodSurplus || 0) / 10000);
  const energyBonus = Math.min(10, (energySurplus || 0) / 10000);
  const techBonus = Math.min(10, (tech || 0) / 5000);
  return base + foodBonus + energyBonus + techBonus;
}

// Global migration redistribution
async function applyGlobalMigrationBalanced(
  supabase: Supa,
  snapshots: Array<{
    territory_id: string;
    totalPop: number;
    ruralPop: number;
    urbanPop: number;
    foodAfter: number;
    energyAfter: number;
    techAfter: number;
    stabilityAfter: number;
    attractiveness: number;
  }>
) {
  if (!snapshots || snapshots.length === 0) return { logs: 0 };

  const avgAttr =
    snapshots.reduce((sum, s) => sum + s.attractiveness, 0) / snapshots.length;

  // Per-territory caps and desired flows
  const lows = [];
  const highs = [];
  let totalOutDesired = 0;
  let totalInDesired = 0;

  for (const s of snapshots) {
    const cap = s.totalPop * 0.002;
    if (s.attractiveness < avgAttr) {
      const pressure = (avgAttr - s.attractiveness) / 10; // scale
      const outDesired = Math.min(cap, Math.round(cap * pressure));
      totalOutDesired += outDesired;
      lows.push({ s, outDesired, cap });
    } else if (s.attractiveness > avgAttr) {
      const pull = (s.attractiveness - avgAttr) / 10;
      const inDesired = Math.min(cap, Math.round(cap * pull));
      totalInDesired += inDesired;
      highs.push({ s, inDesired, cap });
    }
  }

  if (totalOutDesired === 0 || totalInDesired === 0) return { logs: 0 };

  // Normalize incoming to match outgoing mass
  const inScale = totalOutDesired / totalInDesired;
  let eventsLogged = 0;

  // Apply outflows
  for (const item of lows) {
    const outFlow = item.outDesired;
    if (outFlow > 0) {
      const urbanOut = Math.round(outFlow * 0.6);
      const ruralOut = outFlow - urbanOut;
      const newUrban = Math.max(0, item.s.urbanPop - urbanOut);
      const newRural = Math.max(0, item.s.ruralPop - ruralOut);
      await supabase
        .from('territories')
        .update({
          total_urban_population: newUrban,
          total_rural_population: newRural,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.s.territory_id);
      if (outFlow > 5000) {
        await supabase.from('event_logs').insert({
          territory_id: item.s.territory_id,
          event_type: 'global',
          title: 'Migração Saída',
          description: `Saída líquida de ${outFlow.toLocaleString()} habitantes por baixa atratividade`,
        });
        eventsLogged++;
      }
      item.s.urbanPop = newUrban;
      item.s.ruralPop = newRural;
      item.s.totalPop = newUrban + newRural;
    }
  }

  // Apply inflows
  for (const item of highs) {
    const inFlow = Math.round(item.inDesired * inScale);
    if (inFlow > 0) {
      const urbanIn = Math.round(inFlow * 0.6);
      const ruralIn = inFlow - urbanIn;
      const newUrban = item.s.urbanPop + urbanIn;
      const newRural = item.s.ruralPop + ruralIn;
      await supabase
        .from('territories')
        .update({
          total_urban_population: newUrban,
          total_rural_population: newRural,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.s.territory_id);
      if (inFlow > 5000) {
        await supabase.from('event_logs').insert({
          territory_id: item.s.territory_id,
          event_type: 'global',
          title: 'Migração Entrada',
          description: `Entrada líquida de ${inFlow.toLocaleString()} habitantes por alta atratividade`,
        });
        eventsLogged++;
      }
      item.s.urbanPop = newUrban;
      item.s.ruralPop = newRural;
      item.s.totalPop = newUrban + newRural;
    }
  }

  return { logs: eventsLogged };
}

// Tipos para snapshots por território e resultado do tick
type TerritoryTickSnapshot = {
  territory_id: string;
  prod: { food: number; energy: number; minerals: number; tech: number };
  cons: { food: number; energy: number; tech: number };
  crises: { food: boolean; energy: boolean; minerals: boolean; tech: boolean };
  migration_net: number;
  stability_after: number;
  overflow_lost: number;
};

type TerritoryTickResult = {
  snapshot: TerritoryTickSnapshot;
  citiesProcessedDelta: number;
  eventsGeneratedDelta: number;
};

// Processa um único território (modular)
async function processTerritoryTick(
  supabase: Supa,
  t: Territory,
  lawsByTerritory: Map<string, Law[]>,
  nextTickNumber: number
): Promise<TerritoryTickResult> {
  const territory_id = t.id;

  // Agregação
  const { cells, ruralPop, urbanPop, totalPop, cityCount } = await aggregateTerritory(supabase, territory_id);

  // Persistir agregados básicos
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

  // Capacidade de armazém (descarta overflow e loga)
  const capRes = await applyWarehouseCapacity(supabase, territory_id, rb, newFood, newEnergy, newMinerals, newTech);
  newFood = capRes.food; newEnergy = capRes.energy; newMinerals = capRes.minerals; newTech = capRes.tech;
  const overflowLost = Math.round(capRes.overflowLost);
  let eventsGeneratedDelta = overflowLost > 0 ? 1 : 0;

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

  // Crises e clamp
  const crisis = await handleCrisesAndClamp(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech });
  newFood = crisis.food; newEnergy = crisis.energy; newMinerals = crisis.minerals; newTech = crisis.tech;
  if (crisis.crisisFood || crisis.crisisEnergy || crisis.crisisMinerals || crisis.crisisTech) eventsGeneratedDelta++;

  // Crescimento populacional por célula
  await updateCellGrowth(supabase, cells, t.stability || 50, crisis.crisisFood, crisis.crisisEnergy);

  // Migração líquida (por território, conservativa local)
  const surplusFood = newFood - foodConsumption;
  const surplusEnergy = newEnergy - energyConsumption;
  const mig = await applyMigration(
    supabase,
    territory_id,
    urbanPop,
    ruralPop,
    totalPop,
    surplusFood,
    surplusEnergy,
    hasResearch,
    crisis.crisisFood,
    crisis.crisisEnergy
  );

  // Estabilidade
  const newStability = await applyStability(
    supabase,
    territory_id,
    t.stability || 50,
    surplusFood,
    surplusEnergy,
    crisis.crisisFood,
    crisis.crisisEnergy,
    ruralBias,
    urbanBias
  );

  // Atualiza armazém
  await updateResourceBalances(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech }, nextTickNumber);

  // Retornar snapshot e deltas
  const snapshot: TerritoryTickSnapshot = {
    territory_id,
    prod: {
      food: Math.round(prodFood),
      energy: Math.round(prodEnergy),
      minerals: Math.round(prodMinerals),
      tech: Math.round(prodTech),
    },
    cons: {
      food: Math.round(foodConsumption),
      energy: Math.round(energyConsumption),
      tech: Math.round(techConsumption),
    },
    crises: {
      food: crisis.crisisFood,
      energy: crisis.crisisEnergy,
      minerals: crisis.crisisMinerals,
      tech: crisis.crisisTech,
    },
    migration_net: mig.migrationNet,
    stability_after: newStability,
    overflow_lost: overflowLost,
  };

  return {
    snapshot,
    citiesProcessedDelta: cityCount,
    eventsGeneratedDelta,
  };
}

// Transferências atômicas de mercado (usa RPCs existentes)
async function processMarket(supabase: Supa) {
  // Coleta ordens abertas
  const { data: sellOrders } = await supabase
    .from('market_listings')
    .select('*')
    .eq('listing_type', 'sell')
    .in('status', ['open', 'partially_filled']);

  const { data: buyOrders } = await supabase
    .from('market_listings')
    .select('*')
    .eq('listing_type', 'buy')
    .in('status', ['open', 'partially_filled']);

  if (!sellOrders || !buyOrders) return 0;

  // Ordena: sellers por preço crescente, buyers por preço decrescente
  const sells = [...sellOrders].sort((a: any, b: any) => a.price_per_unit - b.price_per_unit);
  const buys = [...buyOrders].sort((a: any, b: any) => b.price_per_unit - a.price_per_unit);

  let tradesExecuted = 0;

  for (const buy of buys) {
    const remainingBuy = Number(buy.quantity) - Number(buy.filled_quantity || 0);
    if (remainingBuy <= 0) continue;

    for (const sell of sells) {
      const remainingSell = Number(sell.quantity) - Number(sell.filled_quantity || 0);
      if (remainingSell <= 0) continue;
      if (sell.resource_type !== buy.resource_type) continue;
      if (sell.price_per_unit > buy.price_per_unit) continue;

      const matchQty = Math.min(remainingBuy, remainingSell);
      if (matchQty <= 0) continue;

      const price = sell.price_per_unit; // executa ao preço do vendedor
      const totalCost = Math.round(matchQty * price);

      // Verifica saldos (comprador: wallet; vendedor: warehouse ou tokens)
      const { data: buyerWallet } = await supabase
        .from('player_wallets')
        .select('balance')
        .eq('user_id', buy.seller_user_id) // buyer_user_id
        .maybeSingle();

      if (!buyerWallet || Number(buyerWallet.balance) < totalCost) {
        continue; // comprador sem saldo
      }

      const isToken = (sell.resource_type || '').startsWith('token_');
      let sellerHas = true;

      if (!isToken) {
        if (!sell.seller_territory_id) continue;
        const { data: rb } = await supabase
          .from('resource_balances')
          .select('food, energy, minerals, tech')
          .eq('territory_id', sell.seller_territory_id)
          .maybeSingle();
        const field = sell.resource_type as 'food' | 'energy' | 'minerals' | 'tech';
        const available = rb ? Number(rb[field] || 0) : 0;
        if (available < matchQty) {
          sellerHas = false;
        }
      } else {
        // Tokens: usa atomic_transfer_tokens (sem verificar manualmente, RPC cuidará)
      }

      if (!sellerHas) continue;

      // Transferências atômicas
      if (isToken) {
        const tokenType = sell.resource_type.replace('token_', '');
        const { error: tokErr } = await supabase.rpc('atomic_transfer_tokens', {
          p_from_user_id: sell.seller_user_id,
          p_to_user_id: buy.seller_user_id,
          p_city_tokens: tokenType === 'city' ? matchQty : 0,
          p_land_tokens: tokenType === 'land' ? matchQty : 0,
          p_state_tokens: tokenType === 'state' ? matchQty : 0,
        });
        if (tokErr) continue;
      } else {
        const { error: resErr } = await supabase.rpc('atomic_transfer_resources', {
          p_from_territory_id: sell.seller_territory_id!,
          p_to_territory_id: buy.seller_territory_id || null, // pode ser null; se for, não transfere (buyer não informou). Ideal: exigir territory_id em ordens de recurso.
          p_food: sell.resource_type === 'food' ? matchQty : 0,
          p_energy: sell.resource_type === 'energy' ? matchQty : 0,
          p_minerals: sell.resource_type === 'minerals' ? matchQty : 0,
          p_tech: sell.resource_type === 'tech' ? matchQty : 0,
        });
        if (resErr) continue;
      }

      const { error: curErr } = await supabase.rpc('atomic_transfer_currency', {
        p_amount: totalCost,
        p_from_user_id: buy.seller_user_id, // buyer
        p_to_user_id: sell.seller_user_id, // seller
      });
      if (curErr) continue;

      // Atualiza ordens
      const newSellFilled = Number(sell.filled_quantity || 0) + matchQty;
      const newBuyFilled = Number(buy.filled_quantity || 0) + matchQty;

      await supabase
        .from('market_listings')
        .update({
          filled_quantity: newSellFilled,
          status: newSellFilled >= Number(sell.quantity) ? 'filled' : 'partially_filled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sell.id);

      await supabase
        .from('market_listings')
        .update({
          filled_quantity: newBuyFilled,
          status: newBuyFilled >= Number(buy.quantity) ? 'filled' : 'partially_filled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', buy.id);

      // Trade history
      await supabase
        .from('trade_history')
        .insert({
          resource_type: sell.resource_type,
          quantity: matchQty,
          price_per_unit: price,
          total_price: totalCost,
          buyer_user_id: buy.seller_user_id,
          seller_user_id: sell.seller_user_id,
          listing_id: sell.id,
        });

      // Event log para trades grandes
      if (totalCost >= 10000) {
        await supabase.from('event_logs').insert({
          event_type: 'global',
          title: 'Trade de Grande Porte',
          description: `Negociados ${matchQty} ${sell.resource_type} por ₮${totalCost.toLocaleString()}`,
        });
      }

      tradesExecuted += 1;
      // Atualiza remainingBuy para parar se preenchido
      if (newBuyFilled >= Number(buy.quantity)) break;
    }
  }

  return tradesExecuted;
}

// Coleta efeitos de infraestrutura (multiplicadores)
async function getInfrastructureModifiers(supabase: Supa, territory_id: string) {
  // Nacionais
  const { data: national } = await (supabase as any)
    .from('infra_national')
    .select('type_key, status, maintenance_active')
    .eq('territory_id', territory_id)
    .eq('status', 'active');

  // Locais
  const { data: local } = await (supabase as any)
    .from('infra_cell')
    .select('type_key, status, cell_id')
    .eq('territory_id', territory_id)
    .eq('status', 'active');

  let foodMult = 1, energyMult = 1, mineralsMult = 1, techMult = 1;
  let wasteReduction = 0, crisisPenaltyReduction = 0;

  // Nacionais
  for (const n of national || []) {
    if (n.type_key === 'science_institute') techMult += 0.15;
    if (n.type_key === 'logistics_net') wasteReduction += 0.5;
    if (n.type_key === 'strategic_reserve') crisisPenaltyReduction += 0.3;
    if (n.type_key === 'planning_agency') {
      foodMult += 0.05; energyMult += 0.05; mineralsMult += 0.05; techMult += 0.05;
    }
  }

  // Locais (cada infra ativa dá bonus por célula; agregado simples)
  const localCounts = new Map<string, number>();
  for (const l of local || []) {
    localCounts.set(l.type_key, (localCounts.get(l.type_key) || 0) + 1);
  }
  foodMult += (localCounts.get('intensive_farm') || 0) * 0.02;
  mineralsMult += (localCounts.get('mining_complex') || 0) * 0.02;
  energyMult += (localCounts.get('power_plant') || 0) * 0.02;
  techMult += (localCounts.get('industrial_park') || 0) * 0.015;

  return { foodMult, energyMult, mineralsMult, techMult, wasteReduction: Math.min(0.8, wasteReduction), crisisPenaltyReduction: Math.min(0.5, crisisPenaltyReduction) };
}

// Manutenção de infraestrutura por tick (pausa se faltar saldo)
async function processInfrastructureMaintenance(supabase: Supa) {
  // Nacionais
  const { data: nationals } = await (supabase as any)
    .from('infra_national')
    .select('id, territory_id, type_key, status, maintenance_active');

  for (const n of nationals || []) {
    if (n.status !== 'active') continue;

    // Busca custos de manutenção do tipo
    const { data: tdef } = await (supabase as any)
      .from('national_infrastructure_types')
      .select('maintenance_energy, maintenance_currency')
      .eq('key', n.type_key)
      .maybeSingle();

    const mEnergy = tdef?.maintenance_energy ?? 5;
    const mCurrency = tdef?.maintenance_currency ?? 10;

    const { data: rb } = await supabase
      .from('resource_balances')
      .select('territory_id, energy')
      .eq('territory_id', n.territory_id)
      .maybeSingle();

    const { data: terr } = await supabase
      .from('territories')
      .select('owner_id')
      .eq('id', n.territory_id)
      .maybeSingle();

    const { data: profile } = terr?.owner_id
      ? await supabase.from('profiles').select('currency').eq('id', terr.owner_id).maybeSingle()
      : { data: null };

    const hasEnergy = rb && Number(rb.energy) >= mEnergy;
    const hasCurrency = profile && Number(profile.currency) >= mCurrency;

    if (hasEnergy && hasCurrency) {
      await supabase
        .from('resource_balances')
        .update({ energy: Number(rb!.energy) - mEnergy, updated_at: new Date().toISOString() })
        .eq('territory_id', n.territory_id);
      await supabase
        .from('profiles')
        .update({ currency: Number(profile!.currency) - mCurrency, updated_at: new Date().toISOString() })
        .eq('id', terr!.owner_id!);
    } else {
      await (supabase as any)
        .from('infra_national')
        .update({ status: 'paused' })
        .eq('id', n.id);
      await supabase.from('event_logs').insert({
        territory_id: n.territory_id,
        event_type: 'global',
        title: 'Infraestrutura Pausada',
        description: `Manutenção insuficiente para ${n.type_key}`,
      });
    }
  }

  // Locais
  const { data: locals } = await (supabase as any)
    .from('infra_cell')
    .select('id, territory_id, type_key, status');

  for (const l of locals || []) {
    if (l.status !== 'active') continue;

    const { data: tdef } = await (supabase as any)
      .from('cell_infrastructure_types')
      .select('maintenance_energy, maintenance_currency')
      .eq('key', l.type_key)
      .maybeSingle();

    const mEnergy = tdef?.maintenance_energy ?? 3;
    const mCurrency = tdef?.maintenance_currency ?? 5;

    const { data: rb } = await supabase
      .from('resource_balances')
      .select('territory_id, energy')
      .eq('territory_id', l.territory_id)
      .maybeSingle();

    const { data: terr } = await supabase
      .from('territories')
      .select('owner_id')
      .eq('id', l.territory_id)
      .maybeSingle();

    const { data: profile } = terr?.owner_id
      ? await supabase.from('profiles').select('currency').eq('id', terr.owner_id).maybeSingle()
      : { data: null };

    const hasEnergy = rb && Number(rb.energy) >= mEnergy;
    const hasCurrency = profile && Number(profile.currency) >= mCurrency;

    if (hasEnergy && hasCurrency) {
      await supabase
        .from('resource_balances')
        .update({ energy: Number(rb!.energy) - mEnergy, updated_at: new Date().toISOString() })
        .eq('territory_id', l.territory_id);
      await supabase
        .from('profiles')
        .update({ currency: Number(profile!.currency) - mCurrency, updated_at: new Date().toISOString() })
        .eq('id', terr!.owner_id!);
    } else {
      await (supabase as any)
        .from('infra_cell')
        .update({ status: 'paused' })
        .eq('id', l.id);
      await supabase.from('event_logs').insert({
        territory_id: l.territory_id,
        event_type: 'global',
        title: 'Infraestrutura Local Pausada',
        description: `Manutenção insuficiente para ${l.type_key}`,
      });
    }
  }
}

// Ajusta computação de produção com modificadores de infraestrutura
function applyInfraModifiers(prod: { food: number; energy: number; minerals: number; tech: number }, mods: { foodMult: number; energyMult: number; mineralsMult: number; techMult: number }) {
  return {
    food: prod.food * mods.foodMult,
    energy: prod.energy * mods.energyMult,
    minerals: prod.minerals * mods.mineralsMult,
    tech: prod.tech * mods.techMult,
  };
}

// Ajusta descarte efetivo por overflow
async function applyWarehouseCapacityWithInfra(supabase: Supa, territory_id: string, rb: any, food: number, energy: number, minerals: number, tech: number, wasteReduction: number) {
  const base = await applyWarehouseCapacity(supabase, territory_id, rb, food, energy, minerals, tech);
  const effectiveLost = Math.round((base.overflowLost || 0) * Math.max(0, 1 - (wasteReduction || 0)));
  if (effectiveLost > 0) {
    await supabase.from('event_logs').insert({
      territory_id,
      event_type: 'global',
      title: 'Overflow Ajustado',
      description: `Perda efetiva reduzida para ${effectiveLost} por rede logística`,
      effects: { original_overflow: base.overflowLost || 0, effective_lost: effectiveLost },
    });
  }
  return { ...base, overflowLost: effectiveLost };
}

// Orquestrador do tick (modular)
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

    // Infra mods
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

    const capRes = await applyWarehouseCapacityWithInfra(supabase, territory_id, rb, newFood, newEnergy, newMinerals, newTech, mods.wasteReduction);
    newFood = capRes.food; newEnergy = capRes.energy; newMinerals = capRes.minerals; newTech = capRes.tech;
    const overflowLost = Math.round(capRes.overflowLost);
    if (overflowLost > 0) eventsGenerated++;

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

    const crisis = await handleCrisesAndClamp(supabase, territory_id, { food: newFood, energy: newEnergy, minerals: newMinerals, tech: newTech });
    // Aplica redução de penalidade de crise por infra estratégica
    const crisisPenaltyAdj = Math.max(0, 1 - (mods.crisisPenaltyReduction || 0));
    if (crisis.crisisFood || crisis.crisisEnergy) {
      eventsGenerated++;
    }

    await updateCellGrowth(supabase, cells, t.stability || 50, crisis.crisisFood, crisis.crisisEnergy);

    const surplusFood = newFood - foodConsumption;
    const surplusEnergy = newEnergy - energyConsumption;

    const mig = await applyMigration(supabase, territory_id, urbanPop, ruralPop, totalPop, surplusFood, surplusEnergy, hasResearch, crisis.crisisFood, crisis.crisisEnergy);

    const newStability = await applyStability(supabase, territory_id, t.stability || 50, surplusFood, surplusEnergy, crisis.crisisFood, crisis.crisisEnergy, ruralBias, urbanBias);

    await updateResourceBalances(supabase, territory_id, { food: Math.max(0, crisis.food), energy: Math.max(0, crisis.energy), minerals: Math.max(0, crisis.minerals), tech: Math.max(0, crisis.tech) }, nextTickNumber);

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

  // Mercado após produção/consumo
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
}

// Entry point (refatorado para usar runTick)
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