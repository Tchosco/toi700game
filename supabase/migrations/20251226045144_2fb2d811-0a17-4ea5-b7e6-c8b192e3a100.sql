-- Update world_config to ensure planet is fully unlocked
UPDATE world_config 
SET initial_playable_land_km2 = 269000000,
    latent_population = 10000000000,
    total_planet_population = 10000000000,
    total_planet_land_km2 = 269000000
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add resource fields to cells table if they don't exist
ALTER TABLE cells 
ADD COLUMN IF NOT EXISTS resource_food numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resource_energy numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resource_minerals numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resource_tech numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS resource_influence numeric NOT NULL DEFAULT 0;

-- Update all regions to be visible (fully unlocked planet)
UPDATE regions SET is_visible = true;

-- Update the atomic_create_territory function to auto-approve first territory
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_territory RECORD;
  v_region RECORD;
  v_cell RECORD;
  v_city_id uuid;
  v_territory_id uuid;
  v_is_first_territory BOOLEAN;
  v_initial_status territory_status;
  v_initial_urban_pop INTEGER;
  v_initial_rural_pop INTEGER;
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
  
  -- Check if this is the user's first territory ever (for auto-approval)
  v_is_first_territory := NOT EXISTS (
    SELECT 1 FROM territories WHERE owner_id = p_user_id
  );
  
  -- First territory is auto-approved, subsequent ones need review
  IF v_is_first_territory THEN
    v_initial_status := 'active';
    v_initial_urban_pop := 280000;  -- Average cell population
    v_initial_rural_pop := 0;
  ELSE
    v_initial_status := 'pending';
    v_initial_urban_pop := 1000;
    v_initial_rural_pop := 0;
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
  
  -- If no cell found, create one with resources
  IF v_cell.id IS NULL THEN
    INSERT INTO cells (
      region_id,
      status,
      is_urban_eligible,
      cell_type,
      area_km2,
      colonization_cost,
      explored_at,
      urban_population,
      rural_population,
      resource_food,
      resource_energy,
      resource_minerals,
      resource_tech,
      resource_influence
    ) VALUES (
      p_region_id,
      'explored',
      true,
      'urban',
      7500,
      0,
      now(),
      v_initial_urban_pop,
      v_initial_rural_pop,
      floor(random() * 50 + 20)::numeric,  -- Food 20-70
      floor(random() * 40 + 30)::numeric,  -- Energy 30-70
      floor(random() * 30 + 10)::numeric,  -- Minerals 10-40
      floor(random() * 60 + 40)::numeric,  -- Tech 40-100 (urban)
      floor(random() * 50 + 30)::numeric   -- Influence 30-80 (urban)
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
    v_initial_urban_pop,
    v_initial_urban_pop
  )
  RETURNING id INTO v_city_id;
  
  IF v_city_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Erro ao criar a cidade capital.',
      'code', 'CITY_CREATE_ERROR',
      'table', 'cities'
    );
  END IF;
  
  -- Step 5: Create the territory with auto-approved status for first territory
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
    v_initial_status,
    'colony',
    50,
    50,
    500,  -- Starting treasury
    v_initial_urban_pop,
    v_initial_rural_pop
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
      urban_population = v_initial_urban_pop,
      updated_at = now()
  WHERE id = v_cell.id;
  
  -- Step 7: Link city to territory
  UPDATE cities
  SET owner_territory_id = v_territory_id
  WHERE id = v_city_id;
  
  -- Step 8: Create resource balance with starting resources
  INSERT INTO resource_balances (territory_id, food, energy, minerals, tech)
  VALUES (v_territory_id, 500, 500, 200, 50);
  
  -- Step 9: Update world_config active population
  UPDATE world_config
  SET active_urban_population = active_urban_population + v_initial_urban_pop,
      latent_population = latent_population - v_initial_urban_pop
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  -- Step 10: Log the event
  INSERT INTO event_logs (event_type, territory_id, title, description, effects)
  VALUES (
    'territory_created',
    v_territory_id,
    'Território "' || p_name || '" ' || CASE WHEN v_is_first_territory THEN 'criado e ativado' ELSE 'criado' END,
    'Um novo território foi fundado na região ' || v_region.name || ' com a capital ' || p_capital_name || 
    CASE WHEN v_is_first_territory THEN '. Aprovação automática concedida.' ELSE '. Aguardando análise.' END,
    jsonb_build_object(
      'capital_name', p_capital_name,
      'region_name', v_region.name,
      'government_type', p_government_type::text,
      'style', p_style::text,
      'auto_approved', v_is_first_territory,
      'initial_population', v_initial_urban_pop
    )
  );
  
  -- Success message varies based on auto-approval
  RETURN jsonb_build_object(
    'success', true,
    'territory_id', v_territory_id,
    'city_id', v_city_id,
    'cell_id', v_cell.id,
    'auto_approved', v_is_first_territory,
    'message', CASE 
      WHEN v_is_first_territory THEN 'Território criado e ativado automaticamente! Bem-vindo ao TOI-700!'
      ELSE 'Território criado com sucesso! Aguarde a análise do Administrador Planetário.'
    END
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE,
    'table', 'unknown'
  );
