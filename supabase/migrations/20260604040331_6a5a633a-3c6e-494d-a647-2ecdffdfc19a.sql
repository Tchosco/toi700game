ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS grid_x INTEGER,
  ADD COLUMN IF NOT EXISTS grid_y INTEGER;

DO $$
DECLARE
  r RECORD;
  side INT;
  i INT;
  cell_rec RECORD;
BEGIN
  FOR r IN
    SELECT region_id, COUNT(*) AS n
    FROM public.cells
    WHERE region_id IS NOT NULL AND merged_into_cell_id IS NULL
    GROUP BY region_id
  LOOP
    side := GREATEST(1, CEIL(SQRT(r.n))::INT);
    i := 0;
    FOR cell_rec IN
      SELECT id FROM public.cells
      WHERE region_id = r.region_id AND merged_into_cell_id IS NULL
      ORDER BY created_at, id
    LOOP
      UPDATE public.cells
        SET grid_x = (i % side),
            grid_y = (i / side)
        WHERE id = cell_rec.id;
      i := i + 1;
    END LOOP;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS cells_region_grid_idx ON public.cells (region_id, grid_x, grid_y);

DROP FUNCTION IF EXISTS public.merge_cells(UUID, UUID);

CREATE FUNCTION public.merge_cells(p_master_cell_id UUID, p_absorbed_cell_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_master RECORD;
  v_absorbed RECORD;
  v_max_area INT;
  v_dx INT;
  v_dy INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF p_master_cell_id = p_absorbed_cell_id THEN
    RAISE EXCEPTION 'same_cell';
  END IF;

  SELECT c.*, t.owner_id AS t_owner INTO v_master
  FROM public.cells c
  JOIN public.territories t ON t.id = c.owner_territory_id
  WHERE c.id = p_master_cell_id
  FOR UPDATE;

  SELECT c.*, t.owner_id AS t_owner INTO v_absorbed
  FROM public.cells c
  JOIN public.territories t ON t.id = c.owner_territory_id
  WHERE c.id = p_absorbed_cell_id
  FOR UPDATE;

  IF v_master IS NULL OR v_absorbed IS NULL THEN
    RAISE EXCEPTION 'cell_not_found';
  END IF;
  IF v_master.t_owner <> v_uid OR v_absorbed.t_owner <> v_uid THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  IF v_master.owner_territory_id <> v_absorbed.owner_territory_id THEN
    RAISE EXCEPTION 'different_territory';
  END IF;
  IF COALESCE(v_master.province_id::text, '') <> COALESCE(v_absorbed.province_id::text, '') THEN
    RAISE EXCEPTION 'different_province';
  END IF;
  IF v_master.region_id <> v_absorbed.region_id THEN
    RAISE EXCEPTION 'different_region';
  END IF;
  IF v_absorbed.merged_into_cell_id IS NOT NULL OR v_master.merged_into_cell_id IS NOT NULL THEN
    RAISE EXCEPTION 'already_merged';
  END IF;

  IF v_master.grid_x IS NULL OR v_absorbed.grid_x IS NULL THEN
    RAISE EXCEPTION 'no_coordinates';
  END IF;
  v_dx := ABS(v_master.grid_x - v_absorbed.grid_x);
  v_dy := ABS(v_master.grid_y - v_absorbed.grid_y);
  IF (v_dx + v_dy) <> 1 THEN
    RAISE EXCEPTION 'not_adjacent';
  END IF;

  SELECT COALESCE(max_merged_cell_area_km2, 5000) INTO v_max_area FROM public.planetary_config LIMIT 1;
  IF (COALESCE(v_master.area_km2,0) + COALESCE(v_absorbed.area_km2,0)) > v_max_area THEN
    RAISE EXCEPTION 'area_exceeds_max';
  END IF;

  UPDATE public.cells
    SET area_km2 = COALESCE(area_km2,0) + COALESCE(v_absorbed.area_km2,0),
        rural_population = COALESCE(rural_population,0) + COALESCE(v_absorbed.rural_population,0),
        urban_population = COALESCE(urban_population,0) + COALESCE(v_absorbed.urban_population,0),
        resource_food = COALESCE(resource_food,0) + COALESCE(v_absorbed.resource_food,0),
        resource_energy = COALESCE(resource_energy,0) + COALESCE(v_absorbed.resource_energy,0),
        resource_minerals = COALESCE(resource_minerals,0) + COALESCE(v_absorbed.resource_minerals,0),
        resource_tech = COALESCE(resource_tech,0) + COALESCE(v_absorbed.resource_tech,0),
        resource_influence = COALESCE(resource_influence,0) + COALESCE(v_absorbed.resource_influence,0),
        updated_at = now()
    WHERE id = p_master_cell_id;

  UPDATE public.cells
    SET merged_into_cell_id = p_master_cell_id,
        status = 'merged',
        updated_at = now()
    WHERE id = p_absorbed_cell_id;

  RETURN jsonb_build_object('success', true, 'master_cell_id', p_master_cell_id, 'absorbed_cell_id', p_absorbed_cell_id);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_cells(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_cells(UUID, UUID) TO authenticated;