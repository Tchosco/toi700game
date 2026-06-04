import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Newspaper, ThumbsUp, ThumbsDown, Eye, Flame, Star } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  lead: string | null;
  category: string;
  is_featured: boolean;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  published_at: string | null;
  cover_image_url: string | null;
  newspaper_id: string;
  newspapers?: { name: string; territory_id: string } | null;
}

interface NewspaperRow {
  id: string;
  name: string;
  slogan: string | null;
  total_articles: number;
  total_views: number;
  territory_id: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  general: 'Geral',
  politics: 'Política',
  economy: 'Economia',
  war: 'Guerra',
  diplomacy: 'Diplomacia',
  culture: 'Cultura',
  opinion: 'Opinião',
  breaking: 'Urgente',
};

export default function NewsPortalPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [newspapers, setNewspapers] = useState<NewspaperRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, n] = await Promise.all([
        supabase
          .from('news_articles')
          .select('id,title,lead,category,is_featured,views_count,likes_count,dislikes_count,published_at,cover_image_url,newspaper_id,newspapers(name,territory_id)')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(80),
        supabase
          .from('newspapers')
          .select('id,name,slogan,total_articles,total_views,territory_id')
          .eq('is_active', true)
          .order('total_views', { ascending: false }),
      ]);
      if (a.data) setArticles(a.data as any);
      if (n.data) setNewspapers(n.data as any);
      setLoading(false);
    })();
  }, []);

  const filtered = category === 'all' ? articles : articles.filter(a => a.category === category);
  const featured = articles.filter(a => a.is_featured).slice(0, 3);
  const breaking = articles.filter(a => a.category === 'breaking').slice(0, 5);

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Portal Planetário de Notícias</h1>
            <p className="text-muted-foreground">A imprensa livre de TOI-700</p>
          </div>
        </div>

        {breaking.length > 0 && (
          <Card className="border-red-500/40 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-500 text-base">
                <Flame className="h-4 w-4" /> Última hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {breaking.map(a => (
                  <li key={a.id}>
                    <Link to={`/noticias/${a.id}`} className="hover:underline font-medium">
                      {a.title}
                    </Link>
                    <span className="text-muted-foreground"> — {a.newspapers?.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {featured.length > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {featured.map(a => (
              <Link key={a.id} to={`/noticias/${a.id}`}>
                <Card className="h-full hover:border-primary transition-colors">
                  {a.cover_image_url && (
                    <div className="h-32 bg-cover bg-center rounded-t-lg" style={{ backgroundImage: `url(${a.cover_image_url})` }} />
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
                      <Star className="h-3 w-3 fill-current" /> Destaque
                    </div>
                    <CardTitle className="text-base line-clamp-2">{a.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{a.lead}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">Tudo</TabsTrigger>
            {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
              <TabsTrigger key={k} value={k}>{l}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={category} className="space-y-3 mt-4">
            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Sem matérias nesta categoria</CardContent></Card>
            ) : (
              filtered.map(a => (
                <Link key={a.id} to={`/noticias/${a.id}`}>
                  <Card className="hover:border-primary transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABEL[a.category]}</Badge>
                        <span className="text-xs text-muted-foreground">{a.newspapers?.name}</span>
                        {a.published_at && (
                          <span className="text-xs text-muted-foreground">· {new Date(a.published_at).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.lead && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.lead}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{a.views_count}</span>
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{a.likes_count}</span>
                        <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3" />{a.dislikes_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornais em circulação</CardTitle>
            <CardDescription>{newspapers.length} veículos ativos no planeta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {newspapers.map(n => (
                <div key={n.id} className="p-3 border rounded-lg">
                  <p className="font-medium">{n.name}</p>
                  {n.slogan && <p className="text-xs italic text-muted-foreground">"{n.slogan}"</p>}
                  <p className="text-xs text-muted-foreground mt-1">{n.total_articles} matérias · {n.total_views} leituras</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
