-- Status de guerra/diplomacia
CREATE TYPE public.diplomatic_status AS ENUM ('peace', 'tension', 'cold_war', 'war', 'alliance', 'trade_partner');
CREATE TYPE public.war_status AS ENUM ('declared', 'active', 'ceasefire', 'ended');
CREATE TYPE public.treaty_type AS ENUM ('peace', 'trade', 'alliance', 'non_aggression', 'research', 'territorial');

-- Relações diplomáticas entre territórios
CREATE TABLE public.diplomatic_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_a_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  territory_b_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  status public.diplomatic_status NOT NULL DEFAULT 'peace',
  relation_score INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(territory_a_id, territory_b_id),
  CHECK (territory_a_id < territory_b_id)
);

-- Tratados entre territórios
CREATE TABLE public.treaties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treaty_type public.treaty_type NOT NULL,
  title TEXT NOT NULL,
  terms TEXT,
  territory_a_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  territory_b_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  proposed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'active', 'rejected', 'expired', 'violated')),
  starts_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Guerras
CREATE TABLE public.wars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status public.war_status NOT NULL DEFAULT 'declared',
  attacker_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  defender_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  attacker_war_score INTEGER NOT NULL DEFAULT 0,
  defender_war_score INTEGER NOT NULL DEFAULT 0,
  attacker_resources_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  defender_resources_spent DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cycles_elapsed INTEGER NOT NULL DEFAULT 0,
  max_cycles INTEGER NOT NULL DEFAULT 10,
  declared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  winner_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Batalhas dentro de guerras
CREATE TABLE public.war_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  war_id UUID NOT NULL REFERENCES public.wars(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL,
  attacker_strength DECIMAL(10, 2) NOT NULL,
  defender_strength DECIMAL(10, 2) NOT NULL,
  attacker_roll INTEGER NOT NULL,
  defender_roll INTEGER NOT NULL,
  attacker_damage INTEGER NOT NULL,
  defender_damage INTEGER NOT NULL,
  winner TEXT CHECK (winner IN ('attacker', 'defender', 'draw')),
  battle_log TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transferências territoriais
CREATE TABLE public.territory_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  from_territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  to_territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('sale', 'trade', 'treaty', 'conquest', 'colonization', 'abandonment')),
  price DECIMAL(12, 2),
  war_id UUID REFERENCES public.wars(id) ON DELETE SET NULL,
  treaty_id UUID REFERENCES public.treaties(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diplomatic_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treaties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Diplomatic relations viewable by everyone" ON public.diplomatic_relations FOR SELECT USING (true);
CREATE POLICY "Admins manage diplomatic relations" ON public.diplomatic_relations FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Treaties viewable by everyone" ON public.treaties FOR SELECT USING (true);
CREATE POLICY "Users can propose treaties" ON public.treaties FOR INSERT WITH CHECK (auth.uid() = proposed_by);
CREATE POLICY "Admins manage treaties" ON public.treaties FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Wars viewable by everyone" ON public.wars FOR SELECT USING (true);
CREATE POLICY "Admins manage wars" ON public.wars FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "War battles viewable by everyone" ON public.war_battles FOR SELECT USING (true);
CREATE POLICY "Admins manage war battles" ON public.war_battles FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory transfers viewable by everyone" ON public.territory_transfers FOR SELECT USING (true);
CREATE POLICY "Admins manage transfers" ON public.territory_transfers FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_diplomatic_relations_updated_at BEFORE UPDATE ON public.diplomatic_relations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_treaties_updated_at BEFORE UPDATE ON public.treaties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_wars_updated_at BEFORE UPDATE ON public.wars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();