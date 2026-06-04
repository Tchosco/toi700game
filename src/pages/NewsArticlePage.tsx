import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Eye, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NewsArticlePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState<any>(null);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('news_articles')
      .select('*, newspapers(name, slogan, territory_id, territories:territory_id(name))')
      .eq('id', id)
      .maybeSingle();
    setArticle(data);
    if (user && data) {
      const { data: r } = await supabase
        .from('article_reactions')
        .select('reaction')
        .eq('article_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      setMyReaction(r?.reaction ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (id) supabase.rpc('increment_article_views', { _article_id: id });
  }, [id, user]);

  const react = async (r: 'like' | 'dislike') => {
    if (!user) { toast.error('Entre para reagir'); return; }
    if (myReaction === r) {
      await supabase.from('article_reactions').delete().eq('article_id', id!).eq('user_id', user.id);
      setMyReaction(null);
    } else {
      if (myReaction) {
        await supabase.from('article_reactions').delete().eq('article_id', id!).eq('user_id', user.id);
      }
      const { error } = await supabase.from('article_reactions').insert({ article_id: id!, user_id: user.id, reaction: r });
      if (error) { toast.error(error.message); return; }
      setMyReaction(r);
    }
    load();
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;
  if (!article) return <Layout><div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Matéria não encontrada</div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Link to="/noticias" className="text-sm text-muted-foreground hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft className="h-3 w-3" /> Portal de Notícias
        </Link>
        {article.cover_image_url && (
          <div className="h-64 bg-cover bg-center rounded-lg mb-4" style={{ backgroundImage: `url(${article.cover_image_url})` }} />
        )}
        <div className="flex items-center gap-2 mb-2">
          <Badge>{article.category}</Badge>
          <span className="text-sm text-muted-foreground">
            {article.newspapers?.name} {article.newspapers?.territories?.name && ` · ${article.newspapers.territories.name}`}
          </span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
        {article.lead && <p className="text-lg text-muted-foreground mb-4">{article.lead}</p>}
        {article.published_at && (
          <p className="text-xs text-muted-foreground mb-4">
            Publicado em {new Date(article.published_at).toLocaleString('pt-BR')}
          </p>
        )}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap">{article.body}</div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mt-4">
          <Button variant={myReaction === 'like' ? 'default' : 'outline'} size="sm" onClick={() => react('like')}>
            <ThumbsUp className="h-4 w-4 mr-1" /> {article.likes_count}
          </Button>
          <Button variant={myReaction === 'dislike' ? 'destructive' : 'outline'} size="sm" onClick={() => react('dislike')}>
            <ThumbsDown className="h-4 w-4 mr-1" /> {article.dislikes_count}
          </Button>
          <span className="text-sm text-muted-foreground flex items-center gap-1 ml-auto">
            <Eye className="h-4 w-4" /> {article.views_count}
          </span>
        </div>
      </div>
    </Layout>
  );
}
