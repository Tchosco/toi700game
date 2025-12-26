-- Create atomic market order matching function with proper transaction isolation
-- This function uses row-level locking (FOR UPDATE) to prevent race conditions

CREATE OR REPLACE FUNCTION public.match_market_order(
  p_listing_id UUID,
  p_seller_user_id UUID,
  p_seller_territory_id UUID,
  p_listing_type TEXT,
  p_resource_type TEXT,
  p_price_per_unit NUMERIC,
  p_quantity NUMERIC,
  p_filled_quantity NUMERIC
)
RETURNS TABLE(
  trades_executed INTEGER,
  remaining_quantity NUMERIC,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining NUMERIC;
  v_trades INTEGER := 0;
  v_match RECORD;
  v_trade_quantity NUMERIC;
  v_trade_price NUMERIC;
  v_match_remaining NUMERIC;
  v_buyer_user_id UUID;
  v_buyer_territory_id UUID;
  v_seller_uid UUID;
  v_seller_tid UUID;
  v_total_price NUMERIC;
  v_is_token BOOLEAN;
  v_token_type TEXT;
  v_token_field TEXT;
  v_seller_wallet_balance NUMERIC;
  v_buyer_tokens RECORD;
  v_buyer_resources RECORD;
  v_match_filled NUMERIC;
  v_match_status TEXT;
  v_new_filled NUMERIC;
  v_final_status TEXT;
BEGIN
  -- Calculate remaining quantity to match
  v_remaining := p_quantity - p_filled_quantity;
  
  -- Check if this is a token type
  v_is_token := p_resource_type LIKE 'token_%';
  IF v_is_token THEN
    v_token_type := REPLACE(p_resource_type, 'token_', '');
    v_token_field := v_token_type || '_tokens';
  END IF;
  
  -- Find and lock matching orders using FOR UPDATE to prevent race conditions
  FOR v_match IN
    SELECT ml.*
    FROM market_listings ml
    WHERE ml.resource_type::TEXT = p_resource_type
      AND ml.listing_type::TEXT = (CASE WHEN p_listing_type = 'sell' THEN 'buy' ELSE 'sell' END)
      AND ml.status IN ('open', 'partially_filled')
      AND ml.seller_user_id != p_seller_user_id
      AND (
        (p_listing_type = 'sell' AND ml.price_per_unit >= p_price_per_unit) OR
        (p_listing_type = 'buy' AND ml.price_per_unit <= p_price_per_unit)
      )
    ORDER BY 
      CASE WHEN p_listing_type = 'buy' THEN ml.price_per_unit END ASC,
      CASE WHEN p_listing_type = 'sell' THEN ml.price_per_unit END DESC,
      ml.created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    EXIT WHEN v_remaining <= 0;
    
    v_match_remaining := v_match.quantity - v_match.filled_quantity;
    v_trade_quantity := LEAST(v_remaining, v_match_remaining);
    v_trade_price := v_match.price_per_unit; -- Use older order's price
    
    CONTINUE WHEN v_trade_quantity <= 0;
    
    -- Determine buyer and seller
    IF p_listing_type = 'sell' THEN
      v_buyer_user_id := v_match.seller_user_id;
      v_buyer_territory_id := v_match.seller_territory_id;
      v_seller_uid := p_seller_user_id;
      v_seller_tid := p_seller_territory_id;
    ELSE
      v_buyer_user_id := p_seller_user_id;
      v_buyer_territory_id := p_seller_territory_id;
      v_seller_uid := v_match.seller_user_id;
      v_seller_tid := v_match.seller_territory_id;
    END IF;
    
    v_total_price := v_trade_quantity * v_trade_price;
    
    -- Transfer currency to seller (locked currency from buyer's order)
    SELECT balance INTO v_seller_wallet_balance
    FROM player_wallets
    WHERE user_id = v_seller_uid
    FOR UPDATE;
    
    UPDATE player_wallets
    SET balance = balance + v_total_price,
        total_earned = total_earned + v_total_price,
        updated_at = now()
    WHERE user_id = v_seller_uid;
    
    -- Transfer resource/token to buyer
    IF v_is_token THEN
      UPDATE user_tokens
      SET city_tokens = CASE WHEN v_token_type = 'city' THEN city_tokens + v_trade_quantity ELSE city_tokens END,
          land_tokens = CASE WHEN v_token_type = 'land' THEN land_tokens + v_trade_quantity ELSE land_tokens END,
          state_tokens = CASE WHEN v_token_type = 'state' THEN state_tokens + v_trade_quantity ELSE state_tokens END,
          updated_at = now()
      WHERE user_id = v_buyer_user_id;
    ELSIF v_buyer_territory_id IS NOT NULL THEN
      UPDATE resource_balances
      SET food = CASE WHEN p_resource_type = 'food' THEN food + v_trade_quantity ELSE food END,
          energy = CASE WHEN p_resource_type = 'energy' THEN energy + v_trade_quantity ELSE energy END,
          minerals = CASE WHEN p_resource_type = 'minerals' THEN minerals + v_trade_quantity ELSE minerals END,
          tech = CASE WHEN p_resource_type = 'tech' THEN tech + v_trade_quantity ELSE tech END,
          updated_at = now()
      WHERE territory_id = v_buyer_territory_id;
    END IF;
    
    -- Update the matched listing
    v_match_filled := v_match.filled_quantity + v_trade_quantity;
    v_match_status := CASE WHEN v_match_filled >= v_match.quantity THEN 'filled' ELSE 'partially_filled' END;
    
    UPDATE market_listings
    SET filled_quantity = v_match_filled,
        status = v_match_status::listing_status,
        updated_at = now()
    WHERE id = v_match.id;
    
    -- Record trade history
    INSERT INTO trade_history (
      listing_id, buyer_user_id, buyer_territory_id, 
      seller_user_id, seller_territory_id, resource_type,
      quantity, price_per_unit, total_price
    ) VALUES (
      p_listing_id, v_buyer_user_id, v_buyer_territory_id,
      v_seller_uid, v_seller_tid, p_resource_type::market_resource_type,
      v_trade_quantity, v_trade_price, v_total_price
    );
    
    -- Handle refund if buy order price was higher than matched sell price
    IF p_listing_type = 'buy' AND v_trade_price < p_price_per_unit THEN
      UPDATE player_wallets
      SET balance = balance + ((p_price_per_unit - v_trade_price) * v_trade_quantity),
          updated_at = now()
      WHERE user_id = v_buyer_user_id;
    END IF;
    
    v_remaining := v_remaining - v_trade_quantity;
    v_trades := v_trades + 1;
  END LOOP;
  
  -- Update the original listing
  v_new_filled := p_filled_quantity + (p_quantity - p_filled_quantity - v_remaining);
  v_final_status := CASE 
    WHEN v_new_filled >= p_quantity THEN 'filled'
    WHEN v_new_filled > 0 THEN 'partially_filled'
    ELSE 'open'
  END;
  
  UPDATE market_listings
  SET filled_quantity = v_new_filled,
      status = v_final_status::listing_status,
      updated_at = now()
  WHERE id = p_listing_id;
  
  -- Return results
  trades_executed := v_trades;
  remaining_quantity := v_remaining;
  new_status := v_final_status;
  RETURN NEXT;
END;
$$;