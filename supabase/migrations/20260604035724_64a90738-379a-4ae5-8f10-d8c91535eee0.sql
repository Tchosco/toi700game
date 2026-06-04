
-- Provinces table
CREATE TABLE IF NOT EXISTS public.provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  capital_cell_id uuid REFERENCES public.cells(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provinces_territory ON public.provinces(territory_id);

GRANT SELECT ON public.provinces TO anon, authenticated;
GRANT ALL ON public.provinces TO service_role;

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provinces viewable by everyone" ON public.provinces FOR SELECT USING (true);
CREATE POLICY "Admins manage provinces" ON public.provinces FOR ALL USING (has_role(auth.uid(),'admin'::app_role));

-- Add FK from cells.province_id to provinces
ALTER TABLE public.cells
  ADD CONSTRAINT cells_province_fk
  FOREIGN KEY (province_id) REFERENCES public.provinces(id) ON DELETE SET NULL;

-- RPCs
CREATE OR REPLACE FUNCTION public.create_province(p_territory_id uuid, p_name text, p_color text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid; v_name text; v_id uuid;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name)<1 OR length(v_name)>80 THEN RAISE EXCEPTION 'Nome inválido' USING ERRCODE='22023'; END IF;
  SELECT owner_id INTO v_owner FROM public.territories WHERE id=p_territory_id;
  IF v_owner IS NULL OR v_owner<>auth.uid() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  INSERT INTO public.provinces(territory_id,name,color) VALUES (p_territory_id,v_name,p_color) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.rename_province(p_province_id uuid, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_name text;
BEGIN
  v_name := btrim(coalesce(p_name,''));
  IF length(v_name)<1 OR length(v_name)>80 THEN RAISE EXCEPTION 'Nome inválido' USING ERRCODE='22023'; END IF;
  UPDATE public.provinces p SET name=v_name, updated_at=now()
    FROM public.territories t
    WHERE p.id=p_province_id AND p.territory_id=t.id AND t.owner_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_province(p_province_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT t.owner_id INTO v_owner FROM public.provinces p JOIN public.territories t ON t.id=p.territory_id WHERE p.id=p_province_id;
  IF v_owner IS NULL OR v_owner<>auth.uid() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  DELETE FROM public.provinces WHERE id=p_province_id;
END $$;

CREATE OR REPLACE FUNCTION public.assign_cell_to_province(p_cell_id uuid, p_province_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_cell_owner uuid; v_prov_owner uuid; v_cell_territory uuid; v_prov_territory uuid;
BEGIN
  SELECT t.owner_id, c.owner_territory_id INTO v_cell_owner, v_cell_territory
    FROM public.cells c JOIN public.territories t ON t.id=c.owner_territory_id
    WHERE c.id=p_cell_id FOR UPDATE OF c;
  IF v_cell_owner IS NULL OR v_cell_owner<>auth.uid() THEN RAISE EXCEPTION 'Sem permissão sobre a célula' USING ERRCODE='42501'; END IF;
  IF p_province_id IS NULL THEN
    UPDATE public.cells SET province_id=NULL, updated_at=now() WHERE id=p_cell_id;
    RETURN;
  END IF;
  SELECT t.owner_id, p.territory_id INTO v_prov_owner, v_prov_territory
    FROM public.provinces p JOIN public.territories t ON t.id=p.territory_id WHERE p.id=p_province_id;
  IF v_prov_owner IS NULL OR v_prov_owner<>auth.uid() THEN RAISE EXCEPTION 'Sem permissão sobre a província' USING ERRCODE='42501'; END IF;
  IF v_prov_territory<>v_cell_territory THEN RAISE EXCEPTION 'Província e célula em territórios diferentes' USING ERRCODE='22023'; END IF;
  UPDATE public.cells SET province_id=p_province_id, updated_at=now() WHERE id=p_cell_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_province(uuid,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rename_province(uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_province(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assign_cell_to_province(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_province(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_province(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_province(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_cell_to_province(uuid,uuid) TO authenticated;

-- Trigger to update updated_at on provinces
CREATE OR REPLACE FUNCTION public.tg_provinces_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS provinces_updated_at ON public.provinces;
CREATE TRIGGER provinces_updated_at BEFORE UPDATE ON public.provinces FOR EACH ROW EXECUTE FUNCTION public.tg_provinces_updated_at();
