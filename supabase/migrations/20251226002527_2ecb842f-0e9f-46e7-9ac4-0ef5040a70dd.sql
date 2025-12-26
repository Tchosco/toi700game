-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.territory_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'inactive');
CREATE TYPE public.territory_level AS ENUM ('colony', 'autonomous', 'recognized', 'kingdom', 'power');
CREATE TYPE public.city_status AS ENUM ('free', 'occupied', 'neutral');
CREATE TYPE public.government_type AS ENUM ('monarchy', 'republic', 'theocracy', 'oligarchy', 'democracy', 'dictatorship');
CREATE TYPE public.territory_style AS ENUM ('cultural', 'commercial', 'technological', 'military');
CREATE TYPE public.token_type AS ENUM ('city', 'land', 'state');
CREATE TYPE public.event_type AS ENUM ('global', 'regional', 'crisis', 'conference', 'war');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  status city_status NOT NULL DEFAULT 'free',
  owner_territory_id UUID,
  is_neutral BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Territories table
CREATE TABLE public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  capital_city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  government_type government_type NOT NULL DEFAULT 'republic',
  style territory_style NOT NULL DEFAULT 'cultural',
  status territory_status NOT NULL DEFAULT 'pending',
  level territory_level NOT NULL DEFAULT 'colony',
  lore TEXT,
  flag_url TEXT,
  pd_points INTEGER NOT NULL DEFAULT 0,
  pi_points INTEGER NOT NULL DEFAULT 0,
  accepted_statute BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for cities owner
ALTER TABLE public.cities ADD CONSTRAINT fk_cities_territory 
  FOREIGN KEY (owner_territory_id) REFERENCES public.territories(id) ON DELETE SET NULL;

-- Tokens table (user token balances)
CREATE TABLE public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  city_tokens INTEGER NOT NULL DEFAULT 0,
  land_tokens INTEGER NOT NULL DEFAULT 0,
  state_tokens INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Token transactions log
CREATE TABLE public.token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_type token_type NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Planetary events table
CREATE TABLE public.planetary_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'global',
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  pd_reward INTEGER NOT NULL DEFAULT 0,
  pi_reward INTEGER NOT NULL DEFAULT 0,
  token_reward_type token_type,
  token_reward_amount INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Territory events (history)
CREATE TABLE public.territory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID REFERENCES public.territories(id) ON DELETE CASCADE NOT NULL,
  planetary_event_id UUID REFERENCES public.planetary_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  pd_change INTEGER NOT NULL DEFAULT 0,
  pi_change INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planetary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_events ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies (only admins can manage)
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Regions policies (public read, admin write)
CREATE POLICY "Regions are viewable by everyone" ON public.regions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage regions" ON public.regions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Cities policies
CREATE POLICY "Cities are viewable by everyone" ON public.cities
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage cities" ON public.cities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Territories policies
CREATE POLICY "Territories are viewable by everyone" ON public.territories
  FOR SELECT USING (true);

CREATE POLICY "Users can create territories" ON public.territories
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own territories" ON public.territories
  FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete territories" ON public.territories
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- User tokens policies
CREATE POLICY "Users can view own tokens" ON public.user_tokens
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System manages tokens" ON public.user_tokens
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Token transactions policies
CREATE POLICY "Users can view own transactions" ON public.token_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create transactions" ON public.token_transactions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Planetary events policies
CREATE POLICY "Events are viewable by everyone" ON public.planetary_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage events" ON public.planetary_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Territory events policies
CREATE POLICY "Territory events viewable by everyone" ON public.territory_events
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage territory events" ON public.territory_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'username');
  
  INSERT INTO public.user_tokens (user_id, city_tokens, land_tokens, state_tokens)
  VALUES (NEW.id, 0, 0, 0);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Timestamp triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON public.territories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_planetary_events_updated_at BEFORE UPDATE ON public.planetary_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default regions
INSERT INTO public.regions (name, description) VALUES
  ('Hemisfério Norte', 'Região polar e temperada norte de TOI-700'),
  ('Hemisfério Sul', 'Região polar e temperada sul de TOI-700'),
  ('Zona Equatorial', 'Faixa tropical central do planeta'),
  ('Arquipélago Central', 'Ilhas no oceano principal'),
  ('Planície Ocidental', 'Vastas planícies a oeste'),
  ('Montanhas Orientais', 'Cordilheira montanhosa a leste');

-- Insert neutral capital city
INSERT INTO public.cities (name, status, is_neutral) VALUES
  ('Nova Gaia', 'neutral', true);