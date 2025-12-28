-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Helper: compute sector key in SQL (bucketed by region size)
CREATE OR REPLACE FUNCTION public.compute_sector_key(p_cell_id UUID, p_region_id UUID, p_bucket_size INTEGER DEFAULT 300)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT (abs(hashtext(p_cell_id::text)) % GREATEST(
    1,
    CEIL( (SELECT COUNT(*)::numeric FROM public.cells WHERE region_id = p_region_id) / p_bucket_size )::int
  ));
$$;

-- RPC: region clusters (aggregates by region)
CREATE OR REPLACE FUNCTION public.get_region_clusters(
  p_region_id UUID DEFAULT NULL,
  p_type_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_owner_territory_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH base AS (
    SELECT
      c.region_id,
      COUNT(*) AS cells_total,
      AVG(COALESCE(c.habitability, 0)) AS habitability_avg,
      AVG(COALESCE(c.fertility, 0)) AS fertility_avg,
      AVG(COALESCE(c.mineral_richness, 0)) AS minerals_avg,
      AVG(COALESCE(c.energy_potential, 0)) AS energy_avg,
      AVG(COALESCE(c.rural_population + c.urban_population, 0)) AS density_avg
    FROM public.cells c
    WHERE (p_region_id IS NULL OR c.region_id = p_region_id)
      AND (p_type_filter IS NULL OR c.cell_type = p_type_filter)
      AND (p_status_filter IS NULL OR c.status = p_status_filter)
      AND (p_owner_territory_id IS NULL OR c.owner_territory_id = p_owner_territory_id)
    GROUP BY c.region_id
  )
  SELECT jsonb_build_object(
    'success', true,
    'clusters', COALESCE(jsonb_agg(
      jsonb_build_object(
        'region_id', b.region_id,
        'metrics', jsonb_build_object(
          'habitability_avg', b.habitability_avg,
          'fertility_avg', b.fertility_avg,
          'minerals_avg', b.minerals_avg,
          'energy_avg', b.energy_avg,
          'density_avg', b.density_avg
        ),
        'cells_total', b.cells_total
      )
    ), '[]'::jsonb)
  )
  INTO result
  FROM base b;

  RETURN result;
END;
$$;

-- RPC: sectors within a region
CREATE OR REPLACE FUNCTION public.get_region_sectors(
  p_region_id UUID,
  p_bucket_size INTEGER DEFAULT 300,
  p_type_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_owner_territory_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH base AS (
    SELECT
      compute_sector_key(c.id, c.region_id, p_bucket_size) AS sector_key,
      COUNT(*) AS cells_total,
      AVG(COALESCE(c.habitability, 0)) AS habitability,
      AVG(COALESCE(c.fertility, 0)) AS fertility,
      AVG(COALESCE(c.mineral_richness, 0)) AS minerals,
      AVG(COALESCE(c.energy_potential, 0)) AS energy,
      AVG(COALESCE(c.rural_population + c.urban_population, 0)) AS density
    FROM public.cells c
    WHERE c.region_id = p_region_id
      AND (p_type_filter IS NULL OR c.cell_type = p_type_filter)
      AND (p_status_filter IS NULL OR c.status = p_status_filter)
      AND (p_owner_territory_id IS NULL OR c.owner_territory_id = p_owner_territory_id)
    GROUP BY compute_sector_key(c.id, c.region_id, p_bucket_size)
  )
  SELECT jsonb_build_object(
    'success', true,
    'sectors', COALESCE(jsonb_agg(
      jsonb_build_object(
        'sector_key', b.sector_key,
        'metrics', jsonb_build_object(
          'habitability', b.habitability,
          'fertility', b.fertility,
          'minerals', b.minerals,
          'energy', b.energy,
          'density', b.density
        ),
        'cells_total', b.cells_total
      )
    ), '[]'::jsonb)
  )
  INTO result
  FROM base b;

  RETURN result;
END;
$$;

-- RPC: cells within a sector (paginated + filters)
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
  p_predominant_resource TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSONB;
  v_offset INTEGER := GREATEST(0, (p_page - 1) * p_page_size);
BEGIN
  WITH filtered AS (
    SELECT c.*
    FROM public.cells c
    WHERE c.region_id = p_region_id
      AND compute_sector_key(c.id, c.region_id, 300) = p_sector_key
      AND (p_type_filter IS NULL OR c.cell_type = p_type_filter)
      AND (p_status_filter IS NULL OR c.status = p_status_filter)
      AND (p_owner_territory_id IS NULL OR c.owner_territory_id = p_owner_territory_id)
      AND (p_habitability_min IS NULL OR c.habitability >= p_habitability_min)
      AND (p_habitability_max IS NULL OR c.habitability <= p_habitability_max)
      AND (p_fertility_min IS NULL OR c.fertility >= p_fertility_min)
      AND (p_fertility_max IS NULL OR c.fertility <= p_fertility_max)
      AND (p_density_min IS NULL OR (COALESCE(c.rural_population,0) + COALESCE(c.urban_population,0)) >= p_density_min)
      AND (p_density_max IS NULL OR (COALESCE(c.rural_population,0) + COALESCE(c.urban_population,0)) <= p_density_max)
      AND (
        p_predominant_resource IS NULL
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(c.resource_nodes::jsonb, '[]'::jsonb)) AS rn
          WHERE (rn->>'type') = p_predominant_resource
        )
      )
  ),
  total AS (
    SELECT COUNT(*) AS total FROM filtered
  ),
  page AS (
    SELECT
      f.id, f.region_id, f.status, f.cell_type, f.area_km2,
      f.habitability, f.fertility, f.mineral_richness, f.energy_potential,
      f.rural_population, f.urban_population, f.owner_territory_id, f.city_id, f.has_city,
      r.name AS region_name
    FROM filtered f
    LEFT JOIN public.regions r ON r.id = f.region_id
    ORDER BY f.created_at DESC NULLS LAST, f.id
    LIMIT p_page_size OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'success', true,
    'total', t.total,
    'cells', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'region_id', p.region_id,
        'status', p.status,
        'cell_type', p.cell_type,
        'area_km2', p.area_km2,
        'habitability', p.habitability,
        'fertility', p.fertility,
        'minerals', p.mineral_richness,
        'energy', p.energy_potential,
        'rural_population', p.rural_population,
        'urban_population', p.urban_population,
        'owner_territory_id', p.owner_territory_id,
        'has_city', p.has_city,
        'regions', jsonb_build_object('name', p.region_name)
      )
    ), '[]'::jsonb)
  )
  INTO result
  FROM total t, page p;

  RETURN result;
END;
$$;

-- Tick lock functions to avoid concurrent ticks
CREATE OR REPLACE FUNCTION public.acquire_tick_lock()
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  ok BOOLEAN;
BEGIN
  -- Use fixed advisory lock key
  SELECT pg_try_advisory_lock(424242) INTO ok;
  RETURN ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_tick_lock()
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  PERFORM pg_advisory_unlock(424242);
END;
$$;

-- RLS: ensure secure defaults (cells and territories)
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;

-- Policies: only owner can update own territory; cells readable, updates restricted
DO $$
BEGIN
  -- Territories
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='territories' AND policyname='territories_select_own'
  ) THEN
    CREATE POLICY territories_select_own ON public.territories
      FOR SELECT TO authenticated
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='territories' AND policyname='territories_update_own'
  ) THEN
    CREATE POLICY territories_update_own ON public.territories
      FOR UPDATE TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;

  -- Cells
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cells' AND policyname='cells_select_public'
  ) THEN
    CREATE POLICY cells_select_public ON public.cells
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cells' AND policyname='cells_update_owner_only'
  ) THEN
    CREATE POLICY cells_update_owner_only ON public.cells
      FOR UPDATE TO authenticated
      USING (owner_territory_id IN (
        SELECT id FROM public.territories WHERE owner_id = auth.uid()
      ))
      WITH CHECK (owner_territory_id IN (
        SELECT id FROM public.territories WHERE owner_id = auth.uid()
      ));
  END IF;
END $$;