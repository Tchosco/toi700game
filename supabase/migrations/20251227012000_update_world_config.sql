-- Add/alter world configuration fields
ALTER TABLE public.world_config
  ADD COLUMN IF NOT EXISTS planet_total_area_km2 NUMERIC,
  ADD COLUMN IF NOT EXISTS proportion_dry_area NUMERIC,
  ADD COLUMN IF NOT EXISTS total_cells_land INTEGER,
  ADD COLUMN IF NOT EXISTS planet_released BOOLEAN DEFAULT false;

-- Ensure tick interval field exists and set default to 24
ALTER TABLE public.world_config
  ALTER COLUMN tick_interval_hours SET DEFAULT 24;

-- Update or insert world_config with requested values
DO $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.world_config) INTO v_exists;
  IF v_exists THEN
    UPDATE public.world_config
    SET
      planet_total_area_km2 = 714140000,
      proportion_dry_area = 0.45,
      total_planet_land_km2 = 321363000,
      cell_size_km2_default = 5000,
      total_cells_land = 64272,
      total_planet_population = 11000000000,
      tick_interval_hours = 24,
      planet_released = true,
      updated_at = NOW()
    WHERE id IS NOT NULL;
  ELSE
    INSERT INTO public.world_config (
      id,
      planet_total_area_km2,
      proportion_dry_area,
      total_planet_land_km2,
      cell_size_km2_default,
      total_cells_land,
      total_planet_population,
      tick_interval_hours,
      planet_released,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      714140000,
      0.45,
      321363000,
      5000,
      64272,
      11000000000,
      24,
      true,
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- Extend cells with new attributes for generation/backfill
ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS fertility NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS habitability NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mineral_richness NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy_potential NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urbanization_pull NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rural_share NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS urban_share NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS resource_nodes JSONB;

-- Add capacity to resource_balances to act as Warehouse capacity
ALTER TABLE public.resource_balances
  ADD COLUMN IF NOT EXISTS capacity_total INTEGER DEFAULT 10000;

-- Add aggregate counts to territories
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS cells_owned_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cities_owned_count INTEGER DEFAULT 0;

-- Helpful comments
COMMENT ON COLUMN public.cells.fertility IS 'Fertility index [0..1] used for food production';
COMMENT ON COLUMN public.cells.habitability IS 'Habitability index [0..1] used for growth';
COMMENT ON COLUMN public.cells.mineral_richness IS 'Mineral richness [0..1] used for minerals production';
COMMENT ON COLUMN public.cells.energy_potential IS 'Energy potential [0..1] used for energy production';
COMMENT ON COLUMN public.cells.urbanization_pull IS 'Urbanization attraction [0..1] used to split growth rural/urban';
COMMENT ON COLUMN public.cells.rural_share IS 'Share of population considered rural [0..1]';
COMMENT ON COLUMN public.cells.urban_share IS 'Share of population considered urban [0..1]';
COMMENT ON COLUMN public.cells.resource_nodes IS 'JSON payload describing resource nodes in the cell';
COMMENT ON COLUMN public.resource_balances.capacity_total IS 'Total warehouse capacity for the territory';
COMMENT ON COLUMN public.territories.cells_owned_count IS 'Number of cells owned by the territory';
COMMENT ON COLUMN public.territories.cities_owned_count IS 'Number of cities owned by the territory';