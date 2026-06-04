
-- Tighten territory_research SELECT to owner+admin
DROP POLICY IF EXISTS "Research viewable by everyone" ON public.territory_research;

CREATE POLICY "Owners view territory research"
ON public.territory_research
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.territories t
    WHERE t.id = territory_research.territory_id
      AND t.owner_id = auth.uid()
  )
);

-- Prevent role enumeration: only allow checking own uid (admins may check anyone)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        _user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur2
          WHERE ur2.user_id = auth.uid() AND ur2.role = 'admin'::app_role
        )
      )
  )
$$;
