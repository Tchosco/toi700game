
-- =========== regime_profiles ===========
CREATE TABLE public.regime_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regime public.government_type NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  national_law_label text NOT NULL DEFAULT 'Lei',
  decree_label text NOT NULL DEFAULT 'Decreto',
  leader_title text NOT NULL DEFAULT 'Líder',
  parliament_name text NOT NULL DEFAULT 'Parlamento',
  stability_modifier numeric NOT NULL DEFAULT 0,
  economic_modifier numeric NOT NULL DEFAULT 0,
  military_modifier numeric NOT NULL DEFAULT 0,
  influence_modifier numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#888888',
  icon text NOT NULL DEFAULT 'crown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.regime_profiles TO anon, authenticated;
GRANT ALL ON public.regime_profiles TO service_role;
ALTER TABLE public.regime_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regime profiles viewable by everyone"
  ON public.regime_profiles FOR SELECT USING (true);
CREATE POLICY "Admins manage regime profiles"
  ON public.regime_profiles FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.regime_profiles (regime, display_name, description, national_law_label, decree_label, leader_title, parliament_name, stability_modifier, economic_modifier, military_modifier, influence_modifier, color, icon) VALUES
  ('monarchy',    'Monarquia',     'Soberano hereditário concentra poder; decretos reais predominam.', 'Decreto Real', 'Édito Real', 'Monarca', 'Conselho da Coroa', 10, 0, 5, 5, '#a16207', 'crown'),
  ('republic',    'República',     'Representantes eleitos legislam em nome dos cidadãos.', 'Lei Federal', 'Decreto Presidencial', 'Presidente', 'Assembleia Nacional', 5, 5, 0, 5, '#1e3a8a', 'landmark'),
  ('theocracy',   'Teocracia',     'Autoridade religiosa exerce o poder; éditos sagrados regem a nação.', 'Édito Sagrado', 'Bula', 'Sumo Sacerdote', 'Sínodo', 5, -5, 5, 10, '#7c2d12', 'church'),
  ('oligarchy',   'Oligarquia',    'Conselho de elites controla as decisões; atos formais comandam.', 'Ato do Conselho', 'Resolução', 'Alto Conselheiro', 'Conselho dos Pares', 0, 10, 0, 0, '#374151', 'users'),
  ('democracy',   'Democracia',    'Cidadãos participam diretamente; leis populares emanam do povo.', 'Lei Popular', 'Decreto Cívico', 'Premier', 'Câmara Popular', 0, 5, -5, 10, '#0e7490', 'vote'),
  ('dictatorship','Ditadura',      'Poder absoluto centralizado num único líder; decretos são supremos.', 'Decreto Supremo', 'Ordem Executiva', 'Comandante Supremo', 'Junta Militar', -10, 0, 15, -5, '#7f1d1d', 'shield')
ON CONFLICT (regime) DO NOTHING;

-- =========== regime_transitions ===========
CREATE TABLE public.regime_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL,
  from_regime public.government_type NOT NULL,
  to_regime public.government_type NOT NULL,
  method text NOT NULL DEFAULT 'reform', -- reform | vote | coup
  initiated_by uuid NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'pending', -- pending | executed | rejected | cancelled
  parliamentary_vote_id uuid,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.regime_transitions TO anon, authenticated;
GRANT ALL ON public.regime_transitions TO service_role;
ALTER TABLE public.regime_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transitions viewable by everyone"
  ON public.regime_transitions FOR SELECT USING (true);
CREATE POLICY "Admins manage transitions"
  ON public.regime_transitions FOR ALL USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX idx_regime_transitions_territory ON public.regime_transitions(territory_id, created_at DESC);

-- =========== label helper ===========
CREATE OR REPLACE FUNCTION public.get_law_label(p_legal_level public.legal_level, p_territory_id uuid)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_legal_level = 'planetary' THEN 'Lei Planetária'
    WHEN p_legal_level = 'bloc' THEN 'Carta do Bloco'
    WHEN p_legal_level = 'national' THEN COALESCE(
      (SELECT rp.national_law_label
         FROM territories t
         JOIN regime_profiles rp ON rp.regime = t.government_type
        WHERE t.id = p_territory_id),
      'Lei Nacional')
    ELSE 'Norma'
  END
$$;

-- =========== auto-prefix national law names ===========
CREATE OR REPLACE FUNCTION public.prefix_national_law_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_label text;
BEGIN
  IF NEW.legal_level = 'national' AND NEW.territory_id IS NOT NULL THEN
    v_label := public.get_law_label('national'::legal_level, NEW.territory_id);
    IF NEW.name IS NOT NULL
       AND v_label IS NOT NULL
       AND position(lower(v_label) in lower(NEW.name)) = 0 THEN
      NEW.name := v_label || ': ' || NEW.name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prefix_national_law_name ON public.laws;
CREATE TRIGGER trg_prefix_national_law_name
  BEFORE INSERT ON public.laws
  FOR EACH ROW EXECUTE FUNCTION public.prefix_national_law_name();

-- =========== initiate regime change ===========
CREATE OR REPLACE FUNCTION public.initiate_regime_change(
  p_territory_id uuid,
  p_to_regime public.government_type,
  p_method text DEFAULT 'reform',
  p_rationale text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_territory record;
  v_last_change timestamptz;
  v_transition_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_territory FROM territories
    WHERE id = p_territory_id AND owner_id = auth.uid()
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Você não é o líder deste país';
  END IF;

  IF v_territory.government_type = p_to_regime THEN
    RAISE EXCEPTION 'O país já adota esse regime';
  END IF;

  IF p_method NOT IN ('reform','vote','coup') THEN
    RAISE EXCEPTION 'Método inválido';
  END IF;

  SELECT max(executed_at) INTO v_last_change FROM regime_transitions
    WHERE territory_id = p_territory_id AND status = 'executed';
  IF v_last_change IS NOT NULL AND v_last_change > now() - interval '90 days' THEN
    RAISE EXCEPTION 'Aguarde 90 dias entre mudanças de regime (última: %)', v_last_change;
  END IF;

  INSERT INTO regime_transitions (territory_id, from_regime, to_regime, method, initiated_by, rationale, status)
  VALUES (p_territory_id, v_territory.government_type, p_to_regime, p_method, auth.uid(), p_rationale, 'pending')
  RETURNING id INTO v_transition_id;

  -- Reform e coup são executados imediatamente; vote permanece pendente até apuração externa.
  IF p_method IN ('reform','coup') THEN
    UPDATE territories SET government_type = p_to_regime, updated_at = now()
      WHERE id = p_territory_id;
    UPDATE regime_transitions SET status='executed', executed_at = now(), updated_at = now()
      WHERE id = v_transition_id;
  END IF;

  RETURN v_transition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_regime_transition(p_transition_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_t record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT rt.*, t.owner_id INTO v_t FROM regime_transitions rt
    JOIN territories t ON t.id = rt.territory_id
    WHERE rt.id = p_transition_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transição não encontrada'; END IF;
  IF v_t.owner_id <> auth.uid() AND NOT has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF v_t.status <> 'pending' THEN
    RAISE EXCEPTION 'Transição não está pendente';
  END IF;

  UPDATE territories SET government_type = v_t.to_regime, updated_at = now()
    WHERE id = v_t.territory_id;
  UPDATE regime_transitions SET status='executed', executed_at = now(), updated_at = now()
    WHERE id = v_t.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initiate_regime_change(uuid, public.government_type, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_regime_transition(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_law_label(public.legal_level, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_regime_profiles_touch ON public.regime_profiles;
CREATE TRIGGER trg_regime_profiles_touch BEFORE UPDATE ON public.regime_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_regime_transitions_touch ON public.regime_transitions;
CREATE TRIGGER trg_regime_transitions_touch BEFORE UPDATE ON public.regime_transitions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
