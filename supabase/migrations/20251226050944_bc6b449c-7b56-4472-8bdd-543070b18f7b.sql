-- ============================================
-- ACHIEVEMENTS SYSTEM
-- ============================================

CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  points integer NOT NULL DEFAULT 10,
  requirements jsonb NOT NULL DEFAULT '{}',
  is_secret boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- MISSIONS SYSTEM
-- ============================================

CREATE TYPE public.mission_type AS ENUM ('daily', 'weekly', 'story', 'special');
CREATE TYPE public.mission_status AS ENUM ('available', 'in_progress', 'completed', 'expired');

CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  mission_type mission_type NOT NULL DEFAULT 'daily',
  objectives jsonb NOT NULL DEFAULT '[]',
  rewards jsonb NOT NULL DEFAULT '{}',
  duration_hours integer,
  min_territory_level territory_level,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.territory_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  status mission_status NOT NULL DEFAULT 'in_progress',
  progress jsonb NOT NULL DEFAULT '{}',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- ============================================
-- TECH TREE SYSTEM
-- ============================================

CREATE TYPE public.tech_category AS ENUM ('military', 'economy', 'science', 'culture', 'infrastructure');

CREATE TABLE public.technologies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category tech_category NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  research_cost integer NOT NULL DEFAULT 100,
  prerequisites uuid[] DEFAULT '{}',
  effects jsonb NOT NULL DEFAULT '{}',
  icon text DEFAULT 'flask',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.territory_technologies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  researched_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(territory_id, technology_id)
);

CREATE TABLE public.territory_research_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id uuid NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  technology_id uuid NOT NULL REFERENCES public.technologies(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  queue_position integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- NOTIFICATIONS SYSTEM
-- ============================================

CREATE TYPE public.notification_type AS ENUM ('achievement', 'mission', 'war', 'diplomacy', 'market', 'event', 'system');

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_type notification_type NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_research_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Achievements
CREATE POLICY "Achievements viewable by everyone" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "User achievements viewable by everyone" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "System manages user achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage user achievements" ON public.user_achievements FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Missions
CREATE POLICY "Missions viewable by everyone" ON public.missions FOR SELECT USING (true);
CREATE POLICY "Admins manage missions" ON public.missions FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory missions viewable by owners" ON public.territory_missions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_missions.territory_id AND territories.owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Territory owners can start missions" ON public.territory_missions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_missions.territory_id AND territories.owner_id = auth.uid()));
CREATE POLICY "Territory owners can update missions" ON public.territory_missions FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_missions.territory_id AND territories.owner_id = auth.uid()));

-- Technologies
CREATE POLICY "Technologies viewable by everyone" ON public.technologies FOR SELECT USING (true);
CREATE POLICY "Admins manage technologies" ON public.technologies FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory technologies viewable by everyone" ON public.territory_technologies FOR SELECT USING (true);
CREATE POLICY "Territory owners can research" ON public.territory_technologies FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_technologies.territory_id AND territories.owner_id = auth.uid()));

