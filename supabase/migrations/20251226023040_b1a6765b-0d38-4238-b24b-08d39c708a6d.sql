-- Add population columns to cells
ALTER TABLE public.cells 
ADD COLUMN IF NOT EXISTS rural_population integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS urban_population integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS population_density numeric NOT NULL DEFAULT 0;

-- Add population columns to territories
ALTER TABLE public.territories
ADD COLUMN IF NOT EXISTS total_rural_population integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_urban_population integer NOT NULL DEFAULT 0;

-- Add population columns to cities
ALTER TABLE public.cities
ADD COLUMN IF NOT EXISTS urban_population integer NOT NULL DEFAULT 1000;

-- Add population tracking to world_config
ALTER TABLE public.world_config
ADD COLUMN IF NOT EXISTS total_planet_population bigint NOT NULL DEFAULT 10000000000,
ADD COLUMN IF NOT EXISTS active_urban_population bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_rural_population bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS latent_population bigint NOT NULL DEFAULT 10000000000;

-- Create population_stats table for historical tracking
CREATE TABLE IF NOT EXISTS public.population_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid REFERENCES public.territories(id) ON DELETE CASCADE,
  tick_number integer NOT NULL,
  urban_population integer NOT NULL DEFAULT 0,
  rural_population integer NOT NULL DEFAULT 0,
  migration_in integer NOT NULL DEFAULT 0,
  migration_out integer NOT NULL DEFAULT 0,
  growth_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on population_stats
ALTER TABLE public.population_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for population_stats
CREATE POLICY "Population stats viewable by everyone" 
ON public.population_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage population stats" 
ON public.population_stats 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Initialize rural population in existing cells based on area
-- Base: ~1333 people per km² for rural areas (10B / 7.5M km² average)
UPDATE public.cells
SET rural_population = CASE 
  WHEN status = 'blocked' THEN (area_km2 * 500)::integer  -- Lower density in blocked areas
  WHEN status = 'explored' THEN (area_km2 * 800)::integer  -- Medium density in explored
  WHEN status = 'colonized' THEN (area_km2 * 1000)::integer  -- Higher density in colonized
  ELSE (area_km2 * 500)::integer
END,
population_density = CASE 
  WHEN status = 'blocked' THEN 500
  WHEN status = 'explored' THEN 800
  WHEN status = 'colonized' THEN 1000
  ELSE 500
END;

-- Set urban population in cells with cities
UPDATE public.cells c
SET urban_population = COALESCE(
  (SELECT SUM(population) FROM public.cities WHERE cell_id = c.id), 0
)
WHERE has_city = true;