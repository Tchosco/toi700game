-- Enable RLS where required
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tick_logs ENABLE ROW LEVEL SECURITY;

-- Territories: owner can read/update own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='territories' AND policyname='territories_select_own'
  ) THEN
    CREATE POLICY territories_select_own ON public.territories
      FOR SELECT TO authenticated
      USING (owner_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='territories' AND policyname='territories_update_own'
  ) THEN
    CREATE POLICY territories_update_own ON public.territories
      FOR UPDATE TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END $$;

-- Cells: public read; updates restritas ao dono (apenas células do seu Estado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cells' AND policyname='cells_select_public'
  ) THEN
    CREATE POLICY cells_select_public ON public.cells
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cells' AND policyname='cells_update_owner_only'
  ) THEN
    CREATE POLICY cells_update_owner_only ON public.cells
      FOR UPDATE TO authenticated
      USING (
        owner_territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      )
      WITH CHECK (
        owner_territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Resource balances: apenas dono do território pode ler/alterar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='resource_balances' AND policyname='resource_balances_select_own'
  ) THEN
    CREATE POLICY resource_balances_select_own ON public.resource_balances
      FOR SELECT TO authenticated
      USING (
        territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='resource_balances' AND policyname='resource_balances_update_own'
  ) THEN
    CREATE POLICY resource_balances_update_own ON public.resource_balances
      FOR UPDATE TO authenticated
      USING (
        territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      )
      WITH CHECK (
        territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='resource_balances' AND policyname='resource_balances_insert_own'
  ) THEN
    CREATE POLICY resource_balances_insert_own ON public.resource_balances
      FOR INSERT TO authenticated
      WITH CHECK (
        territory_id IN (
          SELECT id FROM public.territories WHERE owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Event logs: leitura pública (interface), escrita via service-role/edge functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_logs' AND policyname='event_logs_select_public'
  ) THEN
    CREATE POLICY event_logs_select_public ON public.event_logs
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Tick logs: leitura pública (painéis), escrita por edge function (service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tick_logs' AND policyname='tick_logs_select_public'
  ) THEN
    CREATE POLICY tick_logs_select_public ON public.tick_logs
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- RPC: atomic update of resource_balances to prevent race conditions
CREATE OR REPLACE FUNCTION public.atomic_update_resource_balances(
  p_territory_id UUID,
  p_food NUMERIC,
  p_energy NUMERIC,
  p_minerals NUMERIC,
  p_tech NUMERIC,
  p_tick_number INTEGER
)
RETURNS TABLE (food NUMERIC, energy NUMERIC, minerals NUMERIC, tech NUMERIC, tick_number INTEGER)
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  rb_exists BOOLEAN;
BEGIN
  -- Lock the row to ensure atomic write
  SELECT EXISTS(
    SELECT 1 FROM public.resource_balances WHERE territory_id = p_territory_id
  ) INTO rb_exists;

  IF rb_exists THEN
    PERFORM 1 FROM public.resource_balances WHERE territory_id = p_territory_id FOR UPDATE;
    UPDATE public.resource_balances
    SET food = GREATEST(0, p_food),
        energy = GREATEST(0, p_energy),
        minerals = GREATEST(0, p_minerals),
        tech = GREATEST(0, p_tech),
        tick_number = p_tick_number,
        updated_at = NOW()
    WHERE territory_id = p_territory_id;
  ELSE
    INSERT INTO public.resource_balances(territory_id, food, energy, minerals, tech, tick_number, updated_at)
    VALUES (p_territory_id, GREATEST(0, p_food), GREATEST(0, p_energy), GREATEST(0, p_minerals), GREATEST(0, p_tech), p_tick_number, NOW());
  END IF;

  RETURN QUERY
  SELECT food, energy, minerals, tech, tick_number
  FROM public.resource_balances
  WHERE territory_id = p_territory_id;
END;
$$;