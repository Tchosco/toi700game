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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store, MessageSquare, Handshake, Plus, Clock, User, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TradeChamberPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicForm, setTopicForm] = useState({ title: '', content: '' });
  const [replyContent, setReplyContent] = useState('');

  // Fetch trade chamber space
  const { data: space } = useQuery({
    queryKey: ['trade-chamber-space'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_spaces')
        .select('*')
        .eq('space_type', 'trade_chamber')
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
    queryKey: ['trade-topics', space?.id],
    queryFn: async () => {
      if (!space?.id) return [];
      const { data, error } = await supabase
        .from('discussion_topics')
        .select(`*, territories:author_territory_id(name)`)
        .eq('space_id', space.id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!space?.id,
  });

  // Fetch active trade deals
  const { data: tradeDeals } = useQuery({
    queryKey: ['active-trade-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_deals')
        .select(`
          *,
          from_territory:from_territory_id(name),
          to_territory:to_territory_id(name)
        `)
        .in('status', ['proposed', 'accepted'])
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch replies
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ['trade-topic-replies', selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const { data, error } = await supabase
        .from('discussion_replies')
        .select(`*, territories:author_territory_id(name)`)
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
      toast({ title: 'Tópico comercial criado!' });
      queryClient.invalidateQueries({ queryKey: ['trade-topics'] });
      setNewTopicOpen(false);
      setTopicForm({ title: '', content: '' });
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
      queryClient.invalidateQueries({ queryKey: ['trade-topic-replies', selectedTopic] });
      setReplyContent('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const currentTopic = topics?.find(t => t.id === selectedTopic);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-glow flex items-center gap-3">
              <Store className="h-8 w-8 text-amber-500" />
              Câmara de Comércio Planetária
            </h1>
            <p className="text-muted-foreground mt-1">
              Negocie recursos, proponha acordos comerciais e forme parcerias
            </p>
          </div>
          {userTerritory && (
            <Badge variant="outline" className="text-sm">
              Representando: {userTerritory.name}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="negotiations" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="negotiations" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Negociações
            </TabsTrigger>
            <TabsTrigger value="deals" className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Acordos Ativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="negotiations" className="mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Topics List */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Mesas de Negociação</h2>
                  {userTerritory && (
                    <Dialog open={newTopicOpen} onOpenChange={setNewTopicOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nova Mesa de Negociação</DialogTitle>
                          <DialogDescription>Proponha uma negociação comercial</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Título</Label>
                            <Input 
                              value={topicForm.title}
                              onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                              placeholder="Ex: Busco parceiros para exportação de alimentos"
                            />
                          </div>
                          <div>
                            <Label>Detalhes</Label>
                            <Textarea 
                              value={topicForm.content}
                              onChange={(e) => setTopicForm({ ...topicForm, content: e.target.value })}
                              placeholder="Descreva o que você oferece e procura..."
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
                        className={`cursor-pointer transition-all hover:border-amber-500/50 ${
                          selectedTopic === topic.id ? 'border-amber-500 bg-amber-500/5' : 'bg-card/50'
                        }`}
                        onClick={() => setSelectedTopic(topic.id)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-medium truncate">{topic.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{(topic.territories as any)?.name || 'Anônimo'}</span>
                            <span>•</span>
                            <span>{topic.reply_count || 0} respostas</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-card/50">
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Nenhuma negociação aberta.
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Topic Detail */}
              <div className="lg:col-span-2">
                {selectedTopic && currentTopic ? (
                  <Card className="bg-card/50">
                    <CardHeader>
                      <CardTitle>{currentTopic.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {(currentTopic.territories as any)?.name || 'Anônimo'}
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(currentTopic.created_at), { addSuffix: true, locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <p className="whitespace-pre-wrap">{currentTopic.content}</p>
                      </div>

                      {/* Replies */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Respostas</h4>
                        {repliesLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
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
                      {userTerritory && (
                        <div className="space-y-2">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Responda à negociação..."
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
                      <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      Selecione uma negociação para participar
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="deals" className="mt-6">
            <div className="space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Acordos Comerciais Ativos
              </h2>

              {tradeDeals && tradeDeals.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tradeDeals.map(deal => (
                    <Card key={deal.id} className="bg-card/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={deal.status === 'accepted' ? 'default' : 'secondary'}>
                            {deal.status === 'accepted' ? 'Ativo' : 'Proposto'}
                          </Badge>
                          <Handshake className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-base">
                          {(deal.from_territory as any)?.name} ↔ {(deal.to_territory as any)?.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    Nenhum acordo comercial ativo no momento.
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