CREATE POLICY "Research queue viewable by owners" ON public.territory_research_queue FOR SELECT 
  USING (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_research_queue.territory_id AND territories.owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Territory owners can manage queue" ON public.territory_research_queue FOR ALL 
  USING (EXISTS (SELECT 1 FROM territories WHERE territories.id = territory_research_queue.territory_id AND territories.owner_id = auth.uid()));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- SEED DATA: ACHIEVEMENTS
-- ============================================

INSERT INTO public.achievements (name, description, icon, category, points, requirements) VALUES
('Primeiro Passo', 'Crie seu primeiro território', 'flag', 'territory', 10, '{"type": "territory_created", "count": 1}'),
('Colonizador', 'Colonize 5 células', 'map', 'territory', 25, '{"type": "cells_colonized", "count": 5}'),
('Imperialista', 'Colonize 25 células', 'globe', 'territory', 100, '{"type": "cells_colonized", "count": 25}'),
('Fundador de Cidades', 'Funde 3 cidades', 'building', 'territory', 50, '{"type": "cities_founded", "count": 3}'),
('Metrópole', 'Tenha uma cidade com mais de 1 milhão de habitantes', 'users', 'population', 75, '{"type": "city_population", "min": 1000000}'),
('Comerciante Novato', 'Complete sua primeira transação no mercado', 'shopping-cart', 'economy', 10, '{"type": "market_trades", "count": 1}'),
('Magnata', 'Acumule 10.000 em moeda', 'coins', 'economy', 50, '{"type": "currency_balance", "min": 10000}'),
('Diplomata', 'Forme uma aliança com outro território', 'handshake', 'diplomacy', 25, '{"type": "alliances_formed", "count": 1}'),
('Legislador', 'Aprove sua primeira lei nacional', 'gavel', 'politics', 25, '{"type": "laws_enacted", "count": 1}'),
('Cientista', 'Complete sua primeira pesquisa tecnológica', 'flask', 'science', 25, '{"type": "techs_researched", "count": 1}'),
('Conquistador', 'Vença sua primeira guerra', 'swords', 'military', 50, '{"type": "wars_won", "count": 1}'),
('Pacifista', 'Mantenha a paz por 30 dias consecutivos', 'dove', 'diplomacy', 100, '{"type": "peace_days", "min": 30}');

-- ============================================
-- SEED DATA: MISSIONS
-- ============================================

INSERT INTO public.missions (name, description, mission_type, objectives, rewards, duration_hours) VALUES
('Expansão Inicial', 'Colonize 2 novas células para expandir seu território', 'daily', '[{"type": "colonize_cells", "target": 2, "current": 0}]', '{"currency": 500, "influence": 10}', 24),
('Produção em Alta', 'Produza 100 unidades de alimentos', 'daily', '[{"type": "produce_food", "target": 100, "current": 0}]', '{"currency": 300, "tech_points": 5}', 24),
('Comércio Ativo', 'Complete 3 transações no mercado', 'daily', '[{"type": "market_trades", "target": 3, "current": 0}]', '{"currency": 750}', 24),
('Desenvolvimento Urbano', 'Aumente a população urbana em 50.000', 'weekly', '[{"type": "urban_growth", "target": 50000, "current": 0}]', '{"currency": 2000, "city_token": 1}', 168),
('Avanço Tecnológico', 'Pesquise 2 novas tecnologias', 'weekly', '[{"type": "research_techs", "target": 2, "current": 0}]', '{"currency": 1500, "research_points": 50}', 168),
('Construtor de Nações', 'Funde uma nova cidade', 'story', '[{"type": "found_city", "target": 1, "current": 0}]', '{"currency": 1000, "land_token": 1}', NULL),
('Diplomacia Inicial', 'Inicie negociações com outro território', 'story', '[{"type": "start_diplomacy", "target": 1, "current": 0}]', '{"influence": 50}', NULL),
('Industrialização', 'Construa 5 focos industriais em células urbanas', 'story', '[{"type": "industrial_focus", "target": 5, "current": 0}]', '{"currency": 3000, "tech_points": 25}', NULL);

-- ============================================
-- SEED DATA: TECHNOLOGIES
-- ============================================

INSERT INTO public.technologies (name, description, category, tier, research_cost, effects, icon) VALUES
-- Tier 1 - Basic
('Agricultura Avançada', 'Melhora a produção de alimentos em 15%', 'economy', 1, 100, '{"food_production": 0.15}', 'wheat'),
('Mineração Eficiente', 'Aumenta a extração de minerais em 15%', 'economy', 1, 100, '{"mineral_production": 0.15}', 'pickaxe'),
('Energia Renovável', 'Melhora a produção de energia em 15%', 'economy', 1, 100, '{"energy_production": 0.15}', 'zap'),
('Propaganda Básica', 'Aumenta a geração de influência em 10%', 'culture', 1, 100, '{"influence_production": 0.10}', 'megaphone'),
('Milícia Popular', 'Aumenta o poder militar em 10%', 'military', 1, 100, '{"military_power": 0.10}', 'shield'),
('Estradas Básicas', 'Reduz o custo de colonização em 10%', 'infrastructure', 1, 100, '{"colonization_cost": -0.10}', 'road'),

-- Tier 2 - Intermediate
('Biotecnologia', 'Aumenta produção de alimentos em 25%', 'science', 2, 250, '{"food_production": 0.25}', 'dna'),
('Automação Industrial', 'Aumenta produção de minerais e energia em 20%', 'economy', 2, 250, '{"mineral_production": 0.20, "energy_production": 0.20}', 'cog'),
('Mídia de Massa', 'Aumenta influência em 25%', 'culture', 2, 250, '{"influence_production": 0.25}', 'tv'),
('Exército Profissional', 'Aumenta poder militar em 25%', 'military', 2, 300, '{"military_power": 0.25}', 'swords'),
('Urbanização Planejada', 'Aumenta crescimento urbano em 20%', 'infrastructure', 2, 250, '{"urban_growth": 0.20}', 'building'),
('Diplomacia Avançada', 'Melhora relações diplomáticas em 15%', 'culture', 2, 200, '{"diplomacy_bonus": 0.15}', 'handshake'),

-- Tier 3 - Advanced
('Fusão Nuclear', 'Dobra a produção de energia', 'science', 3, 500, '{"energy_production": 1.0}', 'atom'),
('Inteligência Artificial', 'Aumenta produção de tecnologia em 50%', 'science', 3, 500, '{"tech_production": 0.50}', 'cpu'),
('Megaestruturas', 'Permite cidades maiores e mais eficientes', 'infrastructure', 3, 500, '{"city_capacity": 0.50, "urban_growth": 0.30}', 'landmark'),
('Forças Especiais', 'Aumenta poder militar em 50%', 'military', 3, 600, '{"military_power": 0.50}', 'target'),
('Hegemonia Cultural', 'Aumenta influência em 50%', 'culture', 3, 500, '{"influence_production": 0.50}', 'crown'),
('Economia Global', 'Reduz taxas de mercado e aumenta comércio', 'economy', 3, 500, '{"market_fee_reduction": 0.25, "trade_bonus": 0.30}', 'globe');