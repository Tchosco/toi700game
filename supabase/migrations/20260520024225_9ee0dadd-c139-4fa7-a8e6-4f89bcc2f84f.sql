
-- Revert the loose public profile policy and column grants
DROP POLICY IF EXISTS "Public basic profile info readable" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT (id, username, avatar_url, created_at) ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;  -- RLS restricts rows

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Redaction view: definer so anyone may read safe columns only
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, username, avatar_url, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
