-- Create atomic transfer functions to prevent race conditions in financial operations
-- All functions use FOR UPDATE row-level locking and consistent ordering to prevent deadlocks

-- 1. Atomic currency transfer between users
CREATE OR REPLACE FUNCTION public.atomic_transfer_currency(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;
  
  -- Lock wallets in consistent order to prevent deadlocks
  IF p_from_user_id < p_to_user_id THEN
    SELECT balance INTO v_from_balance FROM player_wallets 
    WHERE user_id = p_from_user_id FOR UPDATE;
    SELECT balance INTO v_to_balance FROM player_wallets 
    WHERE user_id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT balance INTO v_to_balance FROM player_wallets 
    WHERE user_id = p_to_user_id FOR UPDATE;
    SELECT balance INTO v_from_balance FROM player_wallets 
    WHERE user_id = p_from_user_id FOR UPDATE;
  END IF;
  
  -- Check if wallets exist
  IF v_from_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source wallet not found');
  END IF;
  IF v_to_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination wallet not found');
  END IF;
  
  -- Validate sufficient funds
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance: ' || v_from_balance || ' < ' || p_amount);
  END IF;
  
  -- Perform atomic transfer
  UPDATE player_wallets 
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_from_user_id;
  
  UPDATE player_wallets 
  SET balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = now()
  WHERE user_id = p_to_user_id;
  
  RETURN jsonb_build_object('success', true, 'transferred', p_amount);
END;
$$;

-- 2. Atomic token transfer between users
CREATE OR REPLACE FUNCTION public.atomic_transfer_tokens(
  p_from_user_id UUID,
  p_to_user_id UUID,
  p_city_tokens INT DEFAULT 0,
  p_land_tokens INT DEFAULT 0,
  p_state_tokens INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_tokens RECORD;
  v_to_tokens RECORD;
BEGIN
  -- Validate at least one token type
  IF p_city_tokens <= 0 AND p_land_tokens <= 0 AND p_state_tokens <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No tokens to transfer');
  END IF;
  
  -- Lock in consistent order to prevent deadlocks
  IF p_from_user_id < p_to_user_id THEN
    SELECT * INTO v_from_tokens FROM user_tokens 
    WHERE user_id = p_from_user_id FOR UPDATE;
    SELECT * INTO v_to_tokens FROM user_tokens 
    WHERE user_id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_tokens FROM user_tokens 
    WHERE user_id = p_to_user_id FOR UPDATE;
    SELECT * INTO v_from_tokens FROM user_tokens 
    WHERE user_id = p_from_user_id FOR UPDATE;
  END IF;
  
  -- Check if records exist
  IF v_from_tokens IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source tokens not found');
  END IF;
  IF v_to_tokens IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination tokens not found');
  END IF;
  
  -- Validate sufficient tokens
  IF p_city_tokens > 0 AND v_from_tokens.city_tokens < p_city_tokens THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient city tokens');
  END IF;
  IF p_land_tokens > 0 AND v_from_tokens.land_tokens < p_land_tokens THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient land tokens');
  END IF;
  IF p_state_tokens > 0 AND v_from_tokens.state_tokens < p_state_tokens THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient state tokens');
  END IF;
  
  -- Perform atomic transfer
  UPDATE user_tokens
  SET city_tokens = city_tokens - GREATEST(0, p_city_tokens),
      land_tokens = land_tokens - GREATEST(0, p_land_tokens),
      state_tokens = state_tokens - GREATEST(0, p_state_tokens),
      updated_at = now()
  WHERE user_id = p_from_user_id;
  
  UPDATE user_tokens
  SET city_tokens = city_tokens + GREATEST(0, p_city_tokens),
      land_tokens = land_tokens + GREATEST(0, p_land_tokens),
      state_tokens = state_tokens + GREATEST(0, p_state_tokens),
      updated_at = now()
  WHERE user_id = p_to_user_id;
  
  RETURN jsonb_build_object('success', true, 
    'transferred', jsonb_build_object('city', p_city_tokens, 'land', p_land_tokens, 'state', p_state_tokens));
END;
$$;

-- 3. Atomic resource transfer between territories
CREATE OR REPLACE FUNCTION public.atomic_transfer_resources(
  p_from_territory_id UUID,
  p_to_territory_id UUID,
  p_food NUMERIC DEFAULT 0,
  p_energy NUMERIC DEFAULT 0,
  p_minerals NUMERIC DEFAULT 0,
  p_tech NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_resources RECORD;
  v_to_resources RECORD;
BEGIN
  -- Validate at least one resource type
  IF p_food <= 0 AND p_energy <= 0 AND p_minerals <= 0 AND p_tech <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No resources to transfer');
  END IF;
  
  -- Lock in consistent order to prevent deadlocks
  IF p_from_territory_id < p_to_territory_id THEN
    SELECT * INTO v_from_resources FROM resource_balances 
    WHERE territory_id = p_from_territory_id FOR UPDATE;
    SELECT * INTO v_to_resources FROM resource_balances 
    WHERE territory_id = p_to_territory_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_resources FROM resource_balances 
    WHERE territory_id = p_to_territory_id FOR UPDATE;
    SELECT * INTO v_from_resources FROM resource_balances 
    WHERE territory_id = p_from_territory_id FOR UPDATE;
  END IF;
  
  -- Check if records exist
  IF v_from_resources IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Source territory resources not found');
  END IF;
  IF v_to_resources IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Destination territory resources not found');
  END IF;
  
  -- Validate sufficient resources
  IF p_food > 0 AND v_from_resources.food < p_food THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient food');
  END IF;
  IF p_energy > 0 AND v_from_resources.energy < p_energy THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient energy');
  END IF;
  IF p_minerals > 0 AND v_from_resources.minerals < p_minerals THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient minerals');
  END IF;
  IF p_tech > 0 AND v_from_resources.tech < p_tech THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tech');
  END IF;
  
  -- Perform atomic transfer
  UPDATE resource_balances
  SET food = food - GREATEST(0, p_food),
      energy = energy - GREATEST(0, p_energy),
      minerals = minerals - GREATEST(0, p_minerals),
      tech = tech - GREATEST(0, p_tech),
      updated_at = now()
  WHERE territory_id = p_from_territory_id;
  
  UPDATE resource_balances
  SET food = food + GREATEST(0, p_food),
      energy = energy + GREATEST(0, p_energy),
      minerals = minerals + GREATEST(0, p_minerals),
      tech = tech + GREATEST(0, p_tech),
      updated_at = now()
  WHERE territory_id = p_to_territory_id;
  
  RETURN jsonb_build_object('success', true, 
    'transferred', jsonb_build_object('food', p_food, 'energy', p_energy, 'minerals', p_minerals, 'tech', p_tech));
END;
$$;

-- 4. Atomic deduction for single user (for colonization, purchases)
CREATE OR REPLACE FUNCTION public.atomic_deduct_currency(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Lock and get balance
  SELECT balance INTO v_balance FROM player_wallets 
  WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance: ' || v_balance || ' < ' || p_amount);
  END IF;
  
  UPDATE player_wallets 
  SET balance = balance - p_amount,
      total_spent = total_spent + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
END;
$$;

-- 5. Atomic token deduction for single user
CREATE OR REPLACE FUNCTION public.atomic_deduct_token(
  p_user_id UUID,
  p_token_type TEXT,
  p_amount INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens RECORD;
  v_current INT;
BEGIN
  -- Lock and get tokens
  SELECT * INTO v_tokens FROM user_tokens 
  WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_tokens IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tokens not found');
  END IF;
  
  -- Get current amount based on token type
  IF p_token_type = 'land' THEN
    v_current := v_tokens.land_tokens;
  ELSIF p_token_type = 'city' THEN
    v_current := v_tokens.city_tokens;
  ELSIF p_token_type = 'state' THEN
    v_current := v_tokens.state_tokens;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token type');
  END IF;
  
  IF v_current < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens: ' || v_current || ' < ' || p_amount);
  END IF;
  
  -- Deduct based on type
  IF p_token_type = 'land' THEN
    UPDATE user_tokens SET land_tokens = land_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'city' THEN
    UPDATE user_tokens SET city_tokens = city_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'state' THEN
    UPDATE user_tokens SET state_tokens = state_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'new_amount', v_current - p_amount);
END;
$$;

-- 6. Atomic refund function for cancelled orders
CREATE OR REPLACE FUNCTION public.atomic_refund_currency(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM player_wallets 
  WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;
  
  UPDATE player_wallets 
  SET balance = balance + p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_balance + p_amount);
END;
$$;

-- 7. Atomic token refund for cancelled orders
CREATE OR REPLACE FUNCTION public.atomic_refund_token(
  p_user_id UUID,
  p_token_type TEXT,
  p_amount INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token_type = 'land' THEN
    UPDATE user_tokens SET land_tokens = land_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'city' THEN
    UPDATE user_tokens SET city_tokens = city_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'state' THEN
    UPDATE user_tokens SET state_tokens = state_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token type');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Atomic resource refund for cancelled orders
CREATE OR REPLACE FUNCTION public.atomic_refund_resource(
  p_territory_id UUID,
  p_resource_type TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_resource_type = 'food' THEN
    UPDATE resource_balances SET food = food + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'energy' THEN
    UPDATE resource_balances SET energy = energy + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'minerals' THEN
    UPDATE resource_balances SET minerals = minerals + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'tech' THEN
    UPDATE resource_balances SET tech = tech + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid resource type');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Atomic cell purchase with status locking to prevent concurrent purchases
CREATE OR REPLACE FUNCTION public.atomic_purchase_cell(
  p_buyer_user_id UUID,
  p_buyer_territory_id UUID,
  p_cell_id UUID,
  p_transfer_id UUID,
  p_price NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cell RECORD;
  v_transfer RECORD;
  v_seller_id UUID;
  v_buyer_balance NUMERIC;
  v_seller_balance NUMERIC;
BEGIN
  -- Lock and verify transfer is still pending
  SELECT * INTO v_transfer FROM territory_transfers 
  WHERE id = p_transfer_id AND transfer_type = 'sale_pending' FOR UPDATE;
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sale is no longer available');
  END IF;
  
  -- Lock and get cell info
  SELECT c.*, t.owner_id as seller_user_id 
  INTO v_cell 
  FROM cells c
  LEFT JOIN territories t ON t.id = c.owner_territory_id
  WHERE c.id = p_cell_id FOR UPDATE;
  
  IF v_cell IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cell not found');
  END IF;
  
  v_seller_id := v_cell.seller_user_id;
  
  -- Lock buyer wallet and verify funds
  SELECT balance INTO v_buyer_balance FROM player_wallets 
  WHERE user_id = p_buyer_user_id FOR UPDATE;
  
  IF v_buyer_balance IS NULL OR v_buyer_balance < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds');
  END IF;
  
  -- Deduct from buyer
  UPDATE player_wallets 
  SET balance = balance - p_price, total_spent = total_spent + p_price, updated_at = now()
  WHERE user_id = p_buyer_user_id;
  
  -- Credit seller if exists
  IF v_seller_id IS NOT NULL THEN
    UPDATE player_wallets 
    SET balance = balance + p_price, total_earned = total_earned + p_price, updated_at = now()
    WHERE user_id = v_seller_id;
  END IF;
  
  -- Transfer cell ownership
  UPDATE cells 
  SET owner_territory_id = p_buyer_territory_id,
      colonized_by = p_buyer_user_id,
      colonized_at = now(),
      updated_at = now()
  WHERE id = p_cell_id;
  
  -- Mark transfer as completed
  UPDATE territory_transfers 
  SET transfer_type = 'sale_completed',
      to_territory_id = p_buyer_territory_id
  WHERE id = p_transfer_id;
  
  RETURN jsonb_build_object('success', true, 'cell_id', p_cell_id);
END;
$$;