import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RegionSeed = { id?: string; name: string; description?: string | null };

function xorshift32(seed: number) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) / 0xFFFFFFFF);
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Auth requerido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Sessão inválida" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check admin role
    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ success: false, error: "Acesso negado (DEV only)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Fetch world config
    const { data: config } = await supabase.from('world_config').select('*').limit(1).maybeSingle();
    if (!config) {
      return new Response(JSON.stringify({ success: false, error: "world_config ausente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const TOTAL_CELLS = config.total_cells_land || 64272;
    const CELL_AREA = config.cell_size_km2_default || 5000;
    const TOTAL_POP = config.total_planet_population || 11000000000;

    // 1) Archive/delete old cells and cities (DEV reset)
    await supabase.from('cell_cities').delete().neq('id', ''); // remove links
    await supabase.from('cities').delete().neq('id', '');
    await supabase.from('cells').delete().neq('id', '');

    // 2) Recreate 10–14 base regions
    const regionCount = 12;
    const regions: RegionSeed[] = Array.from({ length: regionCount }).map((_, i) => ({
      name: `Região ${i + 1}`,
      description: `Região-base ${i + 1} gerada pelo reset DEV`,
    }));
    await supabase.from('regions').delete().neq('id', '');
    const { data: newRegions, error: regionsError } = await supabase.from('regions').insert(regions).select('id, name');
    if (regionsError) {
      return new Response(JSON.stringify({ success: false, error: `Erro regiões: ${regionsError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    const regionIds = (newRegions || []).map((r: any) => r.id);

    // 3) Regenerate 64,272 cells with deterministic seed
    const rng = xorshift32(42);
    const cellsBatchSize = 1000;
    let totalGeneratedPop = 0;
    const pendingCells: any[] = [];

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const regionIndex = Math.floor((i / TOTAL_CELLS) * regionIds.length);
      const region_id = regionIds[regionIndex];

      const fertility = clamp01(rng() * 0.9 + 0.05);
      const habitability = clamp01(rng() * 0.85 + 0.1);
      const mineral_richness = clamp01(rng() * 0.9);
      const energy_potential = clamp01(rng() * 0.9);
      const urbanization_pull = clamp01(rng() * 0.8);

      const rural_share = clamp01(0.5 + (fertility - urbanization_pull) * 0.3);
      const urban_share = clamp01(1 - rural_share);

      const baseDensity = 20 + rng() * 50; // 20..70 hab/km2
      const population_density = baseDensity * (0.7 + habitability * 0.6); // tuned by habitability

      const popTotal = Math.round(population_density * CELL_AREA);
      const rural_population = Math.round(popTotal * rural_share);
      const urban_population = Math.max(0, popTotal - rural_population);
      totalGeneratedPop += popTotal;

      const resource_nodes = [
        { type: 'food', richness: Number((fertility * 0.8 + rng() * 0.2).toFixed(3)) },
        { type: 'minerals', richness: Number((mineral_richness * 0.8 + rng() * 0.2).toFixed(3)) },
        { type: 'energy', richness: Number((energy_potential * 0.8 + rng() * 0.2).toFixed(3)) },
        { type: 'technology', richness: Number((urbanization_pull * 0.7 + rng() * 0.3).toFixed(3)) },
      ];

      const is_urban_eligible = urbanization_pull > 0.5;

      pendingCells.push({
        area_km2: CELL_AREA,
        cell_type: 'neutral',
        created_at: new Date().toISOString(),
        has_city: false,
        is_urban_eligible,
        owner_territory_id: null,
        population_density: Number(population_density.toFixed(3)),
        region_id,
        resource_energy: 0,
        resource_food: 0,
        resource_influence: 0,
        resource_minerals: 0,
        resource_tech: 0,
        rural_population,
        status: 'explored',
        urban_population,
        fertility,
        habitability,
        mineral_richness,
        energy_potential,
        urbanization_pull,
        rural_share,
        urban_share,
        resource_nodes,
        updated_at: new Date().toISOString(),
      });

      if (pendingCells.length >= cellsBatchSize) {
        const { error: insertError } = await supabase.from('cells').insert(pendingCells);
        if (insertError) {
          return new Response(JSON.stringify({ success: false, error: `Erro inserindo células: ${insertError.message}` }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
        pendingCells.length = 0;
      }
    }

    if (pendingCells.length > 0) {
      const { error: insertError } = await supabase.from('cells').insert(pendingCells);
      if (insertError) {
        return new Response(JSON.stringify({ success: false, error: `Erro inserindo células: ${insertError.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // 4) Rebalance to exact 11,000,000,000
    const scaleRatio = TOTAL_POP / totalGeneratedPop;
    // Update populations in chunks
    let { data: allCells } = await supbaseChunkSelect(supabase, 'cells', ['id', 'rural_population', 'urban_population']);
    const updates: any[] = [];
    for (const c of allCells || []) {
      const rural = Math.round((c.rural_population || 0) * scaleRatio);
      const urban = Math.round((c.urban_population || 0) * scaleRatio);
      updates.push({ id: c.id, rural_population: rural, urban_population: urban, updated_at: new Date().toISOString() });
      if (updates.length >= 1000) {
        await supabase.from('cells').upsert(updates);
        updates.length = 0;
      }
    }
    if (updates.length > 0) {
      await supabase.from('cells').upsert(updates);
    }

    // 5) Backfill warehouses (resource_balances) for territories
    const { data: territories } = await supabase.from('territories').select('id');
    if (territories && territories.length > 0) {
      for (const t of territories) {
        const { data: rb } = await supabase.from('resource_balances').select('id').eq('territory_id', t.id).maybeSingle();
        if (!rb) {
          await supabase.from('resource_balances').insert({
            territory_id: t.id,
            food: 200,
            energy: 200,
            minerals: 200,
            tech: 200,
            capacity_total: 10000,
            tick_number: 0,
            updated_at: new Date().toISOString(),
          });
        } else {
          // ensure capacity exists
          await supabase.from('resource_balances').update({ capacity_total: 10000, updated_at: new Date().toISOString() }).eq('territory_id', t.id);
        }
      }
    }

    // 6) Recalculate aggregates for territories
    if (territories && territories.length > 0) {
      for (const t of territories) {
        const { data: ownedCells } = await supabase
          .from('cells')
          .select('id, rural_population, urban_population')
          .eq('owner_territory_id', t.id);
        const { data: ownedCities } = await supabase
          .from('cities')
          .select('id')
          .eq('owner_territory_id', t.id);

        const cellsCount = ownedCells?.length || 0;
        const citiesCount = ownedCities?.length || 0;
        const ruralSum = (ownedCells || []).reduce((sum: number, c: any) => sum + (c.rural_population || 0), 0);
        const urbanSum = (ownedCells || []).reduce((sum: number, c: any) => sum + (c.urban_population || 0), 0);

        await supabase
          .from('territories')
          .update({
            cells_owned_count: cellsCount,
            cities_owned_count: citiesCount,
            total_rural_population: ruralSum,
            total_urban_population: urbanSum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', t.id);
      }
    }

    // 7) Update world_config density hint (not stored separately; calculation for UI)
    await supabase
      .from('world_config')
      .update({ updated_at: new Date().toISOString() })
      .neq('id', '');

    return new Response(JSON.stringify({ success: true, message: 'Reset planet concluído', total_cells: TOTAL_CELLS }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('[reset-planet-dev] error', error);
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper to select large tables in chunks
async function supbaseChunkSelect(supabase: any, table: string, cols: string[]) {
  const chunkSize = 2000;
  let from = 0;
  let done = false;
  const all: any[] = [];
  while (!done) {
    const { data, error, count } = await supabase
      .from(table)
      .select(cols.join(','), { count: 'exact' })
      .range(from, from + chunkSize - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      all.push(...data);
      from += chunkSize;
      if (count && from >= count) done = true;
    } else {
      done = true;
    }
  }
  return { data: all };
}