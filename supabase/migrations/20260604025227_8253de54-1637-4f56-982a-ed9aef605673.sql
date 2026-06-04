
-- =====================================================
-- 1. CONSTITUTIONAL AMENDMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.constitutional_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposer_user_id uuid NOT NULL,
  proposer_territory_id uuid,
  title text NOT NULL,
  rationale text NOT NULL,
  proposed_text text NOT NULL,
  target_section text,
  status text NOT NULL DEFAULT 'voting',
  votes_yes integer NOT NULL DEFAULT 0,
  votes_no integer NOT NULL DEFAULT 0,
  votes_abstain integer NOT NULL DEFAULT 0,
  voting_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  approved_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amendment_status_check CHECK (status IN ('draft','voting','approved','rejected','withdrawn'))
);

GRANT SELECT, INSERT, UPDATE ON public.constitutional_amendments TO authenticated;
GRANT SELECT ON public.constitutional_amendments TO anon;
GRANT ALL ON public.constitutional_amendments TO service_role;

ALTER TABLE public.constitutional_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amendments viewable by everyone"
  ON public.constitutional_amendments FOR SELECT USING (true);

CREATE POLICY "Active territory owners propose amendments"
  ON public.constitutional_amendments FOR INSERT
  WITH CHECK (
    auth.uid() = proposer_user_id
    AND EXISTS (
      SELECT 1 FROM public.territories
      WHERE owner_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Proposer can withdraw draft"
  ON public.constitutional_amendments FOR UPDATE
  USING (auth.uid() = proposer_user_id AND status IN ('draft','voting'));

CREATE POLICY "Admins manage amendments"
  ON public.constitutional_amendments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_amendments_status ON public.constitutional_amendments(status);

-- =====================================================
-- 2. AMENDMENT VOTES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.amendment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amendment_id uuid NOT NULL REFERENCES public.constitutional_amendments(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL,
  voter_territory_id uuid NOT NULL,
  vote text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vote_check CHECK (vote IN ('yes','no','abstain')),
  UNIQUE (amendment_id, voter_territory_id)
);

GRANT SELECT, INSERT ON public.amendment_votes TO authenticated;
GRANT ALL ON public.amendment_votes TO service_role;

ALTER TABLE public.amendment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votes viewable by everyone"
  ON public.amendment_votes FOR SELECT USING (true);

CREATE POLICY "Admins manage votes"
  ON public.amendment_votes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. SEED PLANETARY CONSTITUTION (idempotent)
-- =====================================================

DO $$
DECLARE
  v_full_text text := E'CONSTITUIÇÃO PLANETÁRIA DE TOI-700\n' ||
E'Promulgada pela Assembleia Fundadora dos Povos Colonos\n\n' ||
E'PREÂMBULO\n' ||
E'Nós, os povos das nações reunidas no planeta TOI-700, conscientes da fragilidade da vida fora do berço terrestre e da necessidade de cooperação entre micronações livres, instituímos esta Constituição como lei suprema do nosso mundo.\n\n' ||
E'TÍTULO I — DOS DIREITOS FUNDAMENTAIS\n' ||
E'Art. 1º. São invioláveis a vida, a liberdade de consciência, a livre expressão escrita e a propriedade legítima de cada cidadão de TOI-700.\n' ||
E'Art. 2º. É vedada qualquer forma de escravidão, tortura, perseguição religiosa ou política em qualquer território do planeta.\n' ||
E'Art. 3º. Toda pessoa tem direito ao acesso à água potável, alimento básico e energia mínima vital, cuja garantia é responsabilidade conjunta do território e do planeta.\n\n' ||
E'TÍTULO II — DA ORGANIZAÇÃO DOS PODERES PLANETÁRIOS\n' ||
E'Art. 4º. O poder planetário é tripartite: o Parlamento Planetário, a Suprema Corte Planetária e o Conselho Executivo Planetário.\n' ||
E'Art. 5º. Nenhum dos poderes pode legislar contra a presente Constituição ou os direitos fundamentais nela estabelecidos.\n\n' ||
E'TÍTULO III — DOS PAÍSES E SUA SOBERANIA\n' ||
E'Art. 6º. Cada país de TOI-700 é soberano em seu território, respeitada esta Constituição e as Leis Planetárias.\n' ||
E'Art. 7º. Cada país escolhe livremente seu regime político — monarquia, república, estado tecnocrático ou outros — desde que assegure os direitos do Título I.\n' ||
E'Art. 8º. É garantido a cada país o direito à autodefesa, ao comércio livre e à formação de blocos.\n\n' ||
E'TÍTULO IV — DOS BLOCOS GEOPOLÍTICOS\n' ||
E'Art. 9º. Países podem associar-se em blocos econômicos, militares, culturais ou científicos, regidos por Cartas de Bloco.\n' ||
E'Art. 10. Nenhuma Carta de Bloco pode contrariar esta Constituição ou as Leis Planetárias.\n\n' ||
E'TÍTULO V — DO PARLAMENTO PLANETÁRIO\n' ||
E'Art. 11. O Parlamento Planetário é composto por todos os países ativos, com voto híbrido proporcional à população e ao número de estados.\n' ||
E'Art. 12. Compete ao Parlamento aprovar Leis Planetárias, ratificar tratados e propor emendas a esta Constituição.\n\n' ||
E'TÍTULO VI — DA SUPREMA CORTE PLANETÁRIA\n' ||
E'Art. 13. A Suprema Corte julga conflitos legais entre leis de níveis distintos e disputas entre países ou blocos.\n' ||
E'Art. 14. Suas decisões são vinculantes em todo o planeta.\n\n' ||
E'TÍTULO VII — DO PROCESSO LEGISLATIVO\n' ||
E'Art. 15. Toda lei deve respeitar a hierarquia: Constituição > Leis Planetárias > Cartas de Bloco > Leis de Bloco > Leis Nacionais.\n' ||
E'Art. 16. Leis que conflitarem com norma superior são marcadas como inconstitucionais até revisão pela Suprema Corte.\n\n' ||
E'TÍTULO VIII — DAS EMENDAS\n' ||
E'Art. 17. Qualquer país ativo pode propor emendas a esta Constituição.\n' ||
E'Art. 18. A emenda é aprovada quando obtiver pelo menos dois terços dos votos válidos em até 7 dias de votação, sendo automaticamente incorporada ao texto constitucional.';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.laws
    WHERE legal_level = 'planetary' AND is_constitution = true AND status = 'enacted'
  ) THEN
    INSERT INTO public.laws (
      name, legal_level, category, description, full_text,
      status, is_constitution, enacted_at,
      population_sympathy, population_repulsion,
      positive_effects, negative_effects
    ) VALUES (
      'Constituição Planetária de TOI-700',
      'planetary',
      'constitutional',
      'Lei suprema do planeta TOI-700, garantindo direitos fundamentais e organizando os poderes planetários.',
      v_full_text,
      'enacted',
      true,
      now(),
      75, 10,
      '["Garante direitos fundamentais","Organiza poderes planetários","Permite emendas democráticas"]'::jsonb,
      '[]'::jsonb
    );
  END IF;
END $$;

-- =====================================================
-- 4. CONSTITUTIONALITY CHECK
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_law_conflicts(p_law_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_law RECORD;
  v_superior RECORD;
  v_conflicts jsonb := '[]'::jsonb;
  v_text text;
  v_super_text text;
  v_bloc_id uuid;
BEGIN
  SELECT * INTO v_law FROM public.laws WHERE id = p_law_id;
  IF v_law IS NULL THEN RETURN '[]'::jsonb; END IF;

  v_text := lower(coalesce(v_law.full_text,'') || ' ' || coalesce(v_law.description,'') || ' ' || coalesce(v_law.name,''));

  -- Skip self (constitution & planetary laws not constrained by lower ones; we still check planetary vs constitution)
  IF v_law.legal_level = 'planetary' AND v_law.is_constitution THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Find bloc when relevant
  IF v_law.legal_level = 'national' AND v_law.territory_id IS NOT NULL THEN
    SELECT bloc_id INTO v_bloc_id FROM public.bloc_memberships
    WHERE territory_id = v_law.territory_id AND status = 'active' LIMIT 1;
  END IF;

  FOR v_superior IN
    SELECT id, name, legal_level, is_constitution, full_text, description, negative_effects
    FROM public.laws
    WHERE status = 'enacted'
      AND id <> p_law_id
      AND (
        -- Always check constitution + planetary
        (legal_level = 'planetary')
        -- Bloc charter and bloc laws if this is a national/bloc law and we share a bloc
        OR (legal_level = 'bloc' AND bloc_id = v_bloc_id AND v_law.legal_level = 'national')
        OR (legal_level = 'bloc' AND bloc_id = v_law.bloc_id AND v_law.legal_level = 'bloc' AND v_law.is_constitution = false)
      )
  LOOP
    v_super_text := lower(coalesce(v_superior.full_text,'') || ' ' || coalesce(v_superior.description,''));

    -- Heuristic 1: explicit forbidden keywords vs superior right
    IF (v_text LIKE '%escravidão%' OR v_text LIKE '%escravidao%' OR v_text LIKE '%tortura%')
       AND (v_super_text LIKE '%escravidão%' OR v_super_text LIKE '%tortura%' OR v_superior.is_constitution) THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'superior_law_id', v_superior.id,
        'superior_law_name', v_superior.name,
        'level', v_superior.legal_level,
        'reason', 'Possível violação de direitos fundamentais (escravidão/tortura)'
      );
    END IF;

    -- Heuristic 2: censorship of press/expression
    IF (v_text LIKE '%censura%' OR v_text LIKE '%proibir imprensa%' OR v_text LIKE '%proibir expressão%')
       AND (v_super_text LIKE '%livre expressão%' OR v_super_text LIKE '%liberdade%' OR v_superior.is_constitution) THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'superior_law_id', v_superior.id,
        'superior_law_name', v_superior.name,
        'level', v_superior.legal_level,
        'reason', 'Possível violação da liberdade de expressão'
      );
    END IF;

    -- Heuristic 3: blocking essential resources (water/food/energy basic)
    IF (v_text LIKE '%proibir água%' OR v_text LIKE '%negar alimento%' OR v_text LIKE '%cortar energia vital%')
       AND (v_super_text LIKE '%água potável%' OR v_super_text LIKE '%alimento básico%' OR v_super_text LIKE '%energia mínima%') THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'superior_law_id', v_superior.id,
        'superior_law_name', v_superior.name,
        'level', v_superior.legal_level,
        'reason', 'Possível violação do direito a recursos vitais'
      );
    END IF;

    -- Heuristic 4: secession against planetary sovereignty
    IF v_law.legal_level = 'national' AND v_text LIKE '%secessão planetária%' THEN
      v_conflicts := v_conflicts || jsonb_build_object(
        'superior_law_id', v_superior.id,
        'superior_law_name', v_superior.name,
        'level', v_superior.legal_level,
        'reason', 'Tentativa de secessão fere a soberania planetária'
      );
    END IF;
  END LOOP;

  RETURN v_conflicts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_law_conflicts(uuid) TO authenticated, anon, service_role;

-- Trigger to populate legal_conflicts
CREATE OR REPLACE FUNCTION public.trg_check_law_conflicts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conflicts jsonb;
BEGIN
  IF NEW.status NOT IN ('proposed','enacted') THEN
    RETURN NEW;
  END IF;

  v_conflicts := public.check_law_conflicts(NEW.id);
  NEW.legal_conflicts := v_conflicts;

  IF jsonb_array_length(v_conflicts) > 0 THEN
    INSERT INTO public.legal_history (law_id, territory_id, action, description, old_status, new_status, performed_by)
    VALUES (NEW.id, NEW.territory_id, 'conflict_detected',
            'Conflito constitucional detectado: ' || v_conflicts::text,
            OLD.status, NEW.status, NEW.proposed_by);

    IF NEW.proposed_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, notification_type, title, message, data)
      VALUES (NEW.proposed_by, 'system',
              'Lei marcada como inconstitucional',
              'Sua lei "' || NEW.name || '" possui conflitos com normas superiores.',
              jsonb_build_object('law_id', NEW.id, 'conflicts', v_conflicts));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_law_conflicts_trigger ON public.laws;
CREATE TRIGGER check_law_conflicts_trigger
  BEFORE INSERT OR UPDATE OF status, full_text, description, name ON public.laws
  FOR EACH ROW EXECUTE FUNCTION public.trg_check_law_conflicts();

-- =====================================================
-- 5. AMENDMENT RPCs
-- =====================================================

CREATE OR REPLACE FUNCTION public.propose_amendment(
  p_title text,
  p_rationale text,
  p_proposed_text text,
  p_target_section text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_territory_id uuid;
  v_amendment_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  SELECT id INTO v_territory_id FROM public.territories
  WHERE owner_id = auth.uid() AND status = 'active' LIMIT 1;

  IF v_territory_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você precisa de um território ativo para propor emendas');
  END IF;

  IF length(coalesce(p_title,'')) < 5 OR length(coalesce(p_proposed_text,'')) < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Título e texto da emenda devem ser substanciais');
  END IF;

  INSERT INTO public.constitutional_amendments
    (proposer_user_id, proposer_territory_id, title, rationale, proposed_text, target_section, status)
  VALUES
    (auth.uid(), v_territory_id, p_title, p_rationale, p_proposed_text, p_target_section, 'voting')
  RETURNING id INTO v_amendment_id;

  RETURN jsonb_build_object('success', true, 'amendment_id', v_amendment_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_amendment(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cast_amendment_vote(
  p_amendment_id uuid,
  p_vote text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_territory_id uuid;
  v_amendment RECORD;
  v_existing RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado');
  END IF;

  IF p_vote NOT IN ('yes','no','abstain') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voto inválido');
  END IF;

  SELECT id INTO v_territory_id FROM public.territories
  WHERE owner_id = auth.uid() AND status = 'active' LIMIT 1;

  IF v_territory_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você precisa de um território ativo para votar');
  END IF;

  SELECT * INTO v_amendment FROM public.constitutional_amendments
  WHERE id = p_amendment_id FOR UPDATE;

  IF v_amendment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emenda não encontrada');
  END IF;

  IF v_amendment.status <> 'voting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Votação não está aberta');
  END IF;

  IF v_amendment.voting_ends_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prazo da votação encerrado');
  END IF;

  SELECT * INTO v_existing FROM public.amendment_votes
  WHERE amendment_id = p_amendment_id AND voter_territory_id = v_territory_id;

  IF v_existing IS NOT NULL THEN
    -- Revert previous and apply new
    UPDATE public.constitutional_amendments SET
      votes_yes = votes_yes - CASE WHEN v_existing.vote='yes' THEN 1 ELSE 0 END,
      votes_no = votes_no - CASE WHEN v_existing.vote='no' THEN 1 ELSE 0 END,
      votes_abstain = votes_abstain - CASE WHEN v_existing.vote='abstain' THEN 1 ELSE 0 END
    WHERE id = p_amendment_id;

    UPDATE public.amendment_votes SET vote = p_vote, created_at = now()
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.amendment_votes (amendment_id, voter_user_id, voter_territory_id, vote)
    VALUES (p_amendment_id, auth.uid(), v_territory_id, p_vote);
  END IF;

  UPDATE public.constitutional_amendments SET
    votes_yes = votes_yes + CASE WHEN p_vote='yes' THEN 1 ELSE 0 END,
    votes_no = votes_no + CASE WHEN p_vote='no' THEN 1 ELSE 0 END,
    votes_abstain = votes_abstain + CASE WHEN p_vote='abstain' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = p_amendment_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_amendment_vote(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_amendment(p_amendment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_amendment RECORD;
  v_total integer;
  v_approval_ratio numeric;
  v_constitution_id uuid;
  v_new_text text;
BEGIN
  SELECT * INTO v_amendment FROM public.constitutional_amendments
  WHERE id = p_amendment_id FOR UPDATE;

  IF v_amendment IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emenda não encontrada');
  END IF;

  IF v_amendment.status <> 'voting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Emenda não está em votação');
  END IF;

  IF v_amendment.voting_ends_at > now() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prazo da votação ainda não encerrou');
  END IF;

  v_total := v_amendment.votes_yes + v_amendment.votes_no;
  v_approval_ratio := CASE WHEN v_total = 0 THEN 0 ELSE v_amendment.votes_yes::numeric / v_total END;

  IF v_total > 0 AND v_approval_ratio >= (2.0/3.0) THEN
    -- Approve and apply to constitution
    SELECT id, full_text INTO v_constitution_id, v_new_text FROM public.laws
    WHERE legal_level = 'planetary' AND is_constitution = true AND status = 'enacted'
    ORDER BY enacted_at DESC LIMIT 1 FOR UPDATE;

    IF v_constitution_id IS NOT NULL THEN
      v_new_text := v_new_text || E'\n\n--- EMENDA Nº (' || to_char(now(),'YYYY-MM-DD') || ') ' || v_amendment.title || E' ---\n' || v_amendment.proposed_text;
      UPDATE public.laws SET full_text = v_new_text, updated_at = now() WHERE id = v_constitution_id;

      INSERT INTO public.legal_history (law_id, action, description, performed_by)
      VALUES (v_constitution_id, 'amendment_approved',
              'Emenda aprovada e incorporada: ' || v_amendment.title,
              v_amendment.proposer_user_id);
    END IF;

    UPDATE public.constitutional_amendments
    SET status = 'approved', approved_at = now(), applied_at = now(), updated_at = now()
    WHERE id = p_amendment_id;

    RETURN jsonb_build_object('success', true, 'result', 'approved', 'approval_ratio', v_approval_ratio);
  ELSE
    UPDATE public.constitutional_amendments
    SET status = 'rejected', updated_at = now()
    WHERE id = p_amendment_id;

    RETURN jsonb_build_object('success', true, 'result', 'rejected', 'approval_ratio', v_approval_ratio);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_amendment(uuid) TO authenticated;

-- updated_at trigger for amendments
CREATE TRIGGER amendments_updated_at
  BEFORE UPDATE ON public.constitutional_amendments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
