import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Scale, Shield, AlertTriangle, FileEdit, ThumbsUp, ThumbsDown, MinusCircle, Gavel } from 'lucide-react';

interface Law {
  id: string;
  name: string;
  legal_level: string;
  category: string;
  description: string;
  full_text: string;
  status: string;
  is_constitution: boolean;
  enacted_at: string;
  population_sympathy: number;
  population_repulsion: number;
  positive_effects: string[];
  negative_effects: string[];
}

interface Amendment {
  id: string;
  title: string;
  rationale: string;
  proposed_text: string;
  target_section: string | null;
  status: 'draft' | 'voting' | 'approved' | 'rejected' | 'withdrawn';
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  voting_ends_at: string;
  approved_at: string | null;
  created_at: string;
  proposer_user_id: string;
  proposer_territory_id: string | null;
}

export default function ConstitutionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [constitution, setConstitution] = useState<Law | null>(null);
  const [planetaryLaws, setPlanetaryLaws] = useState<Law[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', rationale: '', proposed_text: '', target_section: '' });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: constData }, { data: lawsData }, { data: amendData }] = await Promise.all([
      supabase.from('laws').select('*').eq('legal_level', 'planetary').eq('is_constitution', true).eq('status', 'enacted').order('enacted_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('laws').select('*').eq('legal_level', 'planetary').eq('is_constitution', false).eq('status', 'enacted').order('enacted_at', { ascending: false }),
      (supabase as any).from('constitutional_amendments').select('*').order('created_at', { ascending: false }),
    ]);
    if (constData) setConstitution(constData as Law);
    if (lawsData) setPlanetaryLaws(lawsData as Law[]);
    if (amendData) setAmendments(amendData as Amendment[]);
    setLoading(false);
  }

  async function handlePropose() {
    if (!user) { toast({ title: 'Faça login para propor emendas', variant: 'destructive' }); return; }
    if (form.title.length < 5 || form.proposed_text.length < 20) {
      toast({ title: 'Preencha título e texto da emenda', variant: 'destructive' }); return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase as any).rpc('propose_amendment', {
      p_title: form.title,
      p_rationale: form.rationale,
      p_proposed_text: form.proposed_text,
      p_target_section: form.target_section || null,
    });
    setSubmitting(false);
    if (error || !data?.success) {
      toast({ title: 'Erro', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Emenda proposta', description: 'A votação está aberta por 7 dias.' });
    setProposeOpen(false);
    setForm({ title: '', rationale: '', proposed_text: '', target_section: '' });
    fetchAll();
  }

  async function handleVote(amendmentId: string, vote: 'yes' | 'no' | 'abstain') {
    if (!user) { toast({ title: 'Faça login para votar', variant: 'destructive' }); return; }
    const { data, error } = await (supabase as any).rpc('cast_amendment_vote', {
      p_amendment_id: amendmentId, p_vote: vote,
    });
    if (error || !data?.success) {
      toast({ title: 'Erro', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Voto registrado' });
    fetchAll();
  }

  async function handleFinalize(amendmentId: string) {
    const { data, error } = await (supabase as any).rpc('finalize_amendment', { p_amendment_id: amendmentId });
    if (error || !data?.success) {
      toast({ title: 'Erro', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Emenda ${data.result === 'approved' ? 'aprovada' : 'rejeitada'}` });
    fetchAll();
  }

  function renderAmendment(a: Amendment) {
    const total = a.votes_yes + a.votes_no;
    const ratio = total > 0 ? (a.votes_yes / total) * 100 : 0;
    const ended = new Date(a.voting_ends_at) < new Date();
    const statusColor: Record<Amendment['status'], string> = {
      voting: 'bg-blue-500', approved: 'bg-green-500', rejected: 'bg-red-500',
      draft: 'bg-muted', withdrawn: 'bg-muted',
    };
    return (
      <Card key={a.id} className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                <FileEdit className="h-4 w-4" />
                {a.title}
              </CardTitle>
              {a.target_section && <CardDescription>Alvo: {a.target_section}</CardDescription>}
            </div>
            <Badge className={statusColor[a.status]}>{a.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground italic">{a.rationale}</p>
          <div className="p-3 bg-muted/30 rounded border border-border whitespace-pre-wrap text-sm">
            {a.proposed_text}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Aprovação: {ratio.toFixed(1)}% (precisa 66.7%)</span>
              <span>{a.votes_yes} sim · {a.votes_no} não · {a.votes_abstain} abst.</span>
            </div>
            <Progress value={ratio} className="h-2" />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{ended ? 'Votação encerrada' : `Encerra em ${new Date(a.voting_ends_at).toLocaleString('pt-BR')}`}</span>
          </div>
          {a.status === 'voting' && (
            <div className="flex flex-wrap gap-2">
              {!ended && user && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleVote(a.id, 'yes')}>
                    <ThumbsUp className="h-3 w-3 mr-1" /> Sim
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleVote(a.id, 'no')}>
                    <ThumbsDown className="h-3 w-3 mr-1" /> Não
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleVote(a.id, 'abstain')}>
                    <MinusCircle className="h-3 w-3 mr-1" /> Abster
                  </Button>
                </>
              )}
              {ended && (
                <Button size="sm" onClick={() => handleFinalize(a.id)}>
                  <Gavel className="h-3 w-3 mr-1" /> Finalizar votação
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Constituição Planetária</h1>
              <p className="text-muted-foreground">Lei fundamental de TOI-700 — editável por emendas dos líderes</p>
            </div>
          </div>
          <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
            <DialogTrigger asChild>
              <Button><FileEdit className="h-4 w-4 mr-2" />Propor Emenda</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Propor Emenda Constitucional</DialogTitle>
                <DialogDescription>
                  Requer território ativo. Aprovação por 2/3 dos votos em até 7 dias.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Título da emenda</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Emenda nº 1 — Direito à Conectividade" />
                </div>
                <div>
                  <Label>Seção alvo (opcional)</Label>
                  <Input value={form.target_section} onChange={(e) => setForm({ ...form, target_section: e.target.value })} placeholder="Ex: Título I — Direitos Fundamentais" />
                </div>
                <div>
                  <Label>Justificativa</Label>
                  <Textarea rows={3} value={form.rationale} onChange={(e) => setForm({ ...form, rationale: e.target.value })} placeholder="Por que essa emenda é necessária?" />
                </div>
                <div>
                  <Label>Texto proposto</Label>
                  <Textarea rows={6} value={form.proposed_text} onChange={(e) => setForm({ ...form, proposed_text: e.target.value })} placeholder="Art. X. ..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setProposeOpen(false)}>Cancelar</Button>
                <Button onClick={handlePropose} disabled={submitting}>Submeter à votação</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="constitution" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="constitution">Constituição</TabsTrigger>
            <TabsTrigger value="amendments">Emendas ({amendments.length})</TabsTrigger>
            <TabsTrigger value="laws">Leis Planetárias ({planetaryLaws.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="constitution" className="space-y-4">
            {constitution ? (
              <Card className="border-primary/20">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle>{constitution.name}</CardTitle>
                        <CardDescription>{constitution.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-amber-500">Lei Suprema</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {constitution.full_text}
                    </div>
                  </ScrollArea>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Promulgada em: {new Date(constitution.enacted_at).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-4">
                      <span className="text-green-500">Apoio: {constitution.population_sympathy}%</span>
                      <span className="text-red-500">Oposição: {constitution.population_repulsion}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma constituição promulgada</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Hierarquia Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { n: 1, color: 'amber', name: 'Constituição Planetária', desc: 'Lei suprema, inviolável por qualquer outra norma' },
                    { n: 2, color: 'purple', name: 'Leis Planetárias', desc: 'Aprovadas pelo Parlamento Planetário' },
                    { n: 3, color: 'blue', name: 'Cartas de Bloco', desc: 'Constituições dos blocos geopolíticos' },
                    { n: 4, color: 'cyan', name: 'Leis de Bloco', desc: 'Válidas apenas para membros do bloco' },
                    { n: 5, color: 'green', name: 'Leis Nacionais', desc: 'Decretos e leis dos países' },
                  ].map((h) => (
                    <div key={h.n} className={`flex items-center gap-3 p-3 bg-${h.color}-500/10 rounded-lg border border-${h.color}-500/20`}>
                      <div className={`w-8 h-8 rounded-full bg-${h.color}-500 text-white flex items-center justify-center font-bold`}>{h.n}</div>
                      <div>
                        <p className="font-medium">{h.name}</p>
                        <p className="text-sm text-muted-foreground">{h.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="amendments" className="space-y-4">
            {amendments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileEdit className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma emenda proposta ainda.</p>
                  <p className="text-sm text-muted-foreground mt-2">Líderes de territórios ativos podem propor emendas.</p>
                </CardContent>
              </Card>
            ) : amendments.map(renderAmendment)}
          </TabsContent>

          <TabsContent value="laws" className="space-y-4">
            {planetaryLaws.length > 0 ? planetaryLaws.map((law) => (
              <Card key={law.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{law.name}</CardTitle>
                      <CardDescription>{law.description}</CardDescription>
                    </div>
                    <Badge>{law.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Promulgada: {new Date(law.enacted_at).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-4">
                      <span className="text-green-500">Apoio: {law.population_sympathy}%</span>
                      <span className="text-red-500">Oposição: {law.population_repulsion}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Scale className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma lei planetária promulgada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
