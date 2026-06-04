
-- 1. amendment_votes INSERT policy
DROP POLICY IF EXISTS "Territory owners cast amendment votes" ON public.amendment_votes;
CREATE POLICY "Territory owners cast amendment votes"
  ON public.amendment_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = voter_territory_id
        AND t.owner_id = auth.uid()
        AND t.status = 'active'
    )
  );

-- 2. supreme_court_votes INSERT policy
DROP POLICY IF EXISTS "Active justices vote" ON public.supreme_court_votes;
CREATE POLICY "Active justices vote"
  ON public.supreme_court_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_user_id
    AND EXISTS (
      SELECT 1
      FROM public.supreme_court_justices j
      JOIN public.territories t ON t.id = j.territory_id
      WHERE j.id = justice_id
        AND j.status = 'active'
        AND t.owner_id = auth.uid()
    )
  );

-- 3. territory_missions: admin bypass + WITH CHECK to prevent owner from forging completion
DROP POLICY IF EXISTS "Admins manage territory missions" ON public.territory_missions;
CREATE POLICY "Admins manage territory missions"
  ON public.territory_missions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Tighten owner UPDATE: re-create with strict WITH CHECK that blocks status/progress edits.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='territory_missions' AND cmd='UPDATE'
             AND policyname <> 'Admins manage territory missions'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.territory_missions', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "Owners can update non-progress fields"
  ON public.territory_missions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = territory_missions.territory_id AND t.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.territories t
      WHERE t.id = territory_missions.territory_id AND t.owner_id = auth.uid()
    )
    -- Disallow owners from flipping status to 'completed' or arbitrarily changing progress;
    -- those transitions must go through admin/service_role or RPCs.
    AND status IS NOT DISTINCT FROM (
      SELECT tm.status FROM public.territory_missions tm WHERE tm.id = territory_missions.id
    )
    AND progress IS NOT DISTINCT FROM (
      SELECT tm.progress FROM public.territory_missions tm WHERE tm.id = territory_missions.id
    )
  );

-- 4. search_path on legacy trigger functions
CREATE OR REPLACE FUNCTION public.tg_article_set_pub()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_reaction_after_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE news_articles SET
      likes_count = likes_count + CASE WHEN NEW.reaction='like' THEN 1 ELSE 0 END,
      dislikes_count = dislikes_count + CASE WHEN NEW.reaction='dislike' THEN 1 ELSE 0 END
    WHERE id = NEW.article_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE news_articles SET
      likes_count = GREATEST(likes_count - CASE WHEN OLD.reaction='like' THEN 1 ELSE 0 END, 0),
      dislikes_count = GREATEST(dislikes_count - CASE WHEN OLD.reaction='dislike' THEN 1 ELSE 0 END, 0)
    WHERE id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$;
