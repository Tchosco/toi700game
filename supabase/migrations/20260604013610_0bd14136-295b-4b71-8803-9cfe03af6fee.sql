
-- 1. legal_history: lock down INSERT
DROP POLICY IF EXISTS "System manages legal history" ON public.legal_history;
CREATE POLICY "Admins insert legal history" ON public.legal_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. notifications: only admins can insert (edge functions use service_role)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. user_achievements: restrict INSERT to admins; SELECT to owner+admin
DROP POLICY IF EXISTS "System manages user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "User achievements viewable by everyone" ON public.user_achievements;
CREATE POLICY "Admins insert user achievements" ON public.user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 4. cells UPDATE: add ownership check
DROP POLICY IF EXISTS "Users can colonize explored cells" ON public.cells;
CREATE POLICY "Users can colonize explored cells" ON public.cells
  FOR UPDATE TO authenticated
  USING (status = 'explored' AND owner_territory_id IS NULL)
  WITH CHECK (
    status IN ('explored','colonized')
    AND (
      owner_territory_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.territories t
        WHERE t.id = owner_territory_id AND t.owner_id = auth.uid()
      )
    )
  );

-- 5. resource_balances: owner-only read
DROP POLICY IF EXISTS "Resource balances viewable by everyone" ON public.resource_balances;
CREATE POLICY "Owners view resource balances" ON public.resource_balances
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = resource_balances.territory_id AND t.owner_id = auth.uid()
    )
  );

-- 6. territory_resources: owner-only read
DROP POLICY IF EXISTS "Resources viewable by everyone" ON public.territory_resources;
CREATE POLICY "Owners view territory resources" ON public.territory_resources
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = territory_resources.territory_id AND t.owner_id = auth.uid()
    )
  );

-- 7. public_profiles: replace SECURITY DEFINER view with security_invoker + safe RPC
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profile_basic(p_user_ids uuid[])
RETURNS TABLE(id uuid, username text, avatar_url text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(p_user_ids);
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_basic(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_basic(uuid[]) TO authenticated, service_role;

-- 8. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
-- (edge functions invoke via service_role; client callers go through the RPCs we expose)
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'acquire_tick_lock()',
    'release_tick_lock()',
    'atomic_create_territory(uuid,text,uuid,text,government_type,territory_style,text)',
    'atomic_deduct_currency(uuid,numeric)',
    'atomic_deduct_token(uuid,text,integer)',
    'atomic_purchase_cell(uuid,uuid,uuid,uuid,numeric)',
    'atomic_refund_currency(uuid,numeric)',
    'atomic_refund_resource(uuid,text,numeric)',
    'atomic_refund_token(uuid,text,integer)',
    'atomic_transfer_currency(uuid,uuid,numeric)',
    'atomic_transfer_resources(uuid,uuid,numeric,numeric,numeric,numeric)',
    'atomic_transfer_tokens(uuid,uuid,integer,integer,integer)',
    'atomic_update_resource_balances(uuid,numeric,numeric,numeric,numeric,integer)',
    'generate_populated_cells(uuid,integer)',
    'generate_region_cells(uuid,integer)',
    'match_market_order(uuid,uuid,uuid,text,text,numeric,numeric,numeric)'
  ]
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
