import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Vote, CheckCircle, XCircle, Minus, Clock, Gavel } from 'lucide-react';
import { toast } from 'sonner';

interface Territory {
  id: string;
  name: string;
  owner_id: string;
}

interface VoteRecord {
  id: string;
  territory_id: string;
  choice: string;
  reason: string;
  territories?: { name: string };
}

interface ParliamentaryVote {
  id: string;
  vote_type: string;
  subject_id: string;
  title: string;
  description: string;
  legal_level: string;
  voting_starts_at: string;
  voting_ends_at: string;
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  total_eligible: number;
  status: string;
  result: string;
  vote_records?: VoteRecord[];
}

export default function ParliamentPage() {
  const { user } = useAuth();
  const [votes, setVotes] = useState<ParliamentaryVote[]>([]);
  const [myTerritories, setMyTerritories] = useState<Territory[]>([]);
  const [allTerritories, setAllTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVote, setSelectedVote] = useState<ParliamentaryVote | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [voteChoice, setVoteChoice] = useState<string>('');
  const [voteReason, setVoteReason] = useState('');
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch planetary votes
      const { data: votesData } = await supabase
        .from('parliamentary_votes')
        .select(`
          *,
          vote_records (
            id,
            territory_id,
            choice,
            reason,
            territories (name)
          )
        `)
        .eq('legal_level', 'planetary')
        .order('created_at', { ascending: false });

      if (votesData) {
        setVotes(votesData as ParliamentaryVote[]);
      }

      // Fetch all active territories (parliament seats)
      const { data: territoriesData } = await supabase
        .from('territories')
        .select('id, name, owner_id')
        .eq('status', 'active')
        .order('name');

      if (territoriesData) {
        setAllTerritories(territoriesData);
        if (user) {
          setMyTerritories(territoriesData.filter(t => t.owner_id === user.id));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCastVote = async () => {
    if (!selectedVote || !selectedTerritory || !voteChoice) {
      toast.error('Selecione um território e uma opção de voto');
      return;
    }

    setVoting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('cast-vote', {
        body: {
          vote_id: selectedVote.id,
          territory_id: selectedTerritory,
          choice: voteChoice,
          reason: voteReason
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error);
      }

      toast.success('Voto registrado com sucesso!');
      setSelectedVote(null);
      setSelectedTerritory('');
      setVoteChoice('');
      setVoteReason('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar voto');
    } finally {
      setVoting(false);
    }
  };

  const getVoteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      constitution: 'Emenda Constitucional',
      law: 'Lei Planetária',
      bloc_creation: 'Criação de Bloco',
      sanction: 'Sanção',
      era_change: 'Mudança de Era'
    };
    return labels[type] || type;
  };

  const hasVoted = (vote: ParliamentaryVote, territoryId: string) => {
    return vote.vote_records?.some(r => r.territory_id === territoryId);
  };

  const openVotes = votes.filter(v => v.status === 'open');
  const closedVotes = votes.filter(v => v.status === 'closed');

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gavel className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Parlamento Planetário</h1>
              <p className="text-muted-foreground">Assembleia de todos os Estados de TOI-700</p>
            </div>
          </div>
        </div>

        {/* Parliament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{allTerritories.length}</p>
                  <p className="text-sm text-muted-foreground">Assentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Vote className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{openVotes.length}</p>
                  <p className="text-sm text-muted-foreground">Votações Abertas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{closedVotes.filter(v => v.result === 'approved').length}</p>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{closedVotes.filter(v => v.result === 'rejected').length}</p>
                  <p className="text-sm text-muted-foreground">Rejeitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="open" className="w-full">
          <TabsList>
            <TabsTrigger value="open">Votações Abertas ({openVotes.length})</TabsTrigger>
            <TabsTrigger value="closed">Histórico ({closedVotes.length})</TabsTrigger>
            <TabsTrigger value="seats">Assentos ({allTerritories.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-4">
            {openVotes.length > 0 ? (
              openVotes.map((vote) => (
                <Card key={vote.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Vote className="h-5 w-5" />
                          {vote.title}
                        </CardTitle>
                        <CardDescription>{vote.description}</CardDescription>
                      </div>
                      <Badge variant="outline">{getVoteTypeLabel(vote.vote_type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-500">{vote.votes_yes}</p>
                        <p className="text-sm text-muted-foreground">A Favor</p>
                      </div>
                      <div className="text-center p-3 bg-red-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-red-500">{vote.votes_no}</p>
                        <p className="text-sm text-muted-foreground">Contra</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <p className="text-2xl font-bold">{vote.votes_abstain}</p>
                        <p className="text-sm text-muted-foreground">Abstenções</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Encerra: {new Date(vote.voting_ends_at).toLocaleString('pt-BR')}</span>
                      </div>

                      {user && myTerritories.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedVote(vote)}>
                              Votar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Registrar Voto</DialogTitle>
                              <DialogDescription>
                                Vote em nome de um dos seus territórios
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Território Votante</Label>
                                <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um território" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {myTerritories.map((t) => (
                                      <SelectItem 
                                        key={t.id} 
                                        value={t.id}
                                        disabled={hasVoted(vote, t.id)}
                                      >
                                        {t.name} {hasVoted(vote, t.id) && '(já votou)'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Seu Voto</Label>
                                <RadioGroup value={voteChoice} onValueChange={setVoteChoice}>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="yes" id="yes" />
                                    <Label htmlFor="yes" className="text-green-500">A Favor</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="no" id="no" />
                                    <Label htmlFor="no" className="text-red-500">Contra</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="abstain" id="abstain" />
                                    <Label htmlFor="abstain">Abstenção</Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              <div className="space-y-2">
                                <Label>Justificativa (opcional)</Label>
                                <Textarea 
                                  value={voteReason}
                                  onChange={(e) => setVoteReason(e.target.value)}
                                  placeholder="Explique seu voto..."
                                />
                              </div>

                              <Button 
                                onClick={handleCastVote} 
                                disabled={voting || !selectedTerritory || !voteChoice}
                                className="w-full"
                              >
                                {voting ? 'Registrando...' : 'Confirmar Voto'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Vote className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma votação aberta no momento</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="closed" className="space-y-4">
            {closedVotes.length > 0 ? (
              closedVotes.map((vote) => (
                <Card key={vote.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{vote.title}</CardTitle>
                        <CardDescription>{vote.description}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{getVoteTypeLabel(vote.vote_type)}</Badge>
                        <Badge variant={vote.result === 'approved' ? 'default' : 'destructive'}>
                          {vote.result === 'approved' ? 'Aprovada' : 'Rejeitada'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-green-500">{vote.votes_yes}</p>
                        <p className="text-sm text-muted-foreground">A Favor</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-500">{vote.votes_no}</p>
                        <p className="text-sm text-muted-foreground">Contra</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold">{vote.votes_abstain}</p>
                        <p className="text-sm text-muted-foreground">Abstenções</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Vote className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma votação encerrada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="seats">
            <Card>
              <CardHeader>
                <CardTitle>Assentos do Parlamento Planetário</CardTitle>
                <CardDescription>Cada Estado ativo possui um assento e um voto</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allTerritories.map((territory) => (
                      <div 
                        key={territory.id}
                        className="p-3 border rounded-lg flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{territory.name}</p>
                          <p className="text-sm text-muted-foreground">1 assento</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
