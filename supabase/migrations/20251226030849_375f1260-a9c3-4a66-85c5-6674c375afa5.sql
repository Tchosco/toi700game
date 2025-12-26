-- Add customization columns to territories
ALTER TABLE public.territories 
ADD COLUMN IF NOT EXISTS demonym text,
ADD COLUMN IF NOT EXISTS motto text,
ADD COLUMN IF NOT EXISTS official_color text DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS admin_style text DEFAULT 'centralized',
ADD COLUMN IF NOT EXISTS vocation text DEFAULT 'commercial';

-- Add focus columns to cells
ALTER TABLE public.cells
ADD COLUMN IF NOT EXISTS rural_focus text DEFAULT 'agricultural',
ADD COLUMN IF NOT EXISTS urban_focus text DEFAULT 'industrial',
ADD COLUMN IF NOT EXISTS focus_changed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS focus_penalty_until timestamp with time zone;

-- Create cell_cities junction for multiple cities per cell
CREATE TABLE IF NOT EXISTS public.cell_cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_id uuid NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(cell_id, city_id)
);

-- Enable RLS
ALTER TABLE public.cell_cities ENABLE ROW LEVEL SECURITY;

-- RLS policies for cell_cities
CREATE POLICY "Cell cities viewable by everyone" ON public.cell_cities
FOR SELECT USING (true);

CREATE POLICY "Admins manage cell cities" ON public.cell_cities
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Comments for documentation
COMMENT ON COLUMN public.territories.admin_style IS 'centralized, technocratic, military, mercantile';
COMMENT ON COLUMN public.territories.vocation IS 'agrarian, mineral, urban, scientific, military, commercial';
COMMENT ON COLUMN public.cells.rural_focus IS 'agricultural, mineral, energy';
COMMENT ON COLUMN public.cells.urban_focus IS 'industrial, commercial, scientific';