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

export const TOTAL_CELLS = 64272;
export const CELL_AREA_KM2 = 5000;
export const GLOBAL_DENSITY = 34.2; // hab/km²
export const BASE_URBAN_RATIO = 0.20;

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
  // Centered noise around 0, scaled
  return (rnd() - 0.5) * 2 * amplitude;
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

  // Base population from density and area, modulated by attributes
  const basePop = GLOBAL_DENSITY * CELL_AREA_KM2;
  const attributeFactor = clamp((habitability * 0.6 + fertility * 0.4), 0.3, 1.8);
  const typeFactor = isUrban ? 4.0 : 1.0; // urban much denser
  const population_total = Math.round(basePop * attributeFactor * typeFactor);

  // Urban/rural split
  const urban_share = isUrban ? clamp(0.75 + noise(rnd, 0.1), 0.60, 0.90) : clamp(0.10 + noise(rnd, 0.05), 0.02, 0.25);
  const rural_share = clamp(1 - urban_share, 0.1, 0.98);
  const population_urban = Math.round(population_total * urban_share);
  const population_rural = Math.max(0, population_total - population_urban);

  // Resource capacities derived from attributes and type
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

    rural_share: Number(rural_share.toFixed(2)),
    urban_share: Number(urban_share.toFixed(2)),

    resource_nodes: {
      food_capacity,
      energy_capacity,
      minerals_capacity,
      tech_capacity,
      influence_capacity,
    },
  };
}