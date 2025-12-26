-- Add is_urban_eligible column to cells
ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS is_urban_eligible BOOLEAN NOT NULL DEFAULT false;

-- Add colonization cost tracking
ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS colonization_cost NUMERIC DEFAULT 0;

-- Create function to generate cells when a region becomes visible
CREATE OR REPLACE FUNCTION public.generate_region_cells(
  p_region_id UUID,
  p_num_cells INTEGER DEFAULT 10
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_difficulty region_difficulty;
  v_cell_size NUMERIC;
  v_urban_ratio NUMERIC;
  v_cells_created INTEGER := 0;
  v_is_urban BOOLEAN;
  v_urban_count INTEGER := 0;
  v_max_urban INTEGER;
  v_base_cost NUMERIC;
  i INTEGER;
BEGIN
  -- Get region difficulty
  SELECT difficulty INTO v_difficulty FROM regions WHERE id = p_region_id;
  
  -- Get world config
  SELECT cell_size_km2_default, max_urban_ratio 
  INTO v_cell_size, v_urban_ratio 
  FROM world_config LIMIT 1;
  
  -- Calculate max urban cells (20% of total)
  v_max_urban := CEIL(p_num_cells * LEAST(v_urban_ratio, 0.20));
  
  -- Calculate base colonization cost based on difficulty
  v_base_cost := CASE v_difficulty
    WHEN 'easy' THEN 100
    WHEN 'medium' THEN 250
    WHEN 'hard' THEN 500
    WHEN 'extreme' THEN 1000
    WHEN 'anomaly' THEN 2000
    ELSE 100
  END;
  
  -- Generate cells
  FOR i IN 1..p_num_cells LOOP
    -- Determine if this cell is urban-eligible (random, up to max)
    v_is_urban := false;
    IF v_urban_count < v_max_urban AND random() < 0.20 THEN
      v_is_urban := true;
      v_urban_count := v_urban_count + 1;
    END IF;
    
    INSERT INTO cells (
      region_id,
      status,
      cell_type,
      area_km2,
      is_urban_eligible,
      colonization_cost,
      explored_at
    ) VALUES (
      p_region_id,
      'explored',
      'rural',
      v_cell_size,
      v_is_urban,
      v_base_cost,
      now()
    );
    
    v_cells_created := v_cells_created + 1;
  END LOOP;
  
  RETURN v_cells_created;
END;
$$;

-- Create trigger to auto-generate cells when region becomes visible
CREATE OR REPLACE FUNCTION public.on_region_revealed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cells_to_generate INTEGER;
BEGIN
  -- Only trigger when is_visible changes from false to true
  IF OLD.is_visible = false AND NEW.is_visible = true THEN
    -- Calculate cells based on difficulty
    v_cells_to_generate := CASE NEW.difficulty
      WHEN 'easy' THEN 20
      WHEN 'medium' THEN 15
      WHEN 'hard' THEN 10
      WHEN 'extreme' THEN 5
      WHEN 'anomaly' THEN 3
      ELSE 10
    END;
    
    -- Generate cells for this region
    PERFORM generate_region_cells(NEW.id, v_cells_to_generate);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_region_revealed ON regions;
CREATE TRIGGER trigger_region_revealed
  AFTER UPDATE ON regions
  FOR EACH ROW
  EXECUTE FUNCTION on_region_revealed();

-- Add RLS policies for cells colonization
CREATE POLICY "Users can colonize explored cells" ON public.cells
FOR UPDATE USING (
  status = 'explored' AND owner_territory_id IS NULL
) WITH CHECK (
  status IN ('explored', 'colonized')
);