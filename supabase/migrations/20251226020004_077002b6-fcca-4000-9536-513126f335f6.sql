-- Create trade history table for recording executed trades
CREATE TABLE public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES public.market_listings(id),
  buyer_user_id UUID NOT NULL,
  buyer_territory_id UUID REFERENCES public.territories(id),
  seller_user_id UUID NOT NULL,
  seller_territory_id UUID REFERENCES public.territories(id),
  resource_type public.market_resource_type NOT NULL,
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

-- Trade history viewable by participants and admins
CREATE POLICY "Trade history viewable by participants"
  ON public.trade_history
  FOR SELECT
  USING (
    auth.uid() = buyer_user_id OR 
    auth.uid() = seller_user_id OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Admins can manage trade history
CREATE POLICY "Admins can manage trade history"
  ON public.trade_history
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add max_listings_per_territory to world_config for anti-spam
ALTER TABLE public.world_config
ADD COLUMN IF NOT EXISTS max_listings_per_territory INTEGER NOT NULL DEFAULT 20;