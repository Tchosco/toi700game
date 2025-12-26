-- Legal level enum
CREATE TYPE public.legal_level AS ENUM ('planetary', 'bloc', 'national');

-- Law status enum
CREATE TYPE public.law_status AS ENUM ('draft', 'proposed', 'voting', 'enacted', 'repealed', 'vetoed');

-- Vote type enum
CREATE TYPE public.vote_type AS ENUM ('constitution', 'law', 'bloc_creation', 'sanction', 'era_change', 'bloc_charter', 'bloc_law');

-- Vote choice enum
CREATE TYPE public.vote_choice AS ENUM ('yes', 'no', 'abstain');

-- Geopolitical Blocs table
CREATE TABLE public.geopolitical_blocs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  charter TEXT,
  founded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  founder_territory_id UUID REFERENCES public.territories(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bloc memberships
CREATE TABLE public.bloc_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloc_id UUID NOT NULL REFERENCES public.geopolitical_blocs(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bloc_id, territory_id)
);

-- Laws table (unified for all levels)
CREATE TABLE public.laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_level legal_level NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  full_text TEXT,
  
  -- Ownership
  bloc_id UUID REFERENCES public.geopolitical_blocs(id),
  territory_id UUID REFERENCES public.territories(id),
  proposed_by UUID,
  
  -- Effects (JSON arrays)
  positive_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Impacts (-100 to +100)
  economic_impact INTEGER NOT NULL DEFAULT 0,
  social_impact INTEGER NOT NULL DEFAULT 0,
  territorial_impact INTEGER NOT NULL DEFAULT 0,
  military_impact INTEGER NOT NULL DEFAULT 0,
  
  -- Population reaction (0-100%)
  population_sympathy NUMERIC NOT NULL DEFAULT 50,
  population_repulsion NUMERIC NOT NULL DEFAULT 50,
  
  -- Requirements
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  legal_conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status
  status law_status NOT NULL DEFAULT 'draft',
  enacted_at TIMESTAMP WITH TIME ZONE,
  repealed_at TIMESTAMP WITH TIME ZONE,
  
  -- Is this a constitution?
  is_constitution BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Parliamentary votes table
CREATE TABLE public.parliamentary_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_type vote_type NOT NULL,
  subject_id UUID NOT NULL, -- law_id, bloc_id, etc.
  title TEXT NOT NULL,
  description TEXT,
  
  -- Voting scope
  legal_level legal_level NOT NULL,
  bloc_id UUID REFERENCES public.geopolitical_blocs(id),
  
  -- Voting period
  voting_starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  voting_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Results
  votes_yes INTEGER NOT NULL DEFAULT 0,
  votes_no INTEGER NOT NULL DEFAULT 0,
  votes_abstain INTEGER NOT NULL DEFAULT 0,
  total_eligible INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'open',
  result TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual votes cast
CREATE TABLE public.vote_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL REFERENCES public.parliamentary_votes(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES public.territories(id),
  voter_id UUID NOT NULL,
  choice vote_choice NOT NULL,
  reason TEXT,
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vote_id, territory_id)
);

-- Law templates (predefined laws)
CREATE TABLE public.law_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_level legal_level NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  full_text TEXT,
  positive_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_effects JSONB NOT NULL DEFAULT '[]'::jsonb,
  economic_impact INTEGER NOT NULL DEFAULT 0,
  social_impact INTEGER NOT NULL DEFAULT 0,
  territorial_impact INTEGER NOT NULL DEFAULT 0,
  military_impact INTEGER NOT NULL DEFAULT 0,
  base_sympathy NUMERIC NOT NULL DEFAULT 50,
  base_repulsion NUMERIC NOT NULL DEFAULT 50,
  prerequisites JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_constitution BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Legal history log
CREATE TABLE public.legal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID REFERENCES public.laws(id),
  action TEXT NOT NULL,
  description TEXT,
  old_status law_status,
  new_status law_status,
  performed_by UUID,
  territory_id UUID REFERENCES public.territories(id),
  bloc_id UUID REFERENCES public.geopolitical_blocs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geopolitical_blocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloc_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parliamentary_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for geopolitical_blocs
