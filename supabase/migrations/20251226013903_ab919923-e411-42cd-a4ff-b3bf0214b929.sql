-- ==================================================
-- TOI-700 COMPLETE DATA MODEL MIGRATION
-- ==================================================

-- 1) ENUMS
-- ==================================================

-- Region difficulty enum
DO $$ BEGIN
  CREATE TYPE region_difficulty AS ENUM ('easy', 'medium', 'hard', 'extreme', 'anomaly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Market listing type enum
DO $$ BEGIN
  CREATE TYPE listing_type AS ENUM ('sell', 'buy');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Market listing status enum
DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('open', 'partially_filled', 'filled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Market resource types (expanded)
DO $$ BEGIN
  CREATE TYPE market_resource_type AS ENUM ('food', 'energy', 'minerals', 'tech', 'token_city', 'token_land', 'token_state');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trade deal status
DO $$ BEGIN
  CREATE TYPE trade_deal_status AS ENUM ('proposed', 'accepted', 'rejected', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Research project status
DO $$ BEGIN
  CREATE TYPE research_project_status AS ENUM ('active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- War status (if not exists, update existing)
DO $$ BEGIN
  CREATE TYPE war_game_status AS ENUM ('declared', 'ongoing', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- 2) WORLD CONFIG TABLE (Singleton)
-- ==================================================

CREATE TABLE IF NOT EXISTS public.world_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_size_km2_default numeric NOT NULL DEFAULT 7500,
  initial_playable_land_km2 numeric NOT NULL DEFAULT 30000000,
  total_planet_land_km2 numeric NOT NULL DEFAULT 269000000,
  max_urban_ratio numeric NOT NULL DEFAULT 0.20,
  tick_interval_hours integer NOT NULL DEFAULT 24,
  season_day integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.world_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "World config viewable by everyone" ON public.world_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage world config" ON public.world_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_world_config_updated_at
  BEFORE UPDATE ON public.world_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 3) UPDATE REGIONS TABLE
-- ==================================================

ALTER TABLE public.regions 
  ADD COLUMN IF NOT EXISTS difficulty region_difficulty NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS required_research_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_regions_updated_at ON public.regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 4) UPDATE PROFILES TABLE (Player data)
-- ==================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS currency numeric NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS research_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS development_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS influence_points integer NOT NULL DEFAULT 0;


-- 5) UPDATE TERRITORIES TABLE (State/Country)
-- ==================================================

-- Add treasury column if not exists
ALTER TABLE public.territories
  ADD COLUMN IF NOT EXISTS treasury numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_neutral boolean NOT NULL DEFAULT false;


-- 6) CITY PROFILES TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.city_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  base_outputs_per_tick jsonb NOT NULL DEFAULT '{"food": 10, "energy": 10, "minerals": 5, "tech": 2}'::jsonb,
  base_research_per_tick integer NOT NULL DEFAULT 1,
  maintenance_cost_per_tick numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.city_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "City profiles viewable by everyone" ON public.city_profiles FOR SELECT USING (true);
CREATE POLICY "Admins can manage city profiles" ON public.city_profiles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger
CREATE TRIGGER update_city_profiles_updated_at
  BEFORE UPDATE ON public.city_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 7) UPDATE CITIES TABLE
-- ==================================================

ALTER TABLE public.cities
  ADD COLUMN IF NOT EXISTS population integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.city_profiles(id);


-- 8) UPDATE CELLS TABLE
-- ==================================================

ALTER TABLE public.cells
  ADD COLUMN IF NOT EXISTS has_city boolean NOT NULL DEFAULT false;


-- 9) RESOURCE BALANCE TABLE (per State/Territory per tick)
-- ==================================================

CREATE TABLE IF NOT EXISTS public.resource_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  food numeric NOT NULL DEFAULT 0,
  energy numeric NOT NULL DEFAULT 0,
  minerals numeric NOT NULL DEFAULT 0,
  tech numeric NOT NULL DEFAULT 0,
  tick_number integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(territory_id)
);

-- Enable RLS
ALTER TABLE public.resource_balances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Resource balances viewable by everyone" ON public.resource_balances FOR SELECT USING (true);
CREATE POLICY "Admins manage resource balances" ON public.resource_balances FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger
CREATE TRIGGER update_resource_balances_updated_at
  BEFORE UPDATE ON public.resource_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 10) MARKET LISTINGS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.market_listings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  seller_user_id uuid NOT NULL,
  resource_type market_resource_type NOT NULL,
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  listing_type listing_type NOT NULL DEFAULT 'sell',
  status listing_status NOT NULL DEFAULT 'open',
  filled_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Market listings viewable by everyone" ON public.market_listings FOR SELECT USING (true);
