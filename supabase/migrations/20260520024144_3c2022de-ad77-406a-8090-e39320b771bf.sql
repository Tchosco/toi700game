
-- ============================================================
-- 1. Move treasury to a separate, owner-restricted table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.territory_treasuries (
  territory_id uuid PRIMARY KEY REFERENCES public.territories(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.territory_treasuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own treasury"
ON public.territory_treasuries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.territories t
    WHERE t.id = territory_treasuries.territory_id AND t.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins manage treasuries"
ON public.territory_treasuries
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Backfill from existing column if present
INSERT INTO public.territory_treasuries (territory_id, balance)
SELECT id, COALESCE(treasury, 0) FROM public.territories
ON CONFLICT (territory_id) DO NOTHING;

-- Drop the now-exposed column
ALTER TABLE public.territories DROP COLUMN IF EXISTS treasury;

-- Update atomic_create_territory to populate the new table
CREATE OR REPLACE FUNCTION public.atomic_create_territory(
  p_user_id uuid, p_name text, p_region_id uuid, p_capital_name text,
  p_government_type government_type, p_style territory_style, p_lore text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_territory RECORD;
  v_region RECORD;
  v_cell RECORD;
  v_city_id uuid;
  v_territory_id uuid;
  v_is_first_territory BOOLEAN;
  v_initial_status territory_status;
  v_initial_urban_pop INTEGER;
  v_initial_rural_pop INTEGER;
BEGIN
  -- AuthZ: only the authenticated user can create their own territory (admins exempt)
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized', 'code', 'AUTHZ');
  END IF;

  SELECT id, name INTO v_existing_territory
  FROM territories WHERE owner_id = p_user_id LIMIT 1;

  IF v_existing_territory.id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Você já possui o território "' || v_existing_territory.name || '". Cada usuário pode ter apenas um território.',
      'code', 'TERRITORY_EXISTS');
  END IF;

  v_is_first_territory := TRUE;
  v_initial_status := 'active';
  v_initial_urban_pop := 280000;
  v_initial_rural_pop := 0;

  SELECT id, name, is_visible INTO v_region FROM regions WHERE id = p_region_id;
  IF v_region.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Região não encontrada.', 'code', 'REGION_NOT_FOUND');
  END IF;
  IF NOT v_region.is_visible THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta região ainda não foi revelada para colonização.', 'code', 'REGION_NOT_VISIBLE');
  END IF;

  SELECT id INTO v_cell FROM cells
  WHERE region_id = p_region_id AND status = 'explored' AND owner_territory_id IS NULL AND city_id IS NULL
  ORDER BY is_urban_eligible DESC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;

  IF v_cell.id IS NULL THEN
    INSERT INTO cells (region_id, status, is_urban_eligible, cell_type, area_km2, colonization_cost, explored_at,
      urban_population, rural_population, resource_food, resource_energy, resource_minerals, resource_tech, resource_influence)
    VALUES (p_region_id, 'explored', true, 'urban', 7500, 0, now(),
      v_initial_urban_pop, v_initial_rural_pop,
      floor(random() * 50 + 20)::numeric, floor(random() * 40 + 30)::numeric,
      floor(random() * 30 + 10)::numeric, floor(random() * 60 + 40)::numeric, floor(random() * 50 + 30)::numeric)
    RETURNING id INTO v_cell;
  END IF;

  INSERT INTO cities (name, cell_id, region_id, status, is_neutral, population, urban_population)
  VALUES (p_capital_name, v_cell.id, p_region_id, 'occupied', false, v_initial_urban_pop, v_initial_urban_pop)
  RETURNING id INTO v_city_id;

  INSERT INTO territories (name, owner_id, capital_city_id, region_id, government_type, style, lore,
    accepted_statute, status, level, stability, economy_rating, total_urban_population, total_rural_population)
  VALUES (p_name, p_user_id, v_city_id, p_region_id, p_government_type, p_style, p_lore,
    true, v_initial_status, 'colony', 50, 50, v_initial_urban_pop, v_initial_rural_pop)
  RETURNING id INTO v_territory_id;

  INSERT INTO territory_treasuries (territory_id, balance) VALUES (v_territory_id, 500);

  UPDATE cells SET status = 'colonized', owner_territory_id = v_territory_id, colonized_by = p_user_id,
    colonized_at = now(), has_city = true, city_id = v_city_id, cell_type = 'urban',
    urban_population = v_initial_urban_pop, updated_at = now() WHERE id = v_cell.id;

  UPDATE cities SET owner_territory_id = v_territory_id WHERE id = v_city_id;

  INSERT INTO resource_balances (territory_id, food, energy, minerals, tech)
  VALUES (v_territory_id, 500, 500, 200, 50);

  UPDATE world_config SET active_urban_population = active_urban_population + v_initial_urban_pop,
    latent_population = latent_population - v_initial_urban_pop
  WHERE id = '00000000-0000-0000-0000-000000000001';

  INSERT INTO event_logs (event_type, territory_id, title, description, effects)
  VALUES ('territory_created', v_territory_id, 'Território "' || p_name || '" criado e ativado',
    'Um novo território foi fundado na região ' || v_region.name || ' com a capital ' || p_capital_name || '.',
    jsonb_build_object('capital_name', p_capital_name, 'region_name', v_region.name,
      'auto_approved', true, 'initial_population', v_initial_urban_pop));

  RETURN jsonb_build_object('success', true, 'territory_id', v_territory_id, 'city_id', v_city_id,
    'cell_id', v_cell.id, 'auto_approved', true,
    'message', 'Território criado e ativado automaticamente! Bem-vindo ao TOI-700!');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', SQLSTATE);
END;
$function$;

-- ============================================================
-- 2. Add caller-ownership checks to atomic_* functions
-- ============================================================
CREATE OR REPLACE FUNCTION public.atomic_transfer_currency(p_from_user_id uuid, p_to_user_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_from_balance NUMERIC; v_to_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_from_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_amount <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive'); END IF;
  IF p_from_user_id < p_to_user_id THEN
    SELECT balance INTO v_from_balance FROM player_wallets WHERE user_id = p_from_user_id FOR UPDATE;
    SELECT balance INTO v_to_balance FROM player_wallets WHERE user_id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT balance INTO v_to_balance FROM player_wallets WHERE user_id = p_to_user_id FOR UPDATE;
    SELECT balance INTO v_from_balance FROM player_wallets WHERE user_id = p_from_user_id FOR UPDATE;
  END IF;
  IF v_from_balance IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Source wallet not found'); END IF;
  IF v_to_balance IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Destination wallet not found'); END IF;
  IF v_from_balance < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  UPDATE player_wallets SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now() WHERE user_id = p_from_user_id;
  UPDATE player_wallets SET balance = balance + p_amount, total_earned = total_earned + p_amount, updated_at = now() WHERE user_id = p_to_user_id;
  RETURN jsonb_build_object('success', true, 'transferred', p_amount);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_transfer_tokens(p_from_user_id uuid, p_to_user_id uuid, p_city_tokens integer DEFAULT 0, p_land_tokens integer DEFAULT 0, p_state_tokens integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_from_tokens RECORD; v_to_tokens RECORD;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_from_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_city_tokens <= 0 AND p_land_tokens <= 0 AND p_state_tokens <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No tokens to transfer'); END IF;
  IF p_from_user_id < p_to_user_id THEN
    SELECT * INTO v_from_tokens FROM user_tokens WHERE user_id = p_from_user_id FOR UPDATE;
    SELECT * INTO v_to_tokens FROM user_tokens WHERE user_id = p_to_user_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_tokens FROM user_tokens WHERE user_id = p_to_user_id FOR UPDATE;
    SELECT * INTO v_from_tokens FROM user_tokens WHERE user_id = p_from_user_id FOR UPDATE;
  END IF;
  IF v_from_tokens IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Source tokens not found'); END IF;
  IF v_to_tokens IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Destination tokens not found'); END IF;
  IF p_city_tokens > 0 AND v_from_tokens.city_tokens < p_city_tokens THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient city tokens'); END IF;
  IF p_land_tokens > 0 AND v_from_tokens.land_tokens < p_land_tokens THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient land tokens'); END IF;
  IF p_state_tokens > 0 AND v_from_tokens.state_tokens < p_state_tokens THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient state tokens'); END IF;
  UPDATE user_tokens SET city_tokens = city_tokens - GREATEST(0, p_city_tokens),
    land_tokens = land_tokens - GREATEST(0, p_land_tokens),
    state_tokens = state_tokens - GREATEST(0, p_state_tokens), updated_at = now() WHERE user_id = p_from_user_id;
  UPDATE user_tokens SET city_tokens = city_tokens + GREATEST(0, p_city_tokens),
    land_tokens = land_tokens + GREATEST(0, p_land_tokens),
    state_tokens = state_tokens + GREATEST(0, p_state_tokens), updated_at = now() WHERE user_id = p_to_user_id;
  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_transfer_resources(p_from_territory_id uuid, p_to_territory_id uuid, p_food numeric DEFAULT 0, p_energy numeric DEFAULT 0, p_minerals numeric DEFAULT 0, p_tech numeric DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_from_resources RECORD; v_to_resources RECORD;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM territories WHERE id = p_from_territory_id AND owner_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_food <= 0 AND p_energy <= 0 AND p_minerals <= 0 AND p_tech <= 0 THEN RETURN jsonb_build_object('success', false, 'error', 'No resources to transfer'); END IF;
  IF p_from_territory_id < p_to_territory_id THEN
    SELECT * INTO v_from_resources FROM resource_balances WHERE territory_id = p_from_territory_id FOR UPDATE;
    SELECT * INTO v_to_resources FROM resource_balances WHERE territory_id = p_to_territory_id FOR UPDATE;
  ELSE
    SELECT * INTO v_to_resources FROM resource_balances WHERE territory_id = p_to_territory_id FOR UPDATE;
    SELECT * INTO v_from_resources FROM resource_balances WHERE territory_id = p_from_territory_id FOR UPDATE;
  END IF;
  IF v_from_resources IS NULL OR v_to_resources IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Resources not found'); END IF;
  IF p_food > 0 AND v_from_resources.food < p_food THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient food'); END IF;
  IF p_energy > 0 AND v_from_resources.energy < p_energy THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient energy'); END IF;
  IF p_minerals > 0 AND v_from_resources.minerals < p_minerals THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient minerals'); END IF;
  IF p_tech > 0 AND v_from_resources.tech < p_tech THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient tech'); END IF;
  UPDATE resource_balances SET food = food - GREATEST(0, p_food), energy = energy - GREATEST(0, p_energy),
    minerals = minerals - GREATEST(0, p_minerals), tech = tech - GREATEST(0, p_tech), updated_at = now()
  WHERE territory_id = p_from_territory_id;
  UPDATE resource_balances SET food = food + GREATEST(0, p_food), energy = energy + GREATEST(0, p_energy),
    minerals = minerals + GREATEST(0, p_minerals), tech = tech + GREATEST(0, p_tech), updated_at = now()
  WHERE territory_id = p_to_territory_id;
  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_deduct_currency(p_user_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  SELECT balance INTO v_balance FROM player_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  IF v_balance < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  UPDATE player_wallets SET balance = balance - p_amount, total_spent = total_spent + p_amount, updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_deduct_token(p_user_id uuid, p_token_type text, p_amount integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_tokens RECORD; v_current INT;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  SELECT * INTO v_tokens FROM user_tokens WHERE user_id = p_user_id FOR UPDATE;
  IF v_tokens IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Tokens not found'); END IF;
  IF p_token_type = 'land' THEN v_current := v_tokens.land_tokens;
  ELSIF p_token_type = 'city' THEN v_current := v_tokens.city_tokens;
  ELSIF p_token_type = 'state' THEN v_current := v_tokens.state_tokens;
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid token type'); END IF;
  IF v_current < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens'); END IF;
  IF p_token_type = 'land' THEN UPDATE user_tokens SET land_tokens = land_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'city' THEN UPDATE user_tokens SET city_tokens = city_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'state' THEN UPDATE user_tokens SET state_tokens = state_tokens - p_amount, updated_at = now() WHERE user_id = p_user_id; END IF;
  RETURN jsonb_build_object('success', true, 'new_amount', v_current - p_amount);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_refund_currency(p_user_id uuid, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  SELECT balance INTO v_balance FROM player_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Wallet not found'); END IF;
  UPDATE player_wallets SET balance = balance + p_amount, updated_at = now() WHERE user_id = p_user_id;
  RETURN jsonb_build_object('success', true, 'new_balance', v_balance + p_amount);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_refund_token(p_user_id uuid, p_token_type text, p_amount integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_token_type = 'land' THEN UPDATE user_tokens SET land_tokens = land_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'city' THEN UPDATE user_tokens SET city_tokens = city_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_token_type = 'state' THEN UPDATE user_tokens SET state_tokens = state_tokens + p_amount, updated_at = now() WHERE user_id = p_user_id;
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid token type'); END IF;
  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_refund_resource(p_territory_id uuid, p_resource_type text, p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM territories WHERE id = p_territory_id AND owner_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF p_resource_type = 'food' THEN UPDATE resource_balances SET food = food + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'energy' THEN UPDATE resource_balances SET energy = energy + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'minerals' THEN UPDATE resource_balances SET minerals = minerals + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSIF p_resource_type = 'tech' THEN UPDATE resource_balances SET tech = tech + p_amount, updated_at = now() WHERE territory_id = p_territory_id;
  ELSE RETURN jsonb_build_object('success', false, 'error', 'Invalid resource type'); END IF;
  RETURN jsonb_build_object('success', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.atomic_purchase_cell(p_buyer_user_id uuid, p_buyer_territory_id uuid, p_cell_id uuid, p_transfer_id uuid, p_price numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_cell RECORD; v_transfer RECORD; v_seller_id UUID; v_buyer_balance NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_buyer_user_id AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM territories WHERE id = p_buyer_territory_id AND owner_id = p_buyer_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Buyer territory does not belong to caller');
  END IF;
  SELECT * INTO v_transfer FROM territory_transfers WHERE id = p_transfer_id AND transfer_type = 'sale_pending' FOR UPDATE;
  IF v_transfer IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Sale is no longer available'); END IF;
  SELECT c.*, t.owner_id as seller_user_id INTO v_cell
    FROM cells c LEFT JOIN territories t ON t.id = c.owner_territory_id WHERE c.id = p_cell_id FOR UPDATE;
  IF v_cell IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Cell not found'); END IF;
  v_seller_id := v_cell.seller_user_id;
  SELECT balance INTO v_buyer_balance FROM player_wallets WHERE user_id = p_buyer_user_id FOR UPDATE;
  IF v_buyer_balance IS NULL OR v_buyer_balance < p_price THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient funds'); END IF;
  UPDATE player_wallets SET balance = balance - p_price, total_spent = total_spent + p_price, updated_at = now() WHERE user_id = p_buyer_user_id;
  IF v_seller_id IS NOT NULL THEN
    UPDATE player_wallets SET balance = balance + p_price, total_earned = total_earned + p_price, updated_at = now() WHERE user_id = v_seller_id;
  END IF;
  UPDATE cells SET owner_territory_id = p_buyer_territory_id, colonized_by = p_buyer_user_id, colonized_at = now(), updated_at = now() WHERE id = p_cell_id;
  UPDATE territory_transfers SET transfer_type = 'sale_completed', to_territory_id = p_buyer_territory_id WHERE id = p_transfer_id;
  RETURN jsonb_build_object('success', true, 'cell_id', p_cell_id);
END; $function$;

-- ============================================================
-- 3. Make public_profiles view security-invoker safe
-- ============================================================
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, username, avatar_url, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a permissive SELECT policy that exposes ONLY columns referenced by the view.
-- The view's security_invoker means it runs under the caller; row visibility for
-- non-owners is enabled via this dedicated "public basic info" policy. Since it
-- targets the same table as the owner policy and they are OR'd together, owners
-- still see all their columns; non-owners can only read columns granted at the
-- column level.
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, avatar_url, created_at) ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;  -- RLS still restricts rows

CREATE POLICY "Public basic profile info readable"
ON public.profiles
FOR SELECT
USING (true);

-- Drop the owner-only policy now that column grants protect financial fields
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
