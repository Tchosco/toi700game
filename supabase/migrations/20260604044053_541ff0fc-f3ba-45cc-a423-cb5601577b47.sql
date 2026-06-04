
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS is_villain boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS npc_kind text;

CREATE INDEX IF NOT EXISTS idx_territories_npc_kind ON public.territories(npc_kind);
CREATE INDEX IF NOT EXISTS idx_territories_is_villain ON public.territories(is_villain) WHERE is_villain;

INSERT INTO public.planetary_config (key, value, description) VALUES
  ('total_cells_target', '500000', 'Total de células no planeta'),
  ('player_initial_cells', '30', 'Células iniciais por país jogador'),
  ('villain_initial_cells', '10', 'Células iniciais do país vilão'),
  ('npc_type', 'tribal', 'Tipo padrão dos NPCs (regiões tribais conquistáveis)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description, updated_at = now();

SET LOCAL session_replication_role = 'replica';

DELETE FROM public.cell_cities;
UPDATE public.cells SET city_id = NULL WHERE city_id IS NOT NULL;
DELETE FROM public.cities;
DELETE FROM public.cells;
DELETE FROM public.territories WHERE owner_id IS NULL;

INSERT INTO public.territories
  (name, display_name, status, is_npc, is_villain, npc_kind,
   npc_description, official_color, demonym, motto, vocation, admin_style)
VALUES
  ('Domínio Sombrio de Vorthrax', 'Vorthrax', 'active', true, true, 'villain',
   'Império antagonista que ameaça toda TOI-700. Berço de cultos sombrios e exércitos disciplinados.',
   '#8b0000', 'vorthraxiano', 'Da sombra, o domínio', 'military', 'centralized');

DO $$
DECLARE r record; i int;
BEGIN
  FOR r IN SELECT id, name FROM public.regions ORDER BY name LOOP
    FOR i IN 1..60 LOOP
      INSERT INTO public.territories
        (name, display_name, status, is_npc, npc_kind, region_id,
         official_color, npc_description, vocation, admin_style, development_level)
      VALUES
        ('Tribo ' || regexp_replace(r.name,'[^A-Za-zÀ-ÿ]+','','g') || ' ' || lpad(i::text, 2, '0'),
         'Tribo ' || i,
         'active', true, 'tribal', r.id,
         '#6b5b3a',
         'Confederação tribal nativa de ' || r.name || '. Pode ser conquistada por jogadores.',
         'agricultural', 'decentralized',
         1 + (i % 4));
    END LOOP;
  END LOOP;
END $$;