CREATE POLICY "Users can create own listings" ON public.market_listings FOR INSERT WITH CHECK (auth.uid() = seller_user_id);
CREATE POLICY "Users can update own listings" ON public.market_listings FOR UPDATE USING (auth.uid() = seller_user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete listings" ON public.market_listings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger
CREATE TRIGGER update_market_listings_updated_at
  BEFORE UPDATE ON public.market_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 11) TRADE DEALS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.trade_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  to_territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  offer jsonb NOT NULL DEFAULT '{}'::jsonb,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  status trade_deal_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_deals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Trade deals viewable by participants" ON public.trade_deals FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Users can create trade deals from own territory" ON public.trade_deals FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Participants can update trade deals" ON public.trade_deals FOR UPDATE USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admins can delete trade deals" ON public.trade_deals FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger
CREATE TRIGGER update_trade_deals_updated_at
  BEFORE UPDATE ON public.trade_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 12) RESEARCH PROJECTS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.research_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  target_region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  cost_research_points_total integer NOT NULL DEFAULT 100,
  progress_research_points integer NOT NULL DEFAULT 0,
  status research_project_status NOT NULL DEFAULT 'active',
  created_by_territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  created_by_user_id uuid,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Research projects viewable by everyone" ON public.research_projects FOR SELECT USING (true);
CREATE POLICY "Users can create research projects" ON public.research_projects FOR INSERT WITH CHECK (auth.uid() = created_by_user_id);
CREATE POLICY "Creators and admins can update" ON public.research_projects FOR UPDATE USING (
  auth.uid() = created_by_user_id OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admins can delete research projects" ON public.research_projects FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger
CREATE TRIGGER update_research_projects_updated_at
  BEFORE UPDATE ON public.research_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- 13) WAR TURN LOGS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.war_turn_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  war_id uuid NOT NULL REFERENCES public.wars(id) ON DELETE CASCADE,
  tick_number integer NOT NULL,
  attacker_power numeric NOT NULL DEFAULT 0,
  defender_power numeric NOT NULL DEFAULT 0,
  result_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.war_turn_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "War turn logs viewable by everyone" ON public.war_turn_logs FOR SELECT USING (true);
CREATE POLICY "Admins can manage war turn logs" ON public.war_turn_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));


-- 14) UPDATE WARS TABLE - add target_cells
-- ==================================================

ALTER TABLE public.wars
  ADD COLUMN IF NOT EXISTS target_cells jsonb DEFAULT '[]'::jsonb;


-- 15) RESEARCH CONTRIBUTIONS TABLE
-- ==================================================

CREATE TABLE IF NOT EXISTS public.research_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  points_contributed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_contributions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Research contributions viewable by everyone" ON public.research_contributions FOR SELECT USING (true);
CREATE POLICY "Users can add contributions" ON public.research_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage contributions" ON public.research_contributions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));


-- 16) INSERT DEFAULT DATA
-- ==================================================

-- Insert default world config (singleton)
INSERT INTO public.world_config (id, cell_size_km2_default, initial_playable_land_km2, total_planet_land_km2, max_urban_ratio, tick_interval_hours, season_day)
VALUES ('00000000-0000-0000-0000-000000000001', 7500, 30000000, 269000000, 0.20, 24, 1)
ON CONFLICT (id) DO NOTHING;

-- Insert default city profiles
INSERT INTO public.city_profiles (id, name, description, base_outputs_per_tick, base_research_per_tick, maintenance_cost_per_tick)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'Agrícola', 'Cidade focada em produção de alimentos', '{"food": 25, "energy": 5, "minerals": 5, "tech": 1}'::jsonb, 1, 40),
  ('00000000-0000-0000-0000-000000000011', 'Industrial', 'Cidade focada em mineração e produção', '{"food": 5, "energy": 15, "minerals": 20, "tech": 3}'::jsonb, 2, 60),
  ('00000000-0000-0000-0000-000000000012', 'Energética', 'Cidade focada em produção de energia', '{"food": 5, "energy": 30, "minerals": 5, "tech": 2}'::jsonb, 1, 50),
  ('00000000-0000-0000-0000-000000000013', 'Tecnológica', 'Cidade focada em pesquisa e tecnologia', '{"food": 5, "energy": 10, "minerals": 5, "tech": 15}'::jsonb, 10, 80),
  ('00000000-0000-0000-0000-000000000014', 'Balanceada', 'Cidade com produção equilibrada', '{"food": 10, "energy": 10, "minerals": 10, "tech": 5}'::jsonb, 3, 50)
ON CONFLICT (id) DO NOTHING;

-- Create neutral planetary administration territory
INSERT INTO public.territories (id, name, government_type, status, level, is_neutral, accepted_statute, stability, economy_rating)
VALUES ('00000000-0000-0000-0000-000000000100', 'Administração Planetária', 'republic', 'active', 'power', true, true, 100, 100)
ON CONFLICT (id) DO NOTHING;

-- Update default regions with difficulty
UPDATE public.regions SET difficulty = 'easy', is_visible = true WHERE difficulty IS NULL OR difficulty = 'easy';
