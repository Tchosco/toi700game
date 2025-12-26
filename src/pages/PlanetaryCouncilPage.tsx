import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, MessageSquare, Vote, Plus, Clock, User, Pin, Lock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PROPOSAL_TYPES = [
  { value: 'law', label: 'Lei Planetária' },
  { value: 'treaty', label: 'Tratado' },
  { value: 'bloc_creation', label: 'Criação de Bloco' },
  { value: 'sanction', label: 'Sanção Global' },
  { value: 'era_change', label: 'Mudança de Era' },
  { value: 'other', label: 'Outro' },
];

export default function PlanetaryCouncilPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [newProposalOpen, setNewProposalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({ title: '', content: '' });
  const [proposalForm, setProposalForm] = useState({ title: '', description: '', type: 'law', content: '' });
  const [replyContent, setReplyContent] = useState('');

  // Fetch planetary council space
  const { data: space } = useQuery({
    queryKey: ['planetary-council-space'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_spaces')
        .select('*')
        .eq('space_type', 'planetary_council')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch user territory
  const { data: userTerritory } = useQuery({
    queryKey: ['user-active-territory', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('territories')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch topics
  const { data: topics, isLoading: topicsLoading } = useQuery({
    queryKey: ['council-topics', space?.id],
    queryFn: async () => {
      if (!space?.id) return [];
      const { data, error } = await supabase
        .from('discussion_topics')
        .select(`
          *,
          territories:author_territory_id(name)
        `)
        .eq('space_id', space.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!space?.id,
  });

  // Fetch proposals
  const { data: proposals, isLoading: proposalsLoading } = useQuery({
    queryKey: ['council-proposals', space?.id],
    queryFn: async () => {
      if (!space?.id) return [];
      const { data, error } = await supabase
        .from('formal_proposals')
        .select(`
          *,
          territories:proposer_territory_id(name)
        `)
        .eq('space_id', space.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!space?.id,
  });

  // Fetch replies for selected topic
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['topic-replies', selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const { data, error } = await supabase
        .from('discussion_replies')
        .select(`
          *,
          territories:author_territory_id(name)
        `)
        .eq('topic_id', selectedTopic)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedTopic,
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (!space?.id || !user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('discussion_topics')
        .insert({
          space_id: space.id,
          title: data.title,
          content: data.content,
          author_id: user.id,
          author_territory_id: userTerritory?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Tópico criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['council-topics'] });
      setNewTopicOpen(false);
      setTopicForm({ title: '', content: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Create proposal mutation
  const createProposalMutation = useMutation({
    mutationFn: async (data: typeof proposalForm) => {
      if (!space?.id || !user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('formal_proposals')
        .insert({
          space_id: space.id,
          proposal_type: data.type as any,
          title: data.title,
          description: data.description,
          full_content: data.content,
          proposer_id: user.id,
          proposer_territory_id: userTerritory?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Proposta criada!' });
      queryClient.invalidateQueries({ queryKey: ['council-proposals'] });
      setNewProposalOpen(false);
      setProposalForm({ title: '', description: '', type: 'law', content: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedTopic || !user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('discussion_replies')
        .insert({
          topic_id: selectedTopic,
          content,
          author_id: user.id,
          author_territory_id: userTerritory?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Resposta publicada!' });
      queryClient.invalidateQueries({ queryKey: ['topic-replies', selectedTopic] });
      setReplyContent('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const currentTopic = topics?.find(t => t.id === selectedTopic);

  const getProposalStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
      open: { label: 'Aberta', className: 'bg-blue-500/20 text-blue-500' },
      voting: { label: 'Em Votação', className: 'bg-amber-500/20 text-amber-500' },
      approved: { label: 'Aprovada', className: 'bg-green-500/20 text-green-500' },
      rejected: { label: 'Rejeitada', className: 'bg-red-500/20 text-red-500' },
      executed: { label: 'Executada', className: 'bg-purple-500/20 text-purple-500' },
    };
    const config = configs[status] || configs.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-glow flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              Conselho Planetário
            </h1>
            <p className="text-muted-foreground mt-1">
              Debata questões globais e proponha mudanças para o planeta
            </p>
          </div>
          {userTerritory && (
            <Badge variant="outline" className="text-sm">
              Representando: {userTerritory.name}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="topics" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="topics" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Tópicos
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <Vote className="h-4 w-4" />
              Propostas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="topics" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Topics List */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Tópicos de Discussão</h2>
                  {userTerritory && (
                    <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Novo Tópico</DialogTitle>
                          <DialogDescription>Inicie uma discussão no Conselho Planetário</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Título</Label>
                            <Input 
                              value={topicForm.title}
                              onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                              placeholder="Assunto da discussão"
                            />
                          </div>
                          <div>
                            <Label>Conteúdo</Label>
                            <Textarea 
                              value={topicForm.content}
                              onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                              placeholder="Exponha seu argumento..."
                              rows={5}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => createTopicMutation.mutate(topicForm)} disabled={createTopicMutation.isPending}>
                            {createTopicMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Publicar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                {topicsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : topics && topics.length > 0 ? (
                  <div className="space-y-2">
                    {topics.map(topic => (
                      <Card 
                        key={topic.id}
                        className={`cursor-pointer transition-all hover:border-primary/50 ${
                          selectedTopic === topic.id ? 'border-primary bg-primary/5' : 'bg-card/50'
                        }`}
                        onClick={() => setSelectedTopic(topic.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            {topic.is_pinned && <Pin className="h-4 w-4 text-amber-500 shrink-0 mt-1" />}
                            {topic.is_locked && <Lock className="h-4 w-4 text-red-500 shrink-0 mt-1" />}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{topic.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{(topic.territories as any)?.name || 'Anônimo'}</span>
                                <span>•</span>
                                <span>{topic.reply_count || 0} respostas</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-card/50">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhum tópico ainda. Seja o primeiro a iniciar uma discussão!
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Topic Detail */}
              <div className="lg:col-span-2">
                {selectedTopic && currentTopic ? (
                  <Card className="bg-card/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{currentTopic.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3" />
                            {(currentTopic.territories as any)?.name || 'Anônimo'}
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(currentTopic.created_at), { addSuffix: true, locale: ptBR })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                        <p className="whitespace-pre-wrap">{currentTopic.content}</p>
                      </div>

                      {/* Replies */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Respostas ({replies?.length || 0})</h4>
                        {repliesLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : replies && replies.length > 0 ? (
                          <div className="space-y-3">
                            {replies.map(reply => (
                              <div key={reply.id} className="p-3 rounded-lg bg-muted/20 border border-border/30">
                                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {(reply.territories as any)?.name || 'Anônimo'}
                                  </span>
                                  <span>•</span>
                                  <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">Nenhuma resposta ainda.</p>
                        )}
                      </div>

                      {/* Reply Form */}
                      {userTerritory && !currentTopic.is_locked && (
                        <div className="space-y-2">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            rows={3}
                          />
                          <Button 
                            onClick={() => createReplyMutation.mutate(replyContent)}
                            disabled={!replyContent.trim() || createReplyMutation.isPending}
                          >
                            {createReplyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Responder
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-card/50">
                    <CardContent className="py-16 text-center text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Selecione um tópico para ver a discussão
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Propostas Formais</h2>
                {userTerritory && (
                  <Dialog open={newProposalOpen} onOpenChange={setNewProposalOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 mr-2" />Nova Proposta</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Nova Proposta Formal</DialogTitle>
                        <DialogDescription>Crie uma proposta que pode se tornar lei, tratado ou outra ação formal</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Tipo de Proposta</Label>
                            <Select value={proposalForm.type} onValueChange={(v) => setProposalForm({ ...proposalForm, type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PROPOSAL_TYPES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Título</Label>
                            <Input 
                              value={proposalForm.title}
                              onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Descrição Resumida</Label>
                          <Input 
                            value={proposalForm.description}
                            onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Conteúdo Completo</Label>
                          <Textarea 
                            value={proposalForm.content}
                            onChange={(e) => setProposalForm({ ...proposalForm, content: e.target.value })}
                            rows={6}
                            placeholder="Detalhe sua proposta aqui..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={() => createProposalMutation.mutate(proposalForm)} disabled={createProposalMutation.isPending}>
                          {createProposalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Criar Proposta
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {proposalsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : proposals && proposals.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {proposals.map(proposal => (
                    <Card key={proposal.id} className="bg-card/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {PROPOSAL_TYPES.find(t => t.value === proposal.proposal_type)?.label}
                              </Badge>
                              {getProposalStatusBadge(proposal.status)}
                            </div>
                            <CardTitle className="text-lg">{proposal.title}</CardTitle>
                          </div>
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <CardDescription>{proposal.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Por: {(proposal.territories as any)?.name || 'Anônimo'}
                          </span>
                          {proposal.status === 'voting' && (
                            <div className="flex gap-3">
                              <span className="text-green-500">✓ {proposal.votes_yes}</span>
                              <span className="text-red-500">✗ {proposal.votes_no}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    Nenhuma proposta formal ainda.
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
