-- Pick one suitable cell, prefer urban-eligible, with SKIP LOCKED to avoid races
SELECT c.*
INTO v_cell
FROM public.cells c
WHERE c.status = 'explored'
  AND c.owner_territory_id IS NULL
  AND c.population_density >= COALESCE(v_threshold, 0)
ORDER BY c.is_urban_eligible DESC, c.population_density DESC, c.area_km2 DESC
LIMIT 1
FOR UPDATE SKIP LOCKED;

IF NOT FOUND THEN
  RAISE EXCEPTION 'Nenhuma célula disponível para colonização';
END IF;

-- FIX: usar v_cell ao invés de c
v_is_urban := v_cell.is_urban_eligible;

-- Ensure resource balance exists
-- FIX: evitar ON CONFLICT em coluna sem índice único
PERFORM 1 FROM public.resource_balances WHERE territory_id = v_territory_id;
IF NOT FOUND THEN
  INSERT INTO public.resource_balances (territory_id, food, energy, minerals, tech, tick_number)
  VALUES (v_territory_id, 100, 100, 50, 10, 0);
END IF;