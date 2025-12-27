export type Climate =
  | 'arid'
  | 'temperate'
  | 'tropical'
  | 'polar'
  | 'oceanic'
  | 'highland'
  | 'anomaly';

export interface RegionConfig {
  id: string;
  name: string;
  climate: Climate;
  fertility_base: number;      // 0.3..1.7
  habitability_base: number;   // 0.2..1.4
  mineral_base: number;        // 0.3..1.7
  energy_base: number;         // 0.3..1.7
  urbanization_pull: number;   // 0.6..1.7
  weight: number;              // spawn prob weight
}

export interface GeneratedCell {
  id: number;
  km2: number;                          // 5,000
  region_id: string;
  region_name: string;
  climate: Climate;
  type: 'rural' | 'urban';
  status: 'free';
  owner_state_id: null;

  fertility: number;                    // 0.2..2.0
  habitability: number;                 // 0.2..2.0
  mineral_richness: number;             // 0.2..2.0
  energy_potential: number;             // 0.2..2.0

  population_total: number;
  population_rural: number;
  population_urban: number;

  rural_share: number;
  urban_share: number;

  resource_nodes: {
    food_capacity: number;
    energy_capacity: number;
    minerals_capacity: number;
    tech_capacity: number;
    influence_capacity: number;
  };
}

export interface RegionAggregate {
  region_id: string;
  region_name: string;
  climate: Climate;
  urban_cells: number;
  rural_cells: number;
  total_population: number;
  urban_population: number;
  rural_population: number;
}

export const TOTAL_CELLS = 64272;
export const CELL_AREA_KM2 = 5000;
export const GLOBAL_DENSITY = 34.2; // hab/km²
export const BASE_URBAN_RATIO = 0.20;
export const TOTAL_POPULATION_TARGET = 11_000_000_000;

// Deterministic PRNG (Mulberry32)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// String to numeric seed
function seedStringToInt(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
function randRange(rnd: () => number, min: number, max: number) {
  return min + rnd() * (max - min);
}

export const regions: RegionConfig[] = [
  // Tropical & Temperate: mais fertility e urbanization_pull
  { id: 'region-1',  name: 'Selvas Equatoriais', climate: 'tropical', fertility_base: 1.5, habitability_base: 1.2, mineral_base: 0.9, energy_base: 1.0, urbanization_pull: 1.4, weight: 0.18 },
  { id: 'region-2',  name: 'Planícies Temperadas', climate: 'temperate', fertility_base: 1.3, habitability_base: 1.3, mineral_base: 1.0, energy_base: 1.0, urbanization_pull: 1.3, weight: 0.20 },

  // Arid: menos fertility, mais energy
  { id: 'region-3',  name: 'Desertos Centrais', climate: 'arid', fertility_base: 0.6, habitability_base: 0.8, mineral_base: 1.1, energy_base: 1.4, urbanization_pull: 0.8, weight: 0.12 },

  // Highland: mais minerais, menos habitability
  { id: 'region-4',  name: 'Cordilheiras Altas', climate: 'highland', fertility_base: 0.9, habitability_base: 0.6, mineral_base: 1.5, energy_base: 1.0, urbanization_pull: 0.9, weight: 0.10 },

  // Polar: baixa habitability, energy moderada
  { id: 'region-5',  name: 'Terras Polares Norte', climate: 'polar', fertility_base: 0.5, habitability_base: 0.5, mineral_base: 1.1, energy_base: 1.1, urbanization_pull: 0.7, weight: 0.05 },
  { id: 'region-6',  name: 'Terras Polares Sul', climate: 'polar', fertility_base: 0.5, habitability_base: 0.5, mineral_base: 1.0, energy_base: 1.1, urbanization_pull: 0.7, weight: 0.03 },

  // Oceanic: moderado geral
  { id: 'region-7',  name: 'Costas Oceânicas', climate: 'oceanic', fertility_base: 1.1, habitability_base: 1.2, mineral_base: 0.9, energy_base: 1.0, urbanization_pull: 1.2, weight: 0.12 },

  // Highland temperate mix
  { id: 'region-8',  name: 'Altiplanos Temperados', climate: 'highland', fertility_base: 1.0, habitability_base: 0.8, mineral_base: 1.4, energy_base: 1.0, urbanization_pull: 1.0, weight: 0.08 },

  // Additional temperate & tropical variants
  { id: 'region-9',  name: 'Vales Fluviais', climate: 'temperate', fertility_base: 1.4, habitability_base: 1.3, mineral_base: 1.0, energy_base: 1.0, urbanization_pull: 1.4, weight: 0.10 },
  { id: 'region-10', name: 'Arquipélagos Tropicais', climate: 'tropical', fertility_base: 1.5, habitability_base: 1.2, mineral_base: 0.9, energy_base: 1.1, urbanization_pull: 1.5, weight: 0.08 },

  // Anomaly: extremos raros
  { id: 'region-11', name: 'Zonas de Anomalia', climate: 'anomaly', fertility_base: 1.2, habitability_base: 0.9, mineral_base: 1.6, energy_base: 1.6, urbanization_pull: 1.1, weight: 0.03 },

  // Oceanic deep temperate coast
  { id: 'region-12', name: 'Fjords & Penínsulas', climate: 'oceanic', fertility_base: 1.0, habitability_base: 1.1, mineral_base: 1.1, energy_base: 1.0, urbanization_pull: 1.1, weight: 0.03 },
];

// Precompute cumulative weights
const cumulativeWeights = (() => {
  const arr: number[] = [];
  let sum = 0;
  for (const r of regions) {
    sum += r.weight;
    arr.push(sum);
  }
  // Normalize if not exactly 1
  if (sum !== 1) {
    for (let i = 0; i < arr.length; i++) arr[i] = arr[i] / sum;
  }
  return arr;
})();

function pickRegion(rnd: () => number): RegionConfig {
  const roll = rnd();
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (roll <= cumulativeWeights[i]) return regions[i];
  }
  return regions[regions.length - 1];
}

function noise(rnd: () => number, amplitude = 0.35) {
  return (rnd() - 0.5) * 2 * amplitude;
}

function computeSharesForRuralCell(
  rnd: () => number,
  fertility: number,
  regionUrbanPull: number
) {
  const ruralMid = 0.765; // mid of 0.65..0.88
  const base =
    ruralMid +
    0.10 * (fertility - 1.0) - // mais fertility -> mais rural
    0.10 * (regionUrbanPull - 1.0); // mais pull -> menos rural

  const variation = randRange(rnd, 0.90, 1.10);
  let rural = clamp(base * variation, 0.65, 0.88);
  const urban = clamp(1 - rural, 0.12, 0.35);
  // Normalize
  rural = clamp(1 - urban, 0.65, 0.88);
  return { rural_share: Number(rural.toFixed(2)), urban_share: Number((1 - rural).toFixed(2)) };
}

function computeSharesForUrbanCell(
  rnd: () => number,
  fertility: number,
  regionUrbanPull: number
) {
  const urbanMid = 0.575; // mid of 0.45..0.70
  const base =
    urbanMid +
    0.12 * (regionUrbanPull - 1.0) - // mais pull -> mais urbano
    0.08 * (fertility - 1.0); // mais fertility -> menos urbano

  const variation = randRange(rnd, 0.90, 1.10);
  let urban = clamp(base * variation, 0.45, 0.70);
  const rural = clamp(1 - urban, 0.30, 0.55);
  // Normalize
  urban = clamp(1 - rural, 0.45, 0.70);
  return { rural_share: Number((1 - urban).toFixed(2)), urban_share: Number(urban.toFixed(2)) };
}

export function generateCell(id: number, seedGlobal: string): GeneratedCell {
  const numericSeed = seedStringToInt(`${seedGlobal}-${id}`);
  const rnd = mulberry32(numericSeed);

  const region = pickRegion(rnd);

  // Urban probability scaled by region pull
  let urbanProb = BASE_URBAN_RATIO * region.urbanization_pull;
  urbanProb = clamp(urbanProb, 0.05, 0.45); // clamp for coherence

  const isUrban = rnd() < urbanProb;
  const type: 'rural' | 'urban' = isUrban ? 'urban' : 'rural';

  // Attributes with region bases + noise, clamped 0.2..2.0
  const fertility = clamp(region.fertility_base + noise(rnd, 0.4), 0.2, 2.0);
  const habitability = clamp(region.habitability_base + noise(rnd, 0.3), 0.2, 2.0);
  const mineral_richness = clamp(region.mineral_base + noise(rnd, 0.45), 0.2, 2.0);
  const energy_potential = clamp(region.energy_base + noise(rnd, 0.4), 0.2, 2.0);

  // 1) densidade_base_celula = densidade_media * habitability * (0.85..1.25 por seed)
  const densidadeBase = GLOBAL_DENSITY * habitability * randRange(rnd, 0.85, 1.25);

  // 2) population_total_cell = round(densidade_base_celula * cell_size_km2)
  const population_total = Math.round(densidadeBase * CELL_AREA_KM2);

  // 3) shares conforme tipo, fertility e urbanization_pull, com variação 0.90..1.10
  const shares = isUrban
    ? computeSharesForUrbanCell(rnd, fertility, region.urbanization_pull)
    : computeSharesForRuralCell(rnd, fertility, region.urbanization_pull);

  const rural_share = shares.rural_share;
  const urban_share = Number((1 - rural_share).toFixed(2));

  const population_rural = Math.round(population_total * rural_share);
  const population_urban = population_total - population_rural;

  // Resource capacities derivadas dos atributos e tipo
  const food_capacity = Math.round(100 * fertility * (isUrban ? 0.6 : 1.2));
  const energy_capacity = Math.round(100 * energy_potential * (isUrban ? 1.1 : 0.9));
  const minerals_capacity = Math.round(100 * mineral_richness * (isUrban ? 0.8 : 1.2));
  const tech_capacity = Math.round(100 * (isUrban ? habitability * 1.3 : habitability * 0.4));
  const influence_capacity = Math.round(100 * (isUrban ? habitability * 1.2 : habitability * 0.3));

  return {
    id,
    km2: CELL_AREA_KM2,
    region_id: region.id,
    region_name: region.name,
    climate: region.climate,
    type,
    status: 'free',
    owner_state_id: null,

    fertility: Number(fertility.toFixed(2)),
    habitability: Number(habitability.toFixed(2)),
    mineral_richness: Number(mineral_richness.toFixed(2)),
    energy_potential: Number(energy_potential.toFixed(2)),

    population_total,
    population_rural,
    population_urban,

    rural_share,
    urban_share,

    resource_nodes: {
      food_capacity,
      energy_capacity,
      minerals_capacity,
      tech_capacity,
      influence_capacity,
    },
  };
}

