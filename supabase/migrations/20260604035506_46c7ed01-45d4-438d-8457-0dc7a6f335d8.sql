
-- 1. Planetary config
UPDATE public.planetary_config SET value='100', updated_at=now() WHERE key='min_cell_area_km2';
UPDATE public.planetary_config SET value='1000', updated_at=now() WHERE key='max_cell_area_km2';
INSERT INTO public.planetary_config (key, value, description)
  VALUES ('max_merged_cell_area_km2', '5000', 'Limite máximo de área (km²) após agrupar células vizinhas')
  ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, description=EXCLUDED.description, updated_at=now();

-- 2. Schema additions
ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS merged_into_cell_id uuid REFERENCES public.cells(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS province_id uuid;

CREATE INDEX IF NOT EXISTS idx_cells_merged_into ON public.cells(merged_into_cell_id);
CREATE INDEX IF NOT EXISTS idx_cells_province ON public.cells(province_id);

ALTER TABLE public.cells ALTER COLUMN area_km2 SET DEFAULT 500;

-- 3. Re-scale FIRST
UPDATE public.cells
  SET area_km2 = 100 + floor(random() * 901)::int
  WHERE area_km2 > 1000 OR area_km2 < 100;

-- 4. Then add constraint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cells_area_km2_range_chk') THEN
    ALTER TABLE public.cells DROP CONSTRAINT cells_area_km2_range_chk;
  END IF;
END $$;
ALTER TABLE public.cells ADD CONSTRAINT cells_area_km2_range_chk
  CHECK (area_km2 BETWEEN 100 AND 5000);

-- 5. Territory nickname
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS display_name text;

-- 6. Unique cell→city
CREATE UNIQUE INDEX IF NOT EXISTS uq_cell_cities_cell ON public.cell_cities(cell_id);

-- 7. Seed cells per region
DO $$
DECLARE
  r RECORD;
  npc_id uuid;
  i int;
  ctype cell_type;
  cstatus cell_status;
  area int;
  total_per_region int := 80;
  claim_threshold int := 56;
BEGIN
  FOR r IN SELECT id, name FROM public.regions WHERE is_visible=true LOOP
    SELECT t.id INTO npc_id FROM public.territories t
      WHERE t.is_npc = true
        AND (t.npc_description ILIKE '%' || r.name || '%' OR t.name ILIKE '%' || r.name || '%')
      LIMIT 1;

    FOR i IN 1..total_per_region LOOP
      area := 100 + floor(random() * 901)::int;
      ctype := CASE WHEN random() < 0.2 THEN 'urban'::cell_type ELSE 'rural'::cell_type END;
      cstatus := CASE WHEN i <= claim_threshold AND npc_id IS NOT NULL
                      THEN 'colonized'::cell_status ELSE 'explored'::cell_status END;

      INSERT INTO public.cells (
        region_id, area_km2, cell_type, status, owner_territory_id,
        rural_population, urban_population, population_density,
        resource_food, resource_minerals, resource_energy, resource_tech, resource_influence,
        is_urban_eligible
      ) VALUES (
        r.id, area, ctype, cstatus,
        CASE WHEN i <= claim_threshold THEN npc_id ELSE NULL END,
        CASE WHEN i <= claim_threshold THEN 500 + floor(random()*4500)::int ELSE 0 END,
        CASE WHEN ctype='urban' AND i <= claim_threshold THEN 1000 + floor(random()*9000)::int ELSE 0 END,
        random()*0.5,
        random(), random(), random(), random()*0.5, random()*0.3,
        ctype='urban'
      );
    END LOOP;
  END LOOP;
END $$;

-- 8. RPCs
CREATE OR REPLACE FUNCTION public.rename_cell(p_cell_id uuid, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name) < 1 OR length(v_name) > 80 THEN
    RAISE EXCEPTION 'Nome inválido' USING ERRCODE='22023'; END IF;
  SELECT t.owner_id INTO v_owner FROM public.cells c
    JOIN public.territories t ON t.id=c.owner_territory_id
    WHERE c.id=p_cell_id FOR UPDATE OF c;
  IF v_owner IS NULL OR v_owner<>auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  UPDATE public.cells SET display_name=v_name, updated_at=now() WHERE id=p_cell_id;
END $$;

CREATE OR REPLACE FUNCTION public.rename_territory(p_territory_id uuid, p_nickname text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text;
BEGIN
  v_name := btrim(coalesce(p_nickname,''));
  IF length(v_name)<1 OR length(v_name)>80 THEN
    RAISE EXCEPTION 'Nome inválido' USING ERRCODE='22023'; END IF;
  UPDATE public.territories SET display_name=v_name, updated_at=now()
    WHERE id=p_territory_id AND owner_id=auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.merge_cells(p_master_cell_id uuid, p_absorbed_cell_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE m RECORD; a RECORD; v_max int; v_total int; first_id uuid; second_id uuid;
BEGIN
  IF p_master_cell_id = p_absorbed_cell_id THEN
    RAISE EXCEPTION 'Não pode mesclar consigo mesma' USING ERRCODE='22023'; END IF;

  IF p_master_cell_id < p_absorbed_cell_id THEN
    first_id := p_master_cell_id; second_id := p_absorbed_cell_id;
  ELSE
    first_id := p_absorbed_cell_id; second_id := p_master_cell_id;
  END IF;

  PERFORM 1 FROM public.cells WHERE id IN (first_id, second_id) ORDER BY id FOR UPDATE;

  SELECT c.*, t.owner_id AS t_owner INTO m FROM public.cells c
    LEFT JOIN public.territories t ON t.id=c.owner_territory_id
    WHERE c.id=p_master_cell_id;
  SELECT c.*, t.owner_id AS t_owner INTO a FROM public.cells c
    LEFT JOIN public.territories t ON t.id=c.owner_territory_id
    WHERE c.id=p_absorbed_cell_id;

  IF m.id IS NULL OR a.id IS NULL THEN
    RAISE EXCEPTION 'Célula não encontrada' USING ERRCODE='P0002'; END IF;
  IF m.t_owner IS NULL OR m.t_owner<>auth.uid() OR a.t_owner IS NULL OR a.t_owner<>auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  IF m.owner_territory_id<>a.owner_territory_id THEN
    RAISE EXCEPTION 'Células de territórios diferentes' USING ERRCODE='22023'; END IF;
  IF coalesce(m.province_id::text,'')<>coalesce(a.province_id::text,'') THEN
    RAISE EXCEPTION 'Províncias diferentes' USING ERRCODE='22023'; END IF;
  IF m.region_id IS DISTINCT FROM a.region_id THEN
    RAISE EXCEPTION 'Regiões diferentes (não limítrofes)' USING ERRCODE='22023'; END IF;
  IF a.merged_into_cell_id IS NOT NULL OR m.merged_into_cell_id IS NOT NULL THEN
    RAISE EXCEPTION 'Uma das células já está mesclada' USING ERRCODE='22023'; END IF;

  SELECT value::int INTO v_max FROM public.planetary_config WHERE key='max_merged_cell_area_km2';
  v_max := coalesce(v_max,5000);
  v_total := m.area_km2 + a.area_km2;
  IF v_total > v_max THEN
    RAISE EXCEPTION 'Área combinada excede limite (% km²)', v_max USING ERRCODE='22023'; END IF;

  UPDATE public.cells SET
    area_km2 = v_total,
    rural_population = m.rural_population + a.rural_population,
    urban_population = m.urban_population + a.urban_population,
    resource_food = m.resource_food + a.resource_food,
    resource_minerals = m.resource_minerals + a.resource_minerals,
    resource_energy = m.resource_energy + a.resource_energy,
    resource_tech = m.resource_tech + a.resource_tech,
    resource_influence = m.resource_influence + a.resource_influence,
    updated_at = now()
  WHERE id = m.id;

  UPDATE public.cells SET
    merged_into_cell_id = m.id,
    owner_territory_id = NULL,
    status = 'blocked'::cell_status,
    updated_at = now()
  WHERE id = a.id;
END $$;

CREATE OR REPLACE FUNCTION public.unmerge_cell(p_absorbed_cell_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a RECORD; m RECORD;
BEGIN
  SELECT c.*, t.owner_id AS t_owner INTO a
    FROM public.cells c
    LEFT JOIN public.cells mc ON mc.id=c.merged_into_cell_id
    LEFT JOIN public.territories t ON t.id=mc.owner_territory_id
    WHERE c.id=p_absorbed_cell_id FOR UPDATE OF c;
  IF a.id IS NULL OR a.merged_into_cell_id IS NULL THEN
    RAISE EXCEPTION 'Célula não está mesclada' USING ERRCODE='22023'; END IF;
  IF a.t_owner IS NULL OR a.t_owner<>auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM public.cells WHERE id=a.merged_into_cell_id FOR UPDATE;
  UPDATE public.cells SET
    area_km2 = GREATEST(100, m.area_km2 - LEAST(m.area_km2-100, 500)),
    updated_at = now()
  WHERE id = m.id;
  UPDATE public.cells SET
    merged_into_cell_id = NULL,
    owner_territory_id = m.owner_territory_id,
    status = m.status,
    updated_at = now()
  WHERE id = a.id;
END $$;

GRANT EXECUTE ON FUNCTION public.rename_cell(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_territory(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_cells(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmerge_cell(uuid) TO authenticated;