END;
$function$;

-- Create function to generate cells with population and resources for a region
CREATE OR REPLACE FUNCTION public.generate_populated_cells(
  p_region_id uuid, 
  p_num_cells integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cells_created INTEGER := 0;
  v_is_urban BOOLEAN;
  v_urban_count INTEGER := 0;
  v_max_urban INTEGER;
  v_pop_urban INTEGER;
  v_pop_rural INTEGER;
  v_food NUMERIC;
  v_energy NUMERIC;
  v_minerals NUMERIC;
  v_tech NUMERIC;
  v_influence NUMERIC;
  i INTEGER;
BEGIN
  -- 20% urban cells
  v_max_urban := CEIL(p_num_cells * 0.20);
  
  FOR i IN 1..p_num_cells LOOP
    -- Determine if urban
    IF v_urban_count < v_max_urban AND random() < 0.20 THEN
      v_is_urban := true;
      v_urban_count := v_urban_count + 1;
      -- Urban cell: ~766,000 population
      v_pop_urban := floor(random() * 200000 + 666000)::integer;
      v_pop_rural := floor(random() * 50000)::integer;
      -- Urban resources: high tech and influence
      v_food := floor(random() * 30 + 10)::numeric;
      v_energy := floor(random() * 50 + 40)::numeric;
      v_minerals := floor(random() * 20 + 10)::numeric;
      v_tech := floor(random() * 60 + 40)::numeric;
      v_influence := floor(random() * 50 + 30)::numeric;
    ELSE
      v_is_urban := false;
      -- Rural cell: ~157,000 population
      v_pop_urban := floor(random() * 30000)::integer;
      v_pop_rural := floor(random() * 50000 + 127000)::integer;
      -- Rural resources: high food and minerals
      v_food := floor(random() * 60 + 40)::numeric;
      v_energy := floor(random() * 40 + 30)::numeric;
      v_minerals := floor(random() * 50 + 30)::numeric;
      v_tech := floor(random() * 20 + 5)::numeric;
      v_influence := floor(random() * 20 + 10)::numeric;
    END IF;
    
    INSERT INTO cells (
      region_id,
      status,
      cell_type,
      area_km2,
      is_urban_eligible,
      colonization_cost,
      explored_at,
      urban_population,
      rural_population,
      population_density,
      resource_food,
      resource_energy,
      resource_minerals,
      resource_tech,
      resource_influence
    ) VALUES (
      p_region_id,
      'explored',
      CASE WHEN v_is_urban THEN 'urban' ELSE 'rural' END,
      7500,
      v_is_urban,
      100,
      now(),
      v_pop_urban,
      v_pop_rural,
      (v_pop_urban + v_pop_rural)::numeric / 7500,
      v_food,
      v_energy,
      v_minerals,
      v_tech,
      v_influence
    );
    
    v_cells_created := v_cells_created + 1;
  END LOOP;
  
  RETURN v_cells_created;
END;
$function$;