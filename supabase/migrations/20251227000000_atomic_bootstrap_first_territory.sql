-- Create atomic function to bootstrap a user's first territory
CREATE OR REPLACE FUNCTION public.atomic_bootstrap_first_territory(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_territory public.territories%ROWTYPE;
  v_username TEXT;
  v_threshold NUMERIC;
  v_cell RECORD;
  v_territory_id UUID;
  v_primary_city_id UUID;
  v_city_id_2 UUID;
  v_city_id_3 UUID;
  v_is_urban BOOLEAN;
BEGIN
  -- If user already has a territory, return early
  SELECT * INTO v_existing_territory
  FROM public.territories
  WHERE owner_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_territory.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Usuário já possui território',
      'territory_id', v_existing_territory.id,
      'cell_id', NULL,
      'city_id', v_existing_territory.capital_city_id
    );
  END IF;

  -- Get username for naming
  SELECT COALESCE(username, 'Governante') INTO v_username
  FROM public.profiles
  WHERE id = p_user_id;

  -- Compute habitability threshold (top 40% by population_density among explored, unowned cells)
  SELECT percentile_cont(0.6) WITHIN GROUP (ORDER BY population_density)
  INTO v_threshold
  FROM public.cells
  WHERE status = 'explored' AND owner_territory_id IS NULL;

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

  v_is_urban := c.is_urban_eligible;

  -- Create territory (auto-approved/active)
  INSERT INTO public.territories (
    name, owner_id, region_id, status, level, style, government_type,
    accepted_statute, pd_points, pi_points, treasury, is_neutral
  )
  VALUES (
    CONCAT('Estado de ', v_username),
    p_user_id,
    v_cell.region_id,
    'active',
    'recognized',
    'cultural',
    'monarchy',
    true,
    0, 0, 1000, false
  )
  RETURNING id INTO v_territory_id;

  IF v_territory_id IS NULL THEN
    RAISE EXCEPTION 'Falha ao criar território';
  END IF;

  -- Colonize the selected cell for this territory
  UPDATE public.cells
  SET status = 'colonized',
      owner_territory_id = v_territory_id,
      colonized_by = p_user_id,
      colonized_at = NOW(),
      updated_at = NOW()
  WHERE id = v_cell.id
    AND status = 'explored'
    AND owner_territory_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Falha ao atualizar célula para colonizada';
  END IF;

  -- Create capital city/cities
  IF v_is_urban THEN
    -- Create 3 cities for urban cells
    INSERT INTO public.cities (name, cell_id, owner_territory_id, region_id, population, status, is_neutral)
    VALUES (CONCAT('Capital de ', v_username), v_cell.id, v_territory_id, v_cell.region_id, 5000, 'occupied', false)
    RETURNING id INTO v_primary_city_id;

    INSERT INTO public.cities (name, cell_id, owner_territory_id, region_id, population, status, is_neutral)
    VALUES (CONCAT(v_username, ' II'), v_cell.id, v_territory_id, v_cell.region_id, 3000, 'occupied', false)
    RETURNING id INTO v_city_id_2;

    INSERT INTO public.cities (name, cell_id, owner_territory_id, region_id, population, status, is_neutral)
    VALUES (CONCAT(v_username, ' III'), v_cell.id, v_territory_id, v_cell.region_id, 2000, 'occupied', false)
    RETURNING id INTO v_city_id_3;

    -- Link cities to cell and mark primary
    INSERT INTO public.cell_cities (cell_id, city_id, is_primary) VALUES (v_cell.id, v_primary_city_id, true);
    INSERT INTO public.cell_cities (cell_id, city_id, is_primary) VALUES (v_cell.id, v_city_id_2, false);
    INSERT INTO public.cell_cities (cell_id, city_id, is_primary) VALUES (v_cell.id, v_city_id_3, false);

    -- Update cell to reflect urbanization and primary city
    UPDATE public.cells
    SET has_city = true,
        city_id = v_primary_city_id,
        cell_type = 'urban',
        updated_at = NOW()
    WHERE id = v_cell.id;

  ELSE
    -- Rural cell: create 1 small city
    INSERT INTO public.cities (name, cell_id, owner_territory_id, region_id, population, status, is_neutral)
    VALUES (CONCAT('Capital de ', v_username), v_cell.id, v_territory_id, v_cell.region_id, 2000, 'occupied', false)
    RETURNING id INTO v_primary_city_id;

    INSERT INTO public.cell_cities (cell_id, city_id, is_primary) VALUES (v_cell.id, v_primary_city_id, true);

    UPDATE public.cells
    SET has_city = true,
        city_id = v_primary_city_id,
        cell_type = 'rural',
        updated_at = NOW()
    WHERE id = v_cell.id;
  END IF;

  -- Set capital city on territory
  UPDATE public.territories
  SET capital_city_id = v_primary_city_id,
      updated_at = NOW()
  WHERE id = v_territory_id;

  -- Ensure resource balance exists
  INSERT INTO public.resource_balances (territory_id, food, energy, minerals, tech, tick_number)
  VALUES (v_territory_id, 100, 100, 50, 10, 0)
  ON CONFLICT (territory_id) DO NOTHING;

  -- Log event
  INSERT INTO public.event_logs (territory_id, event_type, title, description, effects)
  VALUES (
    v_territory_id,
    'global',
    'Estado Inicial Criado',
    CONCAT('Território inicial de ', v_username, ' criado e capital fundada.'),
    json_build_object('cell_id', v_cell.id, 'capital_city_id', v_primary_city_id, 'is_urban', v_is_urban)
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Primeiro território criado automaticamente e capital fundada.',
    'territory_id', v_territory_id,
    'cell_id', v_cell.id,
    'city_id', v_primary_city_id,
    'auto_approved', true
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Any error triggers automatic rollback of the whole function
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'BOOTSTRAP_ERROR',
      'table', NULL
    );
END;
$$;