CREATE POLICY "Blocs viewable by everyone" ON public.geopolitical_blocs FOR SELECT USING (true);
CREATE POLICY "Admins manage blocs" ON public.geopolitical_blocs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for bloc_memberships
CREATE POLICY "Memberships viewable by everyone" ON public.bloc_memberships FOR SELECT USING (true);
CREATE POLICY "Territory owners can join blocs" ON public.bloc_memberships FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid()));
CREATE POLICY "Territory owners can leave blocs" ON public.bloc_memberships FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid()));
CREATE POLICY "Admins manage memberships" ON public.bloc_memberships FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for laws
CREATE POLICY "Laws viewable by everyone" ON public.laws FOR SELECT USING (true);
CREATE POLICY "Users can create national laws" ON public.laws FOR INSERT 
  WITH CHECK (legal_level = 'national' AND EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid()));
CREATE POLICY "Territory owners can update own laws" ON public.laws FOR UPDATE 
  USING ((legal_level = 'national' AND EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid())) OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all laws" ON public.laws FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for parliamentary_votes
CREATE POLICY "Votes viewable by everyone" ON public.parliamentary_votes FOR SELECT USING (true);
CREATE POLICY "Admins manage votes" ON public.parliamentary_votes FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for vote_records
CREATE POLICY "Vote records viewable by everyone" ON public.vote_records FOR SELECT USING (true);
CREATE POLICY "Territory owners can vote" ON public.vote_records FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid()));
CREATE POLICY "Admins manage vote records" ON public.vote_records FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for law_templates
CREATE POLICY "Templates viewable by everyone" ON public.law_templates FOR SELECT USING (true);
CREATE POLICY "Admins manage templates" ON public.law_templates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for legal_history
CREATE POLICY "Legal history viewable by everyone" ON public.legal_history FOR SELECT USING (true);
CREATE POLICY "System manages legal history" ON public.legal_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage legal history" ON public.legal_history FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_geopolitical_blocs_updated_at BEFORE UPDATE ON public.geopolitical_blocs 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_laws_updated_at BEFORE UPDATE ON public.laws 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_parliamentary_votes_updated_at BEFORE UPDATE ON public.parliamentary_votes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert initial planetary constitution
INSERT INTO public.laws (name, legal_level, category, description, full_text, is_constitution, status, enacted_at, population_sympathy, population_repulsion)
VALUES (
  'Constituição Planetária de TOI-700',
  'planetary',
  'constitution',
  'Lei fundamental que rege todo o planeta TOI-700 e estabelece os princípios básicos de governança.',
  'PREÂMBULO

Nós, os povos de TOI-700, unidos pelo destino comum de colonizar e desenvolver este novo mundo, estabelecemos esta Constituição para garantir paz, prosperidade e justiça para todas as nações.

TÍTULO I - PRINCÍPIOS FUNDAMENTAIS

Artigo 1º - TOI-700 é um planeta soberano, governado pela vontade coletiva de seus Estados através do Parlamento Planetário.

Artigo 2º - Toda entidade territorial reconhecida possui direito à autodeterminação, respeitando esta Constituição.

Artigo 3º - A hierarquia legal é inviolável: Constituição Planetária > Leis Planetárias > Cartas de Bloco > Leis de Bloco > Decretos Nacionais.

TÍTULO II - PARLAMENTO PLANETÁRIO

Artigo 4º - O Parlamento Planetário é composto por um representante de cada Estado reconhecido.

Artigo 5º - Cada Estado possui direito a um voto em todas as deliberações.

Artigo 6º - Decisões ordinárias requerem maioria simples. Emendas constitucionais requerem 2/3 dos votos.

TÍTULO III - BLOCOS GEOPOLÍTICOS

Artigo 7º - Estados podem formar Blocos Geopolíticos mediante tratado aprovado pelo Parlamento.

Artigo 8º - Cada Bloco deve possuir uma Carta que não contrarie esta Constituição.

TÍTULO IV - DIREITOS E DEVERES

Artigo 9º - Todo Estado tem direito a território, comércio e defesa.

Artigo 10º - Todo Estado deve contribuir para a paz planetária e respeitar tratados ratificados.',
  true,
  'enacted',
  now(),
  75,
  10
);

