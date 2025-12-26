-- Create atomic function for territory creation with full rollback
CREATE OR REPLACE FUNCTION public.atomic_create_territory(
  p_user_id uuid,
  p_name text,
  p_region_id uuid,
  p_capital_name text,
  p_government_type government_type,
  p_style territory_style,
  p_lore text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_territory RECORD;
  v_region RECORD;
  v_cell RECORD;
  v_city_id uuid;
  v_territory_id uuid;
BEGIN
  -- Step 1: Check if user already has a territory
  SELECT id, name INTO v_existing_territory
  FROM territories
  WHERE owner_id = p_user_id
  LIMIT 1;
  
  IF v_existing_territory.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já possui o território "' || v_existing_territory.name || '". Cada usuário pode ter apenas um território.',
      'code', 'TERRITORY_EXISTS',
      'table', 'territories'
    );
  END IF;
  
  -- Step 2: Verify region exists and is visible
  SELECT id, name, is_visible INTO v_region
  FROM regions
  WHERE id = p_region_id;
  
  IF v_region.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Região não encontrada.',
      'code', 'REGION_NOT_FOUND',
      'table', 'regions'
    );
  END IF;
  
  IF NOT v_region.is_visible THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta região ainda não foi revelada para colonização.',
      'code', 'REGION_NOT_VISIBLE',
      'table', 'regions'
    );
  END IF;
  
  -- Step 3: Find and lock an available cell (FOR UPDATE to prevent race conditions)
  SELECT id INTO v_cell
  FROM cells
  WHERE region_id = p_region_id
    AND status = 'explored'
    AND owner_territory_id IS NULL
    AND city_id IS NULL
  ORDER BY is_urban_eligible DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- If no cell found, try to create one
  IF v_cell.id IS NULL THEN
    INSERT INTO cells (
      region_id,
      status,
      is_urban_eligible,
      cell_type,
      area_km2,
      colonization_cost,
      explored_at
    ) VALUES (
      p_region_id,
      'explored',
      true,
      'rural',
      7500,
      0,
      now()
    )
    RETURNING id INTO v_cell;
    
    IF v_cell.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Não foi possível criar uma célula para esta região.',
        'code', 'CELL_CREATE_ERROR',
        'table', 'cells'
      );
    END IF;
  END IF;
  
  -- Step 4: Create the capital city
  INSERT INTO cities (
    name,
    cell_id,
    region_id,
    status,
    is_neutral,
    population,
    urban_population
  ) VALUES (
    p_capital_name,
    v_cell.id,
    p_region_id,
    'occupied',
    false,
    1000,
    1000
  )
  RETURNING id INTO v_city_id;
  
  IF v_city_id IS NULL THEN
    -- This shouldn't happen due to transaction, but just in case
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao criar a cidade capital.',
      'code', 'CITY_CREATE_ERROR',
      'table', 'cities'
    );
  END IF;
  
  -- Step 5: Create the territory
  INSERT INTO territories (
    name,
    owner_id,
    capital_city_id,
    region_id,
    government_type,
    style,
    lore,
    accepted_statute,
    status,
    level,
    stability,
    economy_rating,
    treasury,
    total_urban_population,
    total_rural_population
  ) VALUES (
    p_name,
    p_user_id,
    v_city_id,
    p_region_id,
    p_government_type,
    p_style,
    p_lore,
    true,
    'pending',
    'colony',
    50,
    50,
    0,
    1000,
    0
  )
  RETURNING id INTO v_territory_id;
  
  IF v_territory_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create territory';
  END IF;
  
  -- Step 6: Update the cell to be colonized and linked
  UPDATE cells
  SET status = 'colonized',
      owner_territory_id = v_territory_id,
      colonized_by = p_user_id,
      colonized_at = now(),
      has_city = true,
      city_id = v_city_id,
      cell_type = 'urban',
      urban_population = 1000,
      updated_at = now()
  WHERE id = v_cell.id;
  
  -- Step 7: Link city to territory
  UPDATE cities
  SET owner_territory_id = v_territory_id
  WHERE id = v_city_id;
  
  -- Step 8: Create resource balance
  INSERT INTO resource_balances (territory_id, food, energy, minerals, tech)
  VALUES (v_territory_id, 100, 100, 50, 10);
  
  -- Step 9: Log the event
  INSERT INTO event_logs (event_type, territory_id, title, description, effects)
  VALUES (
    'territory_created',
    v_territory_id,
    'Território "' || p_name || '" criado',
    'Um novo território foi fundado na região ' || v_region.name || ' com a capital ' || p_capital_name || '.',
    jsonb_build_object(
      'capital_name', p_capital_name,
      'region_name', v_region.name,
      'government_type', p_government_type::text,
      'style', p_style::text
    )
  );
  
  -- Success!
  RETURN jsonb_build_object(
    'success', true,
    'territory_id', v_territory_id,
    'city_id', v_city_id,
    'cell_id', v_cell.id,
    'message', 'Território criado com sucesso! Aguarde a análise do Administrador Planetário.'
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Any error will cause automatic rollback of the entire transaction
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE,
    'table', 'unknown'
  );
END;
$$;