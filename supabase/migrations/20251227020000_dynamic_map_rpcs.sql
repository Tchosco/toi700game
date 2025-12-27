-- Aggregation by region (Zoom 1)
CREATE OR REPLACE FUNCTION public.get_region_clusters(
  p_region_id UUID DEFAULT NULL,
  p_type_filter TEXT DEFAULT NULL,           -- 'rural' | 'urban' | 'special' | NULL
  p_status_filter TEXT DEFAULT NULL,         -- 'explored' | 'colonized' | NULL
  p_owner_territory_id UUID DEFAULT NULL     -- filter by owner
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows JSON;
BEGIN
  WITH base AS (
    SELECT 
      c.region_id,
      COUNT(*) AS total_cells,
      SUM(CASE WHEN c.cell_type = 'rural' THEN 1 ELSE 0 END) AS rural_cells,
      SUM(CASE WHEN c.cell_type = 'urban' THEN 1 ELSE 0 END) AS urban_cells,
      SUM(CASE WHEN c.cell_type = 'neutral' THEN 1 ELSE 0 END) AS neutral_cells,
      SUM(CASE WHEN c.status = 'colonized' THEN 1 ELSE 0 END) AS occupied_cells,
      SUM(c.rural_population) AS total_rural_pop,
      SUM(c.urban_population) AS total_urban_pop,
      AVG(c.fertility) AS avg_fertility,
      AVG(c.habitability) AS avg_habitability,
      AVG(c.mineral_richness) AS avg_mineral_richness,
      AVG(c.energy_potential) AS avg_energy_potential,
      AVG(c.population_density) AS avg_population_density
    FROM public.cells c
    WHERE (p_region_id IS NULL OR c.region_id = p_region_id)
      AND (p_type_filter IS NULL OR c.cell_type = p_type_filter::public.cell_type)
      AND (p_status_filter IS NULL OR c.status = p_status_filter::public.cell_status)
      AND (p_owner_territory_id IS NULL OR c.owner_territory_id = p_owner_territory_id)
    GROUP BY c.region_id
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'region_id', b.region_id,
      'totals', json_build_object(
        'cells', b.total_cells,
        'rural_pct', CASE WHEN b.total_cells > 0 THEN ROUND(100.0 * b.rural_cells / b.total_cells, 1) ELSE 0 END,
        'urban_pct', CASE WHEN b.total_cells > 0 THEN ROUND(100.0 * b.urban_cells / b.total_cells, 1) ELSE 0 END,
        'occupied', b.occupied_cells,
        'population_total', COALESCE(b.total_rural_pop,0) + COALESCE(b.total_urban_pop,0)
      ),
      'metrics', json_build_object(
        'fertility_avg', ROUND(b.avg_fertility::numeric, 3),
        'habitability_avg', ROUND(b.avg_habitability::numeric, 3),
        'minerals_avg', ROUND(b.avg_mineral_richness::numeric, 3),
        'energy_avg', ROUND(b.avg_energy_potential::numeric, 3),
        'density_avg', ROUND(b.avg_population_density::numeric, 3)
      )
    )
  ), '[]') INTO v_rows
  FROM base b;

  RETURN json_build_object('success', true, 'clusters', v_rows);
END;
$$;

-- Aggregation by sector within a region (Zoom 2)
-- Sector is computed as a deterministic hash bucket of cell id string
CREATE OR REPLACE FUNCTION public.get_region_sectors(
  p_region_id UUID,
  p_bucket_size INTEGER DEFAULT 300,          -- target cells per sector
  p_type_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_owner_territory_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows JSON;
BEGIN
  WITH cells_in_region AS (
    SELECT 
      c.*,
      -- simple bucket key: hashtext(id)::bigint to spread uuids, then mod by bucket count estimate
      (abs(hashtext(c.id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / p_bucket_size) FROM public.cells WHERE region_id = p_region_id))) AS sector_key
    FROM public.cells c
    WHERE c.region_id = p_region_id
      AND (p_type_filter IS NULL OR c.cell_type = p_type_filter::public.cell_type)
      AND (p_status_filter IS NULL OR c.status = p_status_filter::public.cell_status)
      AND (p_owner_territory_id IS NULL OR c.owner_territory_id = p_owner_territory_id)
  ),
  base AS (
    SELECT 
      sector_key,
      COUNT(*) AS total_cells,
      SUM(CASE WHEN status = 'colonized' THEN 1 ELSE 0 END) AS occupied_cells,
      AVG(population_density) AS avg_density,
      AVG(fertility) AS avg_fertility,
      AVG(habitability) AS avg_habitability,
      AVG(mineral_richness) AS avg_mineral_richness,
      AVG(energy_potential) AS avg_energy_potential
    FROM cells_in_region
    GROUP BY sector_key
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'sector_key', b.sector_key,
      'counts', json_build_object(
        'cells', b.total_cells,
        'occupied', b.occupied_cells
      ),
      'metrics', json_build_object(
        'density', ROUND(b.avg_density::numeric, 3),
        'fertility', ROUND(b.avg_fertility::numeric, 3),
        'habitability', ROUND(b.avg_habitability::numeric, 3),
        'minerals', ROUND(b.avg_mineral_richness::numeric, 3),
        'energy', ROUND(b.avg_energy_potential::numeric, 3)
      )
    )
  ), '[]') INTO v_rows
  FROM base b;

  RETURN json_build_object('success', true, 'sectors', v_rows);
END;
$$;

-- Paginated cells for a sector (Zoom 3)
CREATE OR REPLACE FUNCTION public.get_sector_cells(
  p_region_id UUID,
  p_sector_key INTEGER,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 100,
  p_type_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_owner_territory_id UUID DEFAULT NULL,
  p_habitability_min NUMERIC DEFAULT NULL,
  p_habitability_max NUMERIC DEFAULT NULL,
  p_fertility_min NUMERIC DEFAULT NULL,
  p_fertility_max NUMERIC DEFAULT NULL,
  p_density_min NUMERIC DEFAULT NULL,
  p_density_max NUMERIC DEFAULT NULL,
  p_predominant_resource TEXT DEFAULT NULL          -- 'food' | 'energy' | 'minerals' | 'technology'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows JSON;
  v_total INTEGER;
  v_offset INTEGER := GREATEST(0, (p_page - 1) * p_page_size);
BEGIN
  WITH cells_in_region AS (
    SELECT 
      c.*,
      (abs(hashtext(c.id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / 300) FROM public.cells WHERE region_id = p_region_id))) AS sector_key
    FROM public.cells c
    WHERE c.region_id = p_region_id
  ),
  filtered AS (
    SELECT *
    FROM cells_in_region
    WHERE sector_key = p_sector_key
      AND (p_type_filter IS NULL OR cell_type = p_type_filter::public.cell_type)
      AND (p_status_filter IS NULL OR status = p_status_filter::public.cell_status)
      AND (p_owner_territory_id IS NULL OR owner_territory_id = p_owner_territory_id)
      AND (p_habitability_min IS NULL OR habitability >= p_habitability_min)
      AND (p_habitability_max IS NULL OR habitability <= p_habitability_max)
      AND (p_fertility_min IS NULL OR fertility >= p_fertility_min)
      AND (p_fertility_max IS NULL OR fertility <= p_fertility_max)
      AND (p_density_min IS NULL OR population_density >= p_density_min)
      AND (p_density_max IS NULL OR population_density <= p_density_max)
      AND (
        p_predominant_resource IS NULL
        OR (
          p_predominant_resource = 'food' AND fertility >= GREATEST(mineral_richness, energy_potential, habitability)
        )
        OR (
          p_predominant_resource = 'energy' AND energy_potential >= GREATEST(mineral_richness, fertility, habitability)
        )
        OR (
          p_predominant_resource = 'minerals' AND mineral_richness >= GREATEST(energy_potential, fertility, habitability)
        )
        OR (
          p_predominant_resource = 'technology' AND habitability >= GREATEST(energy_potential, fertility, mineral_richness)
        )
      )
  )
  SELECT COUNT(*) INTO v_total FROM filtered;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id', f.id,
      'region_id', f.region_id,
      'type', f.cell_type,
      'status', f.status,
      'owner_territory_id', f.owner_territory_id,
      'population_total', COALESCE(f.rural_population,0) + COALESCE(f.urban_population,0),
      'rural_population', f.rural_population,
      'urban_population', f.urban_population,
      'rural_share', f.rural_share,
      'urban_share', f.urban_share,
      'fertility', ROUND(f.fertility::numeric, 3),
      'habitability', ROUND(f.habitability::numeric, 3),
      'mineral_richness', ROUND(f.mineral_richness::numeric, 3),
      'energy_potential', ROUND(f.energy_potential::numeric, 3),
      'population_density', ROUND(f.population_density::numeric, 3)
    )
  ), '[]') INTO v_rows
  FROM (
    SELECT *
    FROM filtered
    ORDER BY population_density DESC
    OFFSET v_offset
    LIMIT p_page_size
  ) f;

  RETURN json_build_object('success', true, 'total', v_total, 'page', p_page, 'page_size', p_page_size, 'cells', v_rows);
END;
$$;