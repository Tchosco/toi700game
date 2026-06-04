import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Scale, Gavel, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Justice {
  id: string;
  seat_number: number;
  status: string;
  territory_id: string | null;
  elected_at: string | null;
  term_ends_at: string | null;
  territories?: { name: string; owner_id: string } | null;
}

interface CourtCase {
  id: string;
  case_number: number;
  case_type: string;
  title: string;
  rationale: string;
  target_law_id: string | null;
  plaintiff_user_id: string;
  status: string;
  result: string | null;
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  filed_at: string;
  ruling_at: string | null;
  laws?: { name: string; legal_level: string } | null;
}

interface LawRow {
  id: string;
  name: string;
  legal_level: string;
  status: string;
}

const CASE_TYPE_LABEL: Record<string, string> = {
  constitutional_review: 'Controle de Constitucionalidade',
  interpretation: 'Interpretação Legal',
  sanction_appeal: 'Recurso de Sanção',
};

const RESULT_LABEL: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  unconstitutional: { label: 'Inconstitucional', variant: 'destructive' },
  constitutional: { label: 'Constitucional', variant: 'default' },
  dismissed: { label: 'Indeferido', variant: 'secondary' },
  inadmissible: { label: 'Inadmissível', variant: 'secondary' },
};

export default function SupremeCourtPage() {
  const { user } = useAuth();
  const [justices, setJustices] = useState<Justice[]>([]);
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [laws, setLaws] = useState<LawRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJustice, setIsJustice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // File case form
  const [openFile, setOpenFile] = useState(false);
  const [caseType, setCaseType] = useState<string>('constitutional_review');
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [targetLawId, setTargetLawId] = useState<string>('');

  // Vote dialog
  const [voteCase, setVoteCase] = useState<CourtCase | null>(null);
  const [vote, setVote] = useState<string>('');
  const [opinion, setOpinion] = useState('');

  useEffect(() => { fetchAll(); }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [j, c, l] = await Promise.all([
      supabase.from('supreme_court_justices')
        .select('*, territories(name, owner_id)')
        .order('seat_number'),
      supabase.from('supreme_court_cases')
        .select('*, laws:target_law_id(name, legal_level)')
        .order('filed_at', { ascending: false }),
      supabase.from('laws')
        .select('id, name, legal_level, status')
        .eq('status', 'enacted')
        .order('name'),
    ]);
    if (j.data) {
      setJustices(j.data as any);
      if (user) setIsJustice(j.data.some((x: any) => x.status === 'active' && x.territories?.owner_id === user.id));
    }
    if (c.data) setCases(c.data as any);
    if (l.data) setLaws(l.data as any);
    setLoading(false);
  };

  const submitFile = async () => {
    if (!title.trim() || !rationale.trim()) {
      toast.error('Preencha título e fundamentação');
      return;
    }
    if (caseType === 'constitutional_review' && !targetLawId) {
      toast.error('Selecione a lei contestada');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc('file_supreme_court_case', {
      _case_type: caseType,
      _title: title,
      _rationale: rationale,
      _target_law_id: targetLawId || null,
      _target_territory_id: null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Caso protocolado');
    setOpenFile(false); setTitle(''); setRationale(''); setTargetLawId('');
    fetchAll();
  };

  const submitVote = async () => {
    if (!voteCase || !vote) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('cast_justice_vote', {
      _case_id: voteCase.id,
      _vote: vote,
      _opinion: opinion || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Voto registrado');
    setVoteCase(null); setVote(''); setOpinion('');
    fetchAll();
  };

  const finalizeCase = async (id: string) => {
    const { error } = await supabase.rpc('finalize_supreme_court_case', { _case_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success('Caso julgado');
    fetchAll();
  };

  const openCases = cases.filter(c => c.status !== 'closed');
  const closedCases = cases.filter(c => c.status === 'closed');

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Scale className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Suprema Corte Planetária</h1>
            <p className="text-muted-foreground">Sete juízes guardiões da Constituição de TOI-700</p>
          </div>
        </div>

        <Tabs defaultValue="cases">
          <TabsList>
            <TabsTrigger value="cases">Casos Abertos ({openCases.length})</TabsTrigger>
            <TabsTrigger value="history">Julgados ({closedCases.length})</TabsTrigger>
            <TabsTrigger value="justices">Juízes</TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={openFile} onOpenChange={setOpenFile}>
                <DialogTrigger asChild>
                  <Button><FileText className="h-4 w-4 mr-2" />Protocolar Caso</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Protocolar caso na Suprema Corte</DialogTitle>
                    <DialogDescription>Você representa o seu Estado como parte interessada</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div>
                      <Label>Tipo de caso</Label>
                      <Select value={caseType} onValueChange={setCaseType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="constitutional_review">Controle de Constitucionalidade</SelectItem>
                          <SelectItem value="interpretation">Interpretação Legal</SelectItem>
                          <SelectItem value="sanction_appeal">Recurso de Sanção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {caseType === 'constitutional_review' && (
                      <div>
                        <Label>Lei contestada</Label>
                        <Select value={targetLawId} onValueChange={setTargetLawId}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {laws.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.name} <span className="text-xs text-muted-foreground">({l.legal_level})</span></SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label>Título</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div>
                      <Label>Fundamentação</Label>
                      <Textarea value={rationale} onChange={e => setRationale(e.target.value)} rows={6} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitFile} disabled={submitting}>Protocolar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {openCases.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum caso aberto</CardContent></Card>
            )}

            {openCases.map(c => {
              const total = c.votes_yes + c.votes_no + c.votes_abstain;
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Gavel className="h-5 w-5" />
                          #{c.case_number} {c.title}
                        </CardTitle>
                        <CardDescription>{CASE_TYPE_LABEL[c.case_type]}</CardDescription>
                      </div>
                      <Badge>{c.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm whitespace-pre-wrap">{c.rationale}</p>
                    {c.laws && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Lei contestada: </span>
                        <span className="font-medium">{c.laws.name}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="p-2 rounded bg-green-500/10"><CheckCircle2 className="h-4 w-4 mx-auto text-green-500" />{c.votes_yes}</div>
                      <div className="p-2 rounded bg-red-500/10"><XCircle className="h-4 w-4 mx-auto text-red-500" />{c.votes_no}</div>
                      <div className="p-2 rounded bg-muted">— {c.votes_abstain}</div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {isJustice && (
                        <Button size="sm" onClick={() => setVoteCase(c)}>Votar como juiz</Button>
                      )}
                      {total >= 4 && (
                        <Button size="sm" variant="outline" onClick={() => finalizeCase(c.id)}>
                          Julgar (quórum atingido)
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {closedCases.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum julgamento concluído</CardContent></Card>
            )}
            {closedCases.map(c => {
              const r = c.result ? RESULT_LABEL[c.result] : null;
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">#{c.case_number} {c.title}</CardTitle>
                      {r && <Badge variant={r.variant}>{r.label}</Badge>}
                    </div>
                    <CardDescription>{CASE_TYPE_LABEL[c.case_type]}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Votos: {c.votes_yes} sim · {c.votes_no} não · {c.votes_abstain} abs.
                    {c.ruling_at && ` · Julgado em ${new Date(c.ruling_at).toLocaleDateString('pt-BR')}`}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="justices">
            <Card>
              <CardHeader>
                <CardTitle>Composição da Corte</CardTitle>
                <CardDescription>7 assentos eleitos pelo Parlamento Planetário</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {justices.map(j => (
                    <div key={j.id} className="p-3 border rounded-lg flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                        {j.seat_number}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {j.territories?.name ?? <span className="text-muted-foreground italic">Vago</span>}
                        </p>
                        {j.term_ends_at && (
                          <p className="text-xs text-muted-foreground">
                            Mandato até {new Date(j.term_ends_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <Badge variant={j.status === 'active' ? 'default' : 'secondary'}>
                        {j.status === 'active' ? 'Ativo' : 'Vago'}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>Para ocupar um assento vago, abra uma <strong>votação de eleição de juiz</strong> no Parlamento indicando o território candidato.</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!voteCase} onOpenChange={(o) => !o && setVoteCase(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Voto da Suprema Corte</DialogTitle>
              <DialogDescription>{voteCase?.title}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <RadioGroup value={vote} onValueChange={setVote}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="cy" /><Label htmlFor="cy">Procedente</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="cn" /><Label htmlFor="cn">Improcedente</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="abstain" id="ca" /><Label htmlFor="ca">Abstenção</Label></div>
              </RadioGroup>
              <div>
                <Label>Opinião (opcional)</Label>
                <Textarea value={opinion} onChange={e => setOpinion(e.target.value)} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitVote} disabled={!vote || submitting}>Confirmar voto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