// Gera todas as células e rebalança para somar exatamente TOTAL_POPULATION_TARGET
export function generateAllCellsRebalanced(seedGlobal: string) {
  const cells: GeneratedCell[] = [];
  for (let id = 1; id <= TOTAL_CELLS; id++) {
    cells.push(generateCell(id, seedGlobal));
  }

  // Soma atual
  let currentTotal = cells.reduce((sum, c) => sum + c.population_total, 0);
  const diff = TOTAL_POPULATION_TARGET - currentTotal;

  if (diff === 0) {
    return cells;
  }

  // Pesos para ajuste:
  // - Se adicionar população (diff > 0): peso = habitability * region.urbanization_pull
  // - Se remover população (diff < 0): peso = habitability * region.urbanization_pull * population_total
  const regionMap = new Map<string, RegionConfig>();
  for (const r of regions) regionMap.set(r.id, r);

  const weights = cells.map((c) => {
    const reg = regionMap.get(c.region_id)!;
    const baseW = c.habitability * reg.urbanization_pull;
    return diff > 0 ? baseW : baseW * c.population_total;
  });

  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) {
    return cells;
  }

  // Alocação proporcional inteira com correção pelo resto
  const raw = weights.map((w) => (diff > 0 ? (diff * w) / weightSum : ((-diff) * w) / weightSum));
  const ints = raw.map((x) => Math.floor(x));
  let remainder = (diff > 0 ? diff : -diff) - ints.reduce((s, v) => s + v, 0);

  const fracIdx = raw.map((x, i) => ({ i, frac: x - Math.floor(x) }));
  fracIdx.sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remainder; k++) {
    ints[fracIdx[k].i] += 1;
  }

  // Aplica ajustes
  for (let i = 0; i < cells.length; i++) {
    const delta = diff > 0 ? ints[i] : -ints[i];
    const newTotal = Math.max(0, cells[i].population_total + delta);
    cells[i].population_total = newTotal;

    // Recalcular rural/urban mantendo shares
    const rural = Math.round(newTotal * cells[i].rural_share);
    const urban = newTotal - rural;
    cells[i].population_rural = rural;
    cells[i].population_urban = urban;
  }

  // Garantir soma exata após arredondamentos
  currentTotal = cells.reduce((sum, c) => sum + c.population_total, 0);
  const finalDiff = TOTAL_POPULATION_TARGET - currentTotal;
  if (finalDiff !== 0) {
    // Ajusta 1 por célula em ordem de maior habitabilidade, determinístico
    const order = cells
      .map((c, idx) => ({ idx, score: c.habitability }))
      .sort((a, b) => b.score - a.score || a.idx - b.idx);
    let rem = Math.abs(finalDiff);
    for (let k = 0; k < order.length && rem > 0; k++) {
      const idx = order[k].idx;
      const cell = cells[idx];
      if (finalDiff > 0) {
        cell.population_total += 1;
      } else if (cell.population_total > 0) {
        cell.population_total -= 1;
      }
      cell.population_rural = Math.round(cell.population_total * cell.rural_share);
      cell.population_urban = cell.population_total - cell.population_rural;
      rem--;
    }
  }

  return cells;
}

export function computeRegionTotals(cells: GeneratedCell[]): RegionAggregate[] {
  const byRegion = new Map<string, RegionAggregate>();
  for (const c of cells) {
    let agg = byRegion.get(c.region_id);
    if (!agg) {
      agg = {
        region_id: c.region_id,
        region_name: c.region_name,
        climate: c.climate,
        urban_cells: 0,
        rural_cells: 0,
        total_population: 0,
        urban_population: 0,
        rural_population: 0,
      };
      byRegion.set(c.region_id, agg);
    }
    if (c.type === 'urban') agg.urban_cells += 1;
    else agg.rural_cells += 1;

    agg.total_population += c.population_total;
    agg.urban_population += c.population_urban;
    agg.rural_population += c.population_rural;
  }

  return Array.from(byRegion.values()).sort((a, b) => a.region_name.localeCompare(b.region_name));
}

export function computeGlobalTotals(cells: GeneratedCell[]) {
  const total = cells.reduce((s, c) => s + c.population_total, 0);
  const urban = cells.reduce((s, c) => s + c.population_urban, 0);
  const rural = cells.reduce((s, c) => s + c.population_rural, 0);
  return { total, urban, rural };
}