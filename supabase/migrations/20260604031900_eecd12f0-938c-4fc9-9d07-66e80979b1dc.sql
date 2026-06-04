
-- Guard function: profiles — block protected column writes by end-users
CREATE OR REPLACE FUNCTION public.guard_profiles_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.research_points IS DISTINCT FROM OLD.research_points
     OR NEW.development_points IS DISTINCT FROM OLD.development_points
     OR NEW.influence_points IS DISTINCT FROM OLD.influence_points THEN
    RAISE EXCEPTION 'Economy fields can only be modified by the server';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_profiles_update ON public.profiles;
CREATE TRIGGER trg_guard_profiles_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_update();

-- Guard function: territories — block protected stat writes by end-users
CREATE OR REPLACE FUNCTION public.guard_territories_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.pi_points IS DISTINCT FROM OLD.pi_points
     OR NEW.pd_points IS DISTINCT FROM OLD.pd_points
     OR NEW.stability IS DISTINCT FROM OLD.stability
     OR NEW.economy_rating IS DISTINCT FROM OLD.economy_rating
     OR NEW.research_bonus IS DISTINCT FROM OLD.research_bonus
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.total_urban_population IS DISTINCT FROM OLD.total_urban_population
     OR NEW.total_rural_population IS DISTINCT FROM OLD.total_rural_population
     OR NEW.government_type IS DISTINCT FROM OLD.government_type
     OR NEW.is_neutral IS DISTINCT FROM OLD.is_neutral
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
     OR NEW.region_id IS DISTINCT FROM OLD.region_id
     OR NEW.capital_city_id IS DISTINCT FROM OLD.capital_city_id THEN
    RAISE EXCEPTION 'These territory fields can only be modified by the server (use the appropriate RPC/edge function)';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_territories_update ON public.territories;
CREATE TRIGGER trg_guard_territories_update
BEFORE UPDATE ON public.territories
FOR EACH ROW EXECUTE FUNCTION public.guard_territories_update();

-- Guard function: laws — only draft laws editable by owners; never let owners change status/lifecycle
CREATE OR REPLACE FUNCTION public.guard_laws_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.enacted_at IS DISTINCT FROM OLD.enacted_at
     OR NEW.repealed_at IS DISTINCT FROM OLD.repealed_at
     OR NEW.is_constitution IS DISTINCT FROM OLD.is_constitution
     OR NEW.legal_level IS DISTINCT FROM OLD.legal_level
     OR NEW.territory_id IS DISTINCT FROM OLD.territory_id
     OR NEW.bloc_id IS DISTINCT FROM OLD.bloc_id THEN
    RAISE EXCEPTION 'Law lifecycle fields can only be modified via official process (parliamentary vote / RPC)';
  END IF;
  IF OLD.status <> 'draft'::law_status THEN
    RAISE EXCEPTION 'Only draft laws can be edited directly';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_laws_update ON public.laws;
CREATE TRIGGER trg_guard_laws_update
BEFORE UPDATE ON public.laws
FOR EACH ROW EXECUTE FUNCTION public.guard_laws_update();

-- Guard function: constitutional_amendments — block vote/status tampering
CREATE OR REPLACE FUNCTION public.guard_amendments_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- Vote counts immutable from the client
  IF NEW.votes_yes IS DISTINCT FROM OLD.votes_yes
     OR NEW.votes_no IS DISTINCT FROM OLD.votes_no
     OR NEW.votes_abstain IS DISTINCT FROM OLD.votes_abstain
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.applied_at IS DISTINCT FROM OLD.applied_at
     OR NEW.voting_ends_at IS DISTINCT FROM OLD.voting_ends_at
     OR NEW.proposer_user_id IS DISTINCT FROM OLD.proposer_user_id THEN
    RAISE EXCEPTION 'Amendment vote/lifecycle fields can only be modified by the server';
  END IF;
  -- Status: only allow draft -> withdrawn
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status = 'draft' AND NEW.status = 'withdrawn') THEN
      RAISE EXCEPTION 'Amendment status transitions are server-controlled';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_amendments_update ON public.constitutional_amendments;
CREATE TRIGGER trg_guard_amendments_update
BEFORE UPDATE ON public.constitutional_amendments
FOR EACH ROW EXECUTE FUNCTION public.guard_amendments_update();
