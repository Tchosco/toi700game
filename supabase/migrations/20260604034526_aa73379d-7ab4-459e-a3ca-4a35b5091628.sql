
UPDATE public.planetary_config SET value = '723000000', description = 'Superfície total de TOI-700 d (raio ~1.19 R⊕)' WHERE key = 'total_planet_area_km2';
UPDATE public.planetary_config SET value = '210000000', description = 'Terras emersas (~29% da superfície, similar à Terra)' WHERE key = 'total_land_area_km2';
UPDATE public.planetary_config SET value = '60000000', description = 'Área jogável colonizável ativa' WHERE key = 'playable_land_area_km2';
INSERT INTO public.planetary_config (key, value, description)
  VALUES ('ocean_share_percent', '71', 'Proporção de oceanos do planeta (% similar à Terra)'),
         ('planet_radius_km', '7570', 'Raio médio aproximado de TOI-700 d'),
         ('min_cell_area_km2', '7500', 'Área mínima de uma célula territorial'),
         ('max_cell_area_km2', '60000', 'Área máxima permitida para uma célula territorial')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();

ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS is_npc boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS development_level integer NOT NULL DEFAULT 5 CHECK (development_level BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS npc_description text;

CREATE INDEX IF NOT EXISTS idx_territories_is_npc ON public.territories(is_npc);

UPDATE public.cells
SET area_km2 = 7500 + floor(random() * 52500)::int
WHERE owner_territory_id IS NULL;

DO $$
DECLARE
  r RECORD;
  npc_id uuid;
  npc_names text[] := ARRAY[
    'Federação de Velmara',
    'Khanato de Tordrek',
    'União Tribal de Issari',
    'Sultanato de Marekh',
    'República Popular de Doran',
    'Confederação de Ylvath',
    'Reino Insular de Sephar',
    'Domínio de Korrath'
  ];
  npc_colors text[] := ARRAY['#8b5a3c','#5e7c5e','#7a6b8f','#a86b3c','#4a6b8a','#8a5a6b','#6b8a5a','#a89a4a'];
  npc_govs text[] := ARRAY['monarchy','theocracy','oligarchy','dictatorship','monarchy','theocracy'];
  idx int := 1;
  cell_rec RECORD;
  total_cells int;
  base_pop int;
BEGIN
  FOR r IN SELECT id, name FROM public.regions WHERE is_visible = true ORDER BY name LOOP
    npc_id := gen_random_uuid();
    INSERT INTO public.territories (
      id, name, owner_id, region_id, government_type, style, status, level,
      lore, stability, economy_rating, research_bonus, is_neutral,
      total_rural_population, total_urban_population, demonym, motto,
      official_color, admin_style, vocation, accepted_statute,
      is_npc, development_level, npc_description
    ) VALUES (
      npc_id,
      npc_names[((idx - 1) % array_length(npc_names,1)) + 1] || ' (' || r.name || ')',
      NULL,
      r.id,
      npc_govs[((idx - 1) % array_length(npc_govs,1)) + 1]::government_type,
      'cultural'::territory_style,
      'active'::territory_status,
      'colony'::territory_level,
      'Civilização ancestral de baixo desenvolvimento tecnológico, povoada antes da chegada dos colonizadores planetários.',
      30 + floor(random() * 25)::numeric,
      20 + floor(random() * 25)::numeric,
      0.8,
      false,
      0, 0,
      'nativo', 'A terra antes de tudo',
      npc_colors[((idx - 1) % array_length(npc_colors,1)) + 1],
      'tribal', 'agricultural',
      true,
      true,
      1 + floor(random() * 4)::int,
      'País NPC povoado por nativos. Diplomacia limitada disponível.'
    );

    SELECT count(*) INTO total_cells FROM public.cells WHERE region_id = r.id AND owner_territory_id IS NULL;
    IF total_cells > 0 THEN
      FOR cell_rec IN SELECT id FROM public.cells WHERE region_id = r.id AND owner_territory_id IS NULL LOOP
        base_pop := 5000 + floor(random() * 45000)::int;
        UPDATE public.cells
        SET owner_territory_id = npc_id,
            status = 'colonized'::cell_status,
            rural_population = (base_pop * 0.75)::int,
            urban_population = (base_pop * 0.25)::int,
            colonized_at = now(),
            colonized_by = NULL,
            updated_at = now()
        WHERE id = cell_rec.id;
      END LOOP;

      UPDATE public.territories
      SET total_rural_population = COALESCE((SELECT sum(rural_population)::int FROM public.cells WHERE owner_territory_id = npc_id),0),
          total_urban_population = COALESCE((SELECT sum(urban_population)::int FROM public.cells WHERE owner_territory_id = npc_id),0)
      WHERE id = npc_id;
    END IF;

    idx := idx + 1;
  END LOOP;
END $$;