-- Insert some law templates
INSERT INTO public.law_templates (name, legal_level, category, description, positive_effects, negative_effects, economic_impact, social_impact, territorial_impact, military_impact, base_sympathy, base_repulsion) VALUES
('Liberdade Comercial Total', 'national', 'economia', 'Remove todas as barreiras comerciais e permite livre comércio.', 
  '["Aumento do comércio em 20%", "Atrai investimentos estrangeiros", "Reduz preços de importação"]'::jsonb,
  '["Indústrias locais podem sofrer", "Dependência de importações", "Perda de controle econômico"]'::jsonb,
  25, -5, 0, 0, 60, 35),
  
('Protecionismo Industrial', 'national', 'economia', 'Impõe tarifas elevadas sobre importações para proteger a indústria local.',
  '["Fortalece indústria nacional", "Cria empregos locais", "Maior autossuficiência"]'::jsonb,
  '["Preços mais altos", "Menor variedade de produtos", "Possíveis retaliações comerciais"]'::jsonb,
  -10, 10, 0, 5, 55, 40),

('Serviço Militar Obrigatório', 'national', 'militar', 'Todo cidadão deve servir nas forças armadas por um período.',
  '["Exército maior e mais preparado", "Disciplina social", "Defesa territorial fortalecida"]'::jsonb,
  '["Impopular entre jovens", "Custo de treinamento", "Força de trabalho reduzida"]'::jsonb,
  -15, -10, 5, 30, 30, 60),

('Educação Universal Gratuita', 'national', 'social', 'O Estado fornece educação gratuita para todos os níveis.',
  '["População mais educada", "Maior produtividade", "Inovação tecnológica"]'::jsonb,
  '["Alto custo para o Estado", "Demora para ver resultados", "Pressão fiscal"]'::jsonb,
  -20, 25, 0, 5, 80, 15),

('Imposto Progressivo', 'national', 'economia', 'Taxas de imposto aumentam proporcionalmente à renda.',
  '["Redistribuição de riqueza", "Financiamento social", "Reduz desigualdade"]'::jsonb,
  '["Descontentamento dos ricos", "Possível fuga de capital", "Complexidade administrativa"]'::jsonb,
  5, 15, 0, 0, 55, 40),

('Lei de Colonização Acelerada', 'national', 'territorial', 'Incentivos para rápida colonização de novas células.',
  '["Expansão territorial rápida", "Novas fontes de recursos", "Aumento populacional"]'::jsonb,
  '["Colonização de baixa qualidade", "Conflitos com vizinhos", "Custo elevado"]'::jsonb,
  -10, 5, 25, 0, 50, 35),

('Pacto de Não-Agressão Planetário', 'planetary', 'diplomacia', 'Proíbe guerras de agressão entre Estados.',
  '["Paz garantida", "Foco no desenvolvimento", "Comércio estável"]'::jsonb,
  '["Limita opções militares", "Difícil de enforçar", "Pode proteger agressores"]'::jsonb,
  10, 20, -10, -20, 70, 25),

('Zona de Livre Comércio do Bloco', 'bloc', 'economia', 'Elimina tarifas entre membros do bloco.',
  '["Comércio interno facilitado", "Preços reduzidos", "Integração econômica"]'::jsonb,
  '["Competição interna", "Dependência do bloco", "Perda de receita tarifária"]'::jsonb,
  20, 5, 0, 0, 65, 30),

('Defesa Coletiva do Bloco', 'bloc', 'militar', 'Ataque a um membro é considerado ataque a todos.',
  '["Segurança garantida", "Dissuasão forte", "Cooperação militar"]'::jsonb,
  '["Pode arrastar para guerras alheias", "Custo de manutenção", "Perda de autonomia militar"]'::jsonb,
  -5, 10, 5, 25, 60, 35);