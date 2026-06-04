import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Newspaper, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const CATS = ['general','politics','economy','war','diplomacy','culture','opinion','breaking'];

export default function MyNewspaperPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [territory, setTerritory] = useState<any>(null);
  const [paper, setPaper] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);

  // Newspaper form
  const [name, setName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [line, setLine] = useState('');

  // Article form
  const [openArt, setOpenArt] = useState(false);
  const [title, setTitle] = useState('');
  const [lead, setLead] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [featured, setFeatured] = useState(false);
  const [cover, setCover] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data: t } = await supabase
      .from('territories').select('id, name').eq('owner_id', user.id).eq('status', 'active').limit(1).maybeSingle();
    setTerritory(t);
    if (t) {
      const { data: p } = await supabase.from('newspapers').select('*').eq('territory_id', t.id).maybeSingle();
      setPaper(p);
      if (p) {
        setName(p.name); setSlogan(p.slogan ?? ''); setLine(p.editorial_line ?? '');
        const { data: arts } = await supabase
          .from('news_articles').select('*')
          .eq('newspaper_id', p.id)
          .order('created_at', { ascending: false });
        setArticles(arts ?? []);
      }
    }
    setLoading(false);
  };

  const saveNewspaper = async () => {
    if (!user || !territory) return;
    if (!name.trim()) { toast.error('Nome obrigatório'); return; }
    if (paper) {
      const { error } = await supabase.from('newspapers')
        .update({ name, slogan, editorial_line: line })
        .eq('id', paper.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Atualizado');
    } else {
      const { error } = await supabase.from('newspapers').insert({
        territory_id: territory.id, owner_user_id: user.id, name, slogan, editorial_line: line,
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Jornal fundado');
    }
    load();
  };

  const publish = async () => {
    if (!paper || !user) return;
    if (!title.trim() || !body.trim()) { toast.error('Título e corpo obrigatórios'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('news_articles').insert({
      newspaper_id: paper.id,
      author_user_id: user.id,
      title, lead, body, category, is_featured: featured,
      cover_image_url: cover || null,
      status: 'published',
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Matéria publicada');
    setOpenArt(false);
    setTitle(''); setLead(''); setBody(''); setCategory('general'); setFeatured(false); setCover('');
    load();
  };

  const retract = async (id: string) => {
    await supabase.from('news_articles').update({ status: 'retracted' }).eq('id', id);
    toast.success('Matéria retirada');
    load();
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;

  if (!user) return <Layout><div className="container mx-auto p-8 text-center">Entre para gerenciar seu jornal.</div></Layout>;
  if (!territory) return <Layout><div className="container mx-auto p-8 text-center">Você precisa de um território ativo para fundar um jornal.</div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{paper ? paper.name : 'Fundar Jornal'}</h1>
            <p className="text-muted-foreground">{territory.name}</p>
          </div>
        </div>

        <Tabs defaultValue={paper ? 'articles' : 'settings'}>
          <TabsList>
            <TabsTrigger value="articles" disabled={!paper}>Matérias</TabsTrigger>
            <TabsTrigger value="settings">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{paper ? 'Editar Jornal' : 'Fundar Jornal'}</CardTitle>
                <CardDescription>Cada Estado pode operar um único jornal oficial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} maxLength={120} /></div>
                <div><Label>Lema</Label><Input value={slogan} onChange={e => setSlogan(e.target.value)} maxLength={200} /></div>
                <div><Label>Linha editorial</Label><Textarea value={line} onChange={e => setLine(e.target.value)} rows={4} /></div>
                <Button onClick={saveNewspaper}>{paper ? 'Salvar' : 'Fundar Jornal'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={openArt} onOpenChange={setOpenArt}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova matéria</Button></DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Publicar matéria</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} /></div>
                    <div><Label>Lead</Label><Textarea value={lead} onChange={e => setLead(e.target.value)} rows={2} /></div>
                    <div><Label>Corpo</Label><Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Categoria</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>URL da capa (opcional)</Label><Input value={cover} onChange={e => setCover(e.target.value)} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="feat" checked={featured} onCheckedChange={(v) => setFeatured(!!v)} />
                      <Label htmlFor="feat">Destaque do portal</Label>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={publish} disabled={submitting}>Publicar</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {articles.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma matéria publicada ainda</CardContent></Card>
            ) : articles.map(a => (
              <Card key={a.id}>
                <CardContent className="pt-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={a.status === 'published' ? 'default' : 'secondary'}>{a.status}</Badge>
                      <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      {a.is_featured && <Badge className="bg-amber-500 text-xs">Destaque</Badge>}
                    </div>
                    <Link to={`/noticias/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.views_count} leituras · {a.likes_count} 👍 · {a.dislikes_count} 👎
                    </p>
                  </div>
                  {a.status === 'published' && (
                    <Button variant="ghost" size="icon" onClick={() => retract(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
