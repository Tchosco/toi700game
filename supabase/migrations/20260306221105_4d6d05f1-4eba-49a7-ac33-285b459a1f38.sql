
-- Advisory lock functions for tick concurrency control
CREATE OR REPLACE FUNCTION public.acquire_tick_lock()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN pg_try_advisory_lock(42);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_tick_lock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM pg_advisory_unlock(42);
END;
$$;

-- Atomic resource balance update
CREATE OR REPLACE FUNCTION public.atomic_update_resource_balances(
  p_territory_id uuid,
  p_food numeric,
  p_energy numeric,
  p_minerals numeric,
  p_tech numeric,
  p_tick_number integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE resource_balances
  SET food = p_food,
      energy = p_energy,
      minerals = p_minerals,
      tech = p_tech,
      tick_number = p_tick_number,
      updated_at = now()
  WHERE territory_id = p_territory_id;

  IF NOT FOUND THEN
    INSERT INTO resource_balances (territory_id, food, energy, minerals, tech, tick_number)
    VALUES (p_territory_id, p_food, p_energy, p_minerals, p_tech, p_tick_number);
  END IF;
END;
$$;

-- Add tick_number column to world_config if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'world_config' AND column_name = 'tick_number'
  ) THEN
    ALTER TABLE world_config ADD COLUMN tick_number integer DEFAULT 0;
  END IF;
END $$;
