
-- =========================================================
-- SUPREME COURT TABLES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.supreme_court_justices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number int NOT NULL UNIQUE CHECK (seat_number BETWEEN 1 AND 7),
  territory_id uuid,
  elected_at timestamptz,
  term_ends_at timestamptz,
  status text NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant','active','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supreme_court_justices TO anon, authenticated;
GRANT ALL ON public.supreme_court_justices TO service_role;
ALTER TABLE public.supreme_court_justices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Justices viewable by everyone" ON public.supreme_court_justices FOR SELECT USING (true);
CREATE POLICY "Admins manage justices" ON public.supreme_court_justices FOR ALL USING (has_role(auth.uid(),'admin'));

-- Seed 7 vacant seats
INSERT INTO public.supreme_court_justices (seat_number, status)
SELECT s, 'vacant' FROM generate_series(1,7) s
ON CONFLICT (seat_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.supreme_court_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number serial UNIQUE,
  case_type text NOT NULL CHECK (case_type IN ('constitutional_review','interpretation','sanction_appeal')),
  target_law_id uuid,
  target_territory_id uuid,
  title text NOT NULL,
  rationale text NOT NULL,
  plaintiff_user_id uuid NOT NULL,
  plaintiff_territory_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','deliberating','closed','dismissed')),
  result text CHECK (result IN ('unconstitutional','constitutional','dismissed','inadmissible')),
  votes_yes int NOT NULL DEFAULT 0,
  votes_no int NOT NULL DEFAULT 0,
  votes_abstain int NOT NULL DEFAULT 0,
  filed_at timestamptz NOT NULL DEFAULT now(),
  ruling_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supreme_court_cases TO anon, authenticated;
GRANT INSERT ON public.supreme_court_cases TO authenticated;
GRANT ALL ON public.supreme_court_cases TO service_role;
ALTER TABLE public.supreme_court_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cases viewable by everyone" ON public.supreme_court_cases FOR SELECT USING (true);
CREATE POLICY "Active territory owners file cases" ON public.supreme_court_cases FOR INSERT
  WITH CHECK (
    auth.uid() = plaintiff_user_id
    AND EXISTS (SELECT 1 FROM territories WHERE owner_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Admins manage cases" ON public.supreme_court_cases FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.supreme_court_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.supreme_court_cases(id) ON DELETE CASCADE,
  justice_id uuid NOT NULL REFERENCES public.supreme_court_justices(id) ON DELETE CASCADE,
  voter_user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes','no','abstain')),
  opinion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, justice_id)
);
GRANT SELECT ON public.supreme_court_votes TO anon, authenticated;
GRANT ALL ON public.supreme_court_votes TO service_role;
ALTER TABLE public.supreme_court_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Court votes viewable by everyone" ON public.supreme_court_votes FOR SELECT USING (true);
CREATE POLICY "Admins manage court votes" ON public.supreme_court_votes FOR ALL USING (has_role(auth.uid(),'admin'));

-- =========================================================
-- RPC: open_planetary_vote
-- =========================================================
CREATE OR REPLACE FUNCTION public.open_planetary_vote(
  _title text,
  _description text,
  _vote_type vote_type,
  _subject_id uuid DEFAULT NULL,
  _duration_days int DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _vote_id uuid;
  _eligible int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM territories WHERE owner_id = _uid AND status = 'active') THEN
    RAISE EXCEPTION 'voce precisa de um territorio ativo';
  END IF;
  IF coalesce(trim(_title),'') = '' THEN RAISE EXCEPTION 'titulo obrigatorio'; END IF;
  IF _duration_days < 1 OR _duration_days > 14 THEN
    RAISE EXCEPTION 'duracao invalida (1-14 dias)';
  END IF;

  SELECT count(*) INTO _eligible FROM territories WHERE status = 'active';

  INSERT INTO parliamentary_votes (
    title, description, vote_type, subject_id, legal_level,
    voting_starts_at, voting_ends_at, total_eligible, status
  ) VALUES (
    _title, _description, _vote_type, _subject_id, 'planetary',
    now(), now() + (_duration_days || ' days')::interval, _eligible, 'open'
  ) RETURNING id INTO _vote_id;

  RETURN _vote_id;
END;
$$;
REVOKE ALL ON FUNCTION public.open_planetary_vote(text,text,vote_type,uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_planetary_vote(text,text,vote_type,uuid,int) TO authenticated;

-- =========================================================
-- RPC: finalize_parliamentary_vote
-- =========================================================
CREATE OR REPLACE FUNCTION public.finalize_parliamentary_vote(_vote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v parliamentary_votes%ROWTYPE;
  _result text;
  _seat int;
  _territory_id uuid;
BEGIN
  SELECT * INTO v FROM parliamentary_votes WHERE id = _vote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'votacao nao encontrada'; END IF;
  IF v.status <> 'open' THEN RETURN jsonb_build_object('already_closed', true); END IF;
  IF v.voting_ends_at > now() THEN RAISE EXCEPTION 'votacao ainda esta aberta'; END IF;

  _result := CASE WHEN v.votes_yes > v.votes_no THEN 'approved' ELSE 'rejected' END;

  UPDATE parliamentary_votes
    SET status = 'closed', result = _result, updated_at = now()
    WHERE id = _vote_id;

  -- Apply effects
  IF _result = 'approved' THEN
    IF v.vote_type = 'law' AND v.subject_id IS NOT NULL THEN
      UPDATE laws SET status = 'enacted', enacted_at = now(), updated_at = now()
        WHERE id = v.subject_id AND status <> 'enacted';
    ELSIF v.vote_type = 'justice_election' AND v.subject_id IS NOT NULL THEN
      _territory_id := v.subject_id;
      SELECT seat_number INTO _seat
        FROM supreme_court_justices
        WHERE status = 'vacant'
        ORDER BY seat_number LIMIT 1;
      IF _seat IS NOT NULL THEN
        UPDATE supreme_court_justices
          SET territory_id = _territory_id,
              status = 'active',
              elected_at = now(),
              term_ends_at = now() + interval '90 days',
              updated_at = now()
          WHERE seat_number = _seat;
      END IF;
    END IF;
  END IF;

  INSERT INTO diplomatic_history (event_type, title, description)
  VALUES ('parliamentary_vote_closed',
          'Votação encerrada: ' || v.title,
          'Resultado: ' || _result || ' (Sim ' || v.votes_yes || ' / Não ' || v.votes_no || ')');

  RETURN jsonb_build_object('result', _result, 'votes_yes', v.votes_yes, 'votes_no', v.votes_no);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_parliamentary_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_parliamentary_vote(uuid) TO authenticated;

-- =========================================================
-- RPC: file_supreme_court_case
-- =========================================================
CREATE OR REPLACE FUNCTION public.file_supreme_court_case(
  _case_type text,
  _title text,
  _rationale text,
  _target_law_id uuid DEFAULT NULL,
  _target_territory_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _terr uuid;
  _case_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT id INTO _terr FROM territories WHERE owner_id = _uid AND status = 'active' LIMIT 1;
  IF _terr IS NULL THEN RAISE EXCEPTION 'voce precisa de um territorio ativo'; END IF;
  IF _case_type NOT IN ('constitutional_review','interpretation','sanction_appeal') THEN
    RAISE EXCEPTION 'tipo invalido';
  END IF;
  IF _case_type = 'constitutional_review' AND _target_law_id IS NULL THEN
    RAISE EXCEPTION 'lei alvo obrigatoria';
  END IF;

  INSERT INTO supreme_court_cases (
    case_type, title, rationale,
    target_law_id, target_territory_id,
    plaintiff_user_id, plaintiff_territory_id,
    status
  ) VALUES (
    _case_type, _title, _rationale,
    _target_law_id, _target_territory_id,
    _uid, _terr,
    'deliberating'
  ) RETURNING id INTO _case_id;

  RETURN _case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.file_supreme_court_case(text,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.file_supreme_court_case(text,text,text,uuid,uuid) TO authenticated;

-- =========================================================
-- RPC: cast_justice_vote
-- =========================================================
CREATE OR REPLACE FUNCTION public.cast_justice_vote(
  _case_id uuid,
  _vote text,
  _opinion text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _justice supreme_court_justices%ROWTYPE;
  _case supreme_court_cases%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _vote NOT IN ('yes','no','abstain') THEN RAISE EXCEPTION 'voto invalido'; END IF;

  SELECT j.* INTO _justice
    FROM supreme_court_justices j
    JOIN territories t ON t.id = j.territory_id
    WHERE j.status = 'active' AND t.owner_id = _uid
    LIMIT 1;
  IF _justice.id IS NULL THEN RAISE EXCEPTION 'voce nao e juiz da Suprema Corte'; END IF;

  SELECT * INTO _case FROM supreme_court_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'caso nao encontrado'; END IF;
  IF _case.status NOT IN ('open','deliberating') THEN RAISE EXCEPTION 'caso fechado'; END IF;

  INSERT INTO supreme_court_votes (case_id, justice_id, voter_user_id, vote, opinion)
  VALUES (_case_id, _justice.id, _uid, _vote, _opinion);

  UPDATE supreme_court_cases SET
    votes_yes = votes_yes + CASE WHEN _vote='yes' THEN 1 ELSE 0 END,
    votes_no = votes_no + CASE WHEN _vote='no' THEN 1 ELSE 0 END,
    votes_abstain = votes_abstain + CASE WHEN _vote='abstain' THEN 1 ELSE 0 END,
    updated_at = now()
  WHERE id = _case_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cast_justice_vote(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_justice_vote(uuid,text,text) TO authenticated;

-- =========================================================
-- RPC: finalize_supreme_court_case
-- =========================================================
CREATE OR REPLACE FUNCTION public.finalize_supreme_court_case(_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c supreme_court_cases%ROWTYPE;
  _result text;
BEGIN
  SELECT * INTO c FROM supreme_court_cases WHERE id = _case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'caso nao encontrado'; END IF;
  IF c.status = 'closed' THEN RETURN jsonb_build_object('already_closed', true); END IF;
  IF (c.votes_yes + c.votes_no + c.votes_abstain) < 4 THEN
    RAISE EXCEPTION 'quorum minimo de 4 juizes nao atingido';
  END IF;

  IF c.votes_yes >= 4 THEN
    _result := CASE WHEN c.case_type = 'constitutional_review' THEN 'unconstitutional' ELSE 'dismissed' END;
  ELSE
    _result := CASE WHEN c.case_type = 'constitutional_review' THEN 'constitutional' ELSE 'inadmissible' END;
  END IF;

  UPDATE supreme_court_cases
    SET status = 'closed', result = _result, ruling_at = now(), updated_at = now()
    WHERE id = _case_id;

  -- Effects
  IF _result = 'unconstitutional' AND c.target_law_id IS NOT NULL THEN
    UPDATE laws SET status = 'repealed', repealed_at = now(), updated_at = now()
      WHERE id = c.target_law_id;
    INSERT INTO legal_history (law_id, action, description, performed_by)
    VALUES (c.target_law_id, 'judicial_repeal',
            'Lei revogada pela Suprema Corte (caso #' || c.case_number || ')',
            c.plaintiff_user_id);
  END IF;

  INSERT INTO diplomatic_history (event_type, title, description)
  VALUES ('supreme_court_ruling',
          'Suprema Corte: ' || c.title,
          'Resultado: ' || _result);

  RETURN jsonb_build_object('result', _result);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_supreme_court_case(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_supreme_court_case(uuid) TO authenticated;
