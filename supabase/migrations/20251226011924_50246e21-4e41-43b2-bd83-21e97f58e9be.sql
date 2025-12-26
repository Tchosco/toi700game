-- Tipos de recursos
CREATE TYPE public.resource_type AS ENUM ('food', 'energy', 'minerals', 'technology', 'influence');

-- Tabela de saldo de moeda dos jogadores
CREATE TABLE public.player_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_earned DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de transações de moeda
CREATE TABLE public.currency_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer_in', 'transfer_out')),
  category TEXT NOT NULL,
  description TEXT,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  related_territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recursos dos territórios
CREATE TABLE public.territory_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE,
  resource_type public.resource_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  production_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  consumption_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(territory_id, resource_type)
);

-- Pontos de pesquisa dos territórios
CREATE TABLE public.territory_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id UUID NOT NULL REFERENCES public.territories(id) ON DELETE CASCADE UNIQUE,
  research_points DECIMAL(10, 2) NOT NULL DEFAULT 0,
  research_rate DECIMAL(8, 2) NOT NULL DEFAULT 1,
  total_research_generated DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mercado de tokens
CREATE TABLE public.token_market (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_type TEXT NOT NULL CHECK (token_type IN ('city', 'land', 'state')),
  price_per_unit DECIMAL(12, 2) NOT NULL,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  total_sold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de compras de tokens
CREATE TABLE public.token_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL CHECK (token_type IN ('city', 'land', 'state')),
  quantity INTEGER NOT NULL,
  price_paid DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mercado de recursos
CREATE TABLE public.resource_market (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_type public.resource_type NOT NULL UNIQUE,
  base_price DECIMAL(10, 2) NOT NULL,
  current_price DECIMAL(10, 2) NOT NULL,
  supply DECIMAL(12, 2) NOT NULL DEFAULT 0,
  demand DECIMAL(12, 2) NOT NULL DEFAULT 0,
  price_volatility DECIMAL(4, 2) NOT NULL DEFAULT 0.1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ordens de compra/venda de recursos
CREATE TABLE public.resource_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  resource_type public.resource_type NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('buy', 'sell')),
  quantity DECIMAL(10, 2) NOT NULL,
  price_per_unit DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'partial')),
  filled_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Níveis de estabilidade territorial
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS stability DECIMAL(5, 2) NOT NULL DEFAULT 50;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS economy_rating DECIMAL(5, 2) NOT NULL DEFAULT 50;
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS research_bonus DECIMAL(4, 2) NOT NULL DEFAULT 1.0;

-- Enable RLS
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territory_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own wallet" ON public.player_wallets FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "System manages wallets" ON public.player_wallets FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own transactions" ON public.currency_transactions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage transactions" ON public.currency_transactions FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Resources viewable by everyone" ON public.territory_resources FOR SELECT USING (true);
CREATE POLICY "Admins manage resources" ON public.territory_resources FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Research viewable by everyone" ON public.territory_research FOR SELECT USING (true);
CREATE POLICY "Admins manage research" ON public.territory_research FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Token market viewable by everyone" ON public.token_market FOR SELECT USING (true);
CREATE POLICY "Admins manage token market" ON public.token_market FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own purchases" ON public.token_purchases FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create purchases" ON public.token_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Resource market viewable by everyone" ON public.resource_market FOR SELECT USING (true);
CREATE POLICY "Admins manage resource market" ON public.resource_market FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own orders" ON public.resource_orders FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create orders" ON public.resource_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.resource_orders FOR UPDATE USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_player_wallets_updated_at BEFORE UPDATE ON public.player_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_territory_resources_updated_at BEFORE UPDATE ON public.territory_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_territory_research_updated_at BEFORE UPDATE ON public.territory_research FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_token_market_updated_at BEFORE UPDATE ON public.token_market FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_resource_market_updated_at BEFORE UPDATE ON public.resource_market FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_resource_orders_updated_at BEFORE UPDATE ON public.resource_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert initial token market prices
INSERT INTO public.token_market (token_type, price_per_unit, available_quantity) VALUES
  ('city', 10000, 100),
  ('land', 2500, 500),
  ('state', 50000, 20);

-- Insert initial resource market
INSERT INTO public.resource_market (resource_type, base_price, current_price, supply, demand) VALUES
  ('food', 10, 10, 1000, 1000),
  ('energy', 15, 15, 800, 800),
  ('minerals', 25, 25, 500, 500),
  ('technology', 100, 100, 200, 200),
  ('influence', 50, 50, 300, 300);

-- Function to create wallet for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.player_wallets (user_id, balance)
  VALUES (NEW.id, 1000);
  RETURN NEW;
END;
$$;

-- Trigger to create wallet on user creation
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wallet();