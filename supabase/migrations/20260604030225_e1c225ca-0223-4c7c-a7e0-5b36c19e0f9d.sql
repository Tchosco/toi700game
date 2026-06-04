
-- =========================
-- NEWSPAPERS
-- =========================
CREATE TABLE IF NOT EXISTS public.newspapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  slogan text,
  editorial_line text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  total_articles int NOT NULL DEFAULT 0,
  total_views int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.newspapers TO anon, authenticated;
GRANT INSERT, UPDATE ON public.newspapers TO authenticated;
GRANT ALL ON public.newspapers TO service_role;
ALTER TABLE public.newspapers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Newspapers viewable by everyone" ON public.newspapers FOR SELECT USING (true);
CREATE POLICY "Territory owner creates newspaper" ON public.newspapers FOR INSERT
  WITH CHECK (
    auth.uid() = owner_user_id
    AND EXISTS (SELECT 1 FROM territories WHERE id = territory_id AND owner_id = auth.uid() AND status = 'active')
  );
CREATE POLICY "Owner updates newspaper" ON public.newspapers FOR UPDATE
  USING (auth.uid() = owner_user_id);
CREATE POLICY "Admins manage newspapers" ON public.newspapers FOR ALL USING (has_role(auth.uid(),'admin'));

-- =========================
-- ARTICLES
-- =========================
CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  newspaper_id uuid NOT NULL REFERENCES public.newspapers(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL,
  title text NOT NULL,
  lead text,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','politics','economy','war','diplomacy','culture','opinion','breaking')),
  cover_image_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','retracted')),
  is_featured boolean NOT NULL DEFAULT false,
  views_count int NOT NULL DEFAULT 0,
  likes_count int NOT NULL DEFAULT 0,
  dislikes_count int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles viewable by everyone" ON public.news_articles FOR SELECT
  USING (status = 'published' OR author_user_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "Owner publishes articles" ON public.news_articles FOR INSERT
  WITH CHECK (
    auth.uid() = author_user_id
    AND EXISTS (
      SELECT 1 FROM public.newspapers n
      WHERE n.id = newspaper_id AND n.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Author updates own articles" ON public.news_articles FOR UPDATE
  USING (auth.uid() = author_user_id);
CREATE POLICY "Admins manage articles" ON public.news_articles FOR ALL USING (has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_news_articles_pub ON public.news_articles (published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_news_articles_newspaper ON public.news_articles (newspaper_id);

-- =========================
-- REACTIONS
-- =========================
CREATE TABLE IF NOT EXISTS public.article_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, user_id)
);
GRANT SELECT ON public.article_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.article_reactions TO authenticated;
GRANT ALL ON public.article_reactions TO service_role;
ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions viewable by everyone" ON public.article_reactions FOR SELECT USING (true);
CREATE POLICY "Users react once" ON public.article_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reaction" ON public.article_reactions FOR DELETE
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reactions" ON public.article_reactions FOR ALL USING (has_role(auth.uid(),'admin'));

-- =========================
-- TRIGGERS: maintain counters
-- =========================
CREATE OR REPLACE FUNCTION public.tg_article_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := now();
    END IF;
    UPDATE newspapers SET total_articles = total_articles + 1, updated_at = now()
      WHERE id = NEW.newspaper_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE newspapers SET total_articles = GREATEST(total_articles - 1, 0), updated_at = now()
      WHERE id = OLD.newspaper_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_article_set_pub()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_article_before_ins ON public.news_articles;
CREATE TRIGGER trg_article_before_ins
  BEFORE INSERT OR UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.tg_article_set_pub();

DROP TRIGGER IF EXISTS trg_article_after_change ON public.news_articles;
CREATE TRIGGER trg_article_after_change
  AFTER INSERT OR DELETE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.tg_article_after_change();

CREATE OR REPLACE FUNCTION public.tg_reaction_after_change()
RETURNS trigger LANGUAGE plpgsql AS $$
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
DROP TRIGGER IF EXISTS trg_reaction_after ON public.article_reactions;
CREATE TRIGGER trg_reaction_after
  AFTER INSERT OR DELETE ON public.article_reactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_reaction_after_change();

-- =========================
-- RPC: increment views
-- =========================
CREATE OR REPLACE FUNCTION public.increment_article_views(_article_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE news_articles SET views_count = views_count + 1 WHERE id = _article_id;
  UPDATE newspapers n SET total_views = total_views + 1
    FROM news_articles a WHERE a.id = _article_id AND n.id = a.newspaper_id;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_article_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_article_views(uuid) TO anon, authenticated;
