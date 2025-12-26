-- Enum para status das células
CREATE TYPE public.cell_status AS ENUM ('blocked', 'explored', 'colonized');

-- Enum para tipo de célula
CREATE TYPE public.cell_type AS ENUM ('rural', 'urban', 'neutral', 'blocked');

-- Tabela de Eras Planetárias
CREATE TABLE public.planetary_eras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  cells_unlocked INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Células Territoriais
CREATE TABLE public.cells (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  cell_type public.cell_type NOT NULL DEFAULT 'rural',
  status public.cell_status NOT NULL DEFAULT 'blocked',
  area_km2 INTEGER NOT NULL DEFAULT 7500,
  owner_territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  explored_at TIMESTAMP WITH TIME ZONE,
  colonized_at TIMESTAMP WITH TIME ZONE,
  explored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  colonized_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unlock_reason TEXT,
  unlocked_by_era_id UUID REFERENCES public.planetary_eras(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna cell_id na tabela cities
ALTER TABLE public.cities ADD COLUMN cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL;

-- Tabela de configurações planetárias
CREATE TABLE public.planetary_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir configurações iniciais
INSERT INTO public.planetary_config (key, value, description) VALUES
  ('total_planet_area_km2', '663000000', 'Área total do planeta em km²'),
  ('total_land_area_km2', '269000000', 'Área terrestre total em km²'),
  ('playable_land_area_km2', '30000000', 'Área terrestre jogável inicial em km²'),
  ('cell_size_km2', '7500', 'Tamanho médio de cada célula em km²'),
  ('max_urban_percentage', '20', 'Porcentagem máxima de células urbanas'),
  ('current_era', '', 'ID da era planetária atual');

-- Tabela para projetos de exploração/colonização
CREATE TABLE public.exploration_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('exploration', 'colonization')),
  target_cells INTEGER NOT NULL DEFAULT 1,
  cells_completed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  era_id UUID REFERENCES public.planetary_eras(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Participantes de projetos
CREATE TABLE public.project_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.exploration_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  contribution_points INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.planetary_eras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planetary_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exploration_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies para planetary_eras
CREATE POLICY "Eras are viewable by everyone" ON public.planetary_eras FOR SELECT USING (true);
CREATE POLICY "Admins can manage eras" ON public.planetary_eras FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para cells
CREATE POLICY "Cells are viewable by everyone" ON public.cells FOR SELECT USING (true);
CREATE POLICY "Admins can manage cells" ON public.cells FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para planetary_config
CREATE POLICY "Config is viewable by everyone" ON public.planetary_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage config" ON public.planetary_config FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para exploration_projects
CREATE POLICY "Projects are viewable by everyone" ON public.exploration_projects FOR SELECT USING (true);
CREATE POLICY "Admins can manage projects" ON public.exploration_projects FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para project_participants
CREATE POLICY "Participants are viewable by everyone" ON public.project_participants FOR SELECT USING (true);
CREATE POLICY "Users can join projects" ON public.project_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage participants" ON public.project_participants FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Triggers para updated_at
CREATE TRIGGER update_planetary_eras_updated_at BEFORE UPDATE ON public.planetary_eras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cells_updated_at BEFORE UPDATE ON public.cells FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_planetary_config_updated_at BEFORE UPDATE ON public.planetary_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_exploration_projects_updated_at BEFORE UPDATE ON public.exploration_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Inserir primeira era planetária
INSERT INTO public.planetary_eras (name, description, order_index, cells_unlocked, is_active, started_at) VALUES
  ('Era da Cartografia', 'Período inicial de mapeamento do planeta. Cerca de 4.000 células terrestres disponíveis para colonização.', 1, 4000, true, now());