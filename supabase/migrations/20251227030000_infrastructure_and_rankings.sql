-- Rankings
CREATE TABLE IF NOT EXISTS public.rankings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
  score_total NUMERIC,
  population BIGINT,
  economy NUMERIC,
  technology NUMERIC,
  stability NUMERIC,
  expansion INTEGER,
  efficiency NUMERIC,
  tick_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Infraestrutura: tipos nacionais
CREATE TABLE IF NOT EXISTS public.national_infrastructure_types (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  effects JSONB, -- ex: {"capacity_bonus": 5000, "stability_bonus": 5}
  cost_food INTEGER DEFAULT 0,
  cost_energy INTEGER DEFAULT 0,
  cost_minerals INTEGER DEFAULT 0,
  cost_currency INTEGER DEFAULT 0,
  maintenance JSONB, -- ex: {"energy": 100, "currency": 50}
  build_ticks INTEGER DEFAULT 3,
  slots_used INTEGER DEFAULT 1
);

-- Infraestrutura: tipos locais
CREATE TABLE IF NOT EXISTS public.cell_infrastructure_types (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  effects JSONB, -- ex: {"food_prod_bonus": 0.1}
  cost_food INTEGER DEFAULT 0,
  cost_energy INTEGER DEFAULT 0,
  cost_minerals INTEGER DEFAULT 0,
  cost_currency INTEGER DEFAULT 0,
  maintenance JSONB,
  build_ticks INTEGER DEFAULT 3,
  slots_used INTEGER DEFAULT 1
);

-- Infraestrutura nacional construída
CREATE TABLE IF NOT EXISTS public.infra_national (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
  type_key TEXT REFERENCES public.national_infrastructure_types(key),
  status TEXT DEFAULT 'active', -- active, inactive
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  maintenance_active BOOLEAN DEFAULT true
);

-- Infraestrutura local construída
CREATE TABLE IF NOT EXISTS public.infra_cell (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
  cell_id UUID REFERENCES public.cells(id) ON DELETE CASCADE,
  type_key TEXT REFERENCES public.cell_infrastructure_types(key),
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  maintenance_active BOOLEAN DEFAULT true
);

-- Fila de construção
CREATE TABLE IF NOT EXISTS public.construction_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE,
  cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  level TEXT CHECK (level IN ('national','cell')),
  type_key TEXT NOT NULL,
  remaining_ticks INTEGER NOT NULL,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, paused
  started_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeds de tipos nacionais
INSERT INTO public.national_infrastructure_types (key, name, effects, cost_food, cost_energy, cost_minerals, cost_currency, maintenance, build_ticks, slots_used)
VALUES
  ('admin_center', 'Centro Administrativo', '{"capacity_bonus": 5000, "stability_bonus": 5}'::jsonb, 5000, 2000, 3000, 2000, '{"energy": 100, "currency": 50}'::jsonb, 3, 1),
  ('logistics_network', 'Rede Logística', '{"overflow_loss_reduction": 0.5, "colonization_cost_reduction": 0.15}'::jsonb, 3000, 3000, 4000, 2500, '{"energy": 150}'::jsonb, 4, 1),
  ('science_institute', 'Instituto Científico', '{"tech_prod_bonus": 0.1}'::jsonb, 4000, 2000, 3000, 3000, '{"energy": 120}'::jsonb, 3, 1),
  ('strategic_reserve', 'Reserva Estratégica', '{"capacity_bonus": 8000, "crisis_impact_reduction": 0.3}'::jsonb, 6000, 4000, 5000, 3000, '{"energy": 80}'::jsonb, 4, 1),
  ('military_complex', 'Complexo Militar', '{"war_power_bonus": 0.15}'::jsonb, 3000, 5000, 6000, 4000, '{"energy": 200, "currency": 100}'::jsonb, 5, 2),
  ('planning_agency', 'Agência de Planejamento', '{"efficiency_bonus": 0.1}'::jsonb, 2500, 2000, 2500, 2000, '{"currency": 60}'::jsonb, 3, 1)
ON CONFLICT (key) DO NOTHING;

-- Seeds de tipos locais
INSERT INTO public.cell_infrastructure_types (key, name, effects, cost_food, cost_energy, cost_minerals, cost_currency, maintenance, build_ticks, slots_used)
VALUES
  ('farm', 'Fazenda Intensiva', '{"food_prod_bonus": 0.15}'::jsonb, 2000, 500, 1000, 800, '{"energy": 20}'::jsonb, 2, 1),
  ('mine', 'Complexo Minerador', '{"minerals_prod_bonus": 0.2}'::jsonb, 1000, 800, 2000, 900, '{"energy": 30}'::jsonb, 3, 1),
  ('power_plant', 'Usina de Energia', '{"energy_prod_bonus": 0.2}'::jsonb, 1000, 1500, 2000, 1000, '{"energy": 40}'::jsonb, 3, 1),
  ('industrial_hub', 'Polo Industrial', '{"cross_prod_bonus": 0.1}'::jsonb, 1500, 1200, 1800, 1100, '{"energy": 35}'::jsonb, 3, 1),
  ('advanced_urban_center', 'Centro Urbano Avançado', '{"tech_prod_bonus": 0.15, "influence_bonus": 0.1}'::jsonb, 1200, 1600, 1900, 1200, '{"energy": 50}'::jsonb, 4, 1)
ON CONFLICT (key) DO NOTHING;

-- Função: fronteiras do Estado por setores (clusters simples)
CREATE OR REPLACE FUNCTION public.get_state_frontiers(p_territory_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_clusters INTEGER := 0;
  v_border_cells JSON;
  v_cells_count INTEGER := 0;
BEGIN
  WITH owned AS (
    SELECT 
      c.id, c.region_id,
      (abs(hashtext(c.id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / 300) FROM public.cells WHERE region_id = c.region_id))) AS sector_key
    FROM public.cells c
    WHERE c.owner_territory_id = p_territory_id
  ),
  clusters AS (
    SELECT COUNT(DISTINCT sector_key) AS cluster_count, COUNT(*) AS cells_count
    FROM owned
  ),
  borders AS (
    SELECT o.id
    FROM owned o
    WHERE EXISTS (
      SELECT 1
      FROM public.cells c2
      WHERE c2.region_id = o.region_id
        AND (abs(hashtext(c2.id)) % GREATEST(1, (SELECT CEIL(COUNT(*)::numeric / 300) FROM public.cells WHERE region_id = o.region_id))) = o.sector_key
        AND (c2.owner_territory_id IS NULL OR c2.owner_territory_id <> p_territory_id)
    )
  )
  SELECT cluster_count, cells_count INTO v_clusters, v_cells_count FROM clusters;

  SELECT COALESCE(json_agg(json_build_object('cell_id', b.id)), '[]') INTO v_border_cells FROM borders b;

  RETURN json_build_object(
    'success', true,
    'cells_owned', v_cells_count,
    'cluster_count', v_clusters,
    'border_cells', v_border_cells
  );
END;
$$;

-- Enable RLS where applicable (basic policies)
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rankings_select_all" ON public.rankings FOR SELECT USING (true);

ALTER TABLE public.infra_national ENABLE ROW LEVEL SECURITY;
CREATE POLICY "infra_national_select_owner" ON public.infra_national FOR SELECT TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_national.territory_id));
CREATE POLICY "infra_national_insert_owner" ON public.infra_national FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_national.territory_id));
CREATE POLICY "infra_national_update_owner" ON public.infra_national FOR UPDATE TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_national.territory_id));

ALTER TABLE public.infra_cell ENABLE ROW LEVEL SECURITY;
CREATE POLICY "infra_cell_select_owner" ON public.infra_cell FOR SELECT TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_cell.territory_id));
CREATE POLICY "infra_cell_insert_owner" ON public.infra_cell FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_cell.territory_id));
CREATE POLICY "infra_cell_update_owner" ON public.infra_cell FOR UPDATE TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = infra_cell.territory_id));

ALTER TABLE public.construction_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "construction_queue_select_owner" ON public.construction_queue FOR SELECT TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = construction_queue.territory_id));
CREATE POLICY "construction_queue_insert_owner" ON public.construction_queue FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = construction_queue.territory_id));
CREATE POLICY "construction_queue_update_owner" ON public.construction_queue FOR UPDATE TO authenticated USING (auth.uid() = (SELECT owner_id FROM public.territories t WHERE t.id = construction_queue.territory_id));