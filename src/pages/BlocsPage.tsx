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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Globe2, Users, Shield, BookOpen, Plus, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface Territory {
  id: string;
  name: string;
  owner_id: string;
}

interface BlocMembership {
  id: string;
  territory_id: string;
  status: string;
  joined_at: string;
  territories?: { name: string };
}

interface Bloc {
  id: string;
  name: string;
  description: string;
  charter: string;
  founded_at: string;
  founder_territory_id: string;
  status: string;
  bloc_memberships?: BlocMembership[];
  founder?: { name: string };
}

interface Law {
  id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  enacted_at: string;
}

export default function BlocsPage() {
  const { user } = useAuth();
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [myTerritories, setMyTerritories] = useState<Territory[]>([]);
  const [myMemberships, setMyMemberships] = useState<{ bloc_id: string; territory_id: string }[]>([]);
  const [selectedBloc, setSelectedBloc] = useState<Bloc | null>(null);
  const [blocLaws, setBlocLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create bloc form
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBlocName, setNewBlocName] = useState('');
  const [newBlocDescription, setNewBlocDescription] = useState('');
  const [newBlocCharter, setNewBlocCharter] = useState('');
  const [founderTerritory, setFounderTerritory] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all blocs
      const { data: blocsData } = await supabase
        .from('geopolitical_blocs')
        .select(`
          *,
          bloc_memberships (
            id,
            territory_id,
            status,
            joined_at,
            territories (name)
          )
        `)
        .eq('status', 'active')
        .order('name');

      if (blocsData) {
        setBlocs(blocsData as Bloc[]);
      }

      if (user) {
        // Fetch my territories
        const { data: territoriesData } = await supabase
          .from('territories')
          .select('id, name, owner_id')
          .eq('owner_id', user.id)
          .eq('status', 'active');

        if (territoriesData) {
          setMyTerritories(territoriesData);

          // Fetch my memberships
          const territoryIds = territoriesData.map(t => t.id);
          const { data: membershipsData } = await supabase
            .from('bloc_memberships')
            .select('bloc_id, territory_id')
            .in('territory_id', territoryIds)
            .eq('status', 'active');

          if (membershipsData) {
            setMyMemberships(membershipsData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocLaws = async (blocId: string) => {
    const { data } = await supabase
      .from('laws')
      .select('*')
      .eq('bloc_id', blocId)
      .eq('status', 'enacted')
      .order('enacted_at', { ascending: false });

    if (data) {
      setBlocLaws(data as Law[]);
    }
  };

  const handleSelectBloc = (bloc: Bloc) => {
    setSelectedBloc(bloc);
    fetchBlocLaws(bloc.id);
  };

  const handleCreateBloc = async () => {
    if (!newBlocName || !founderTerritory) {
      toast.error('Nome e território fundador são obrigatórios');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('geopolitical_blocs')
        .insert({
          name: newBlocName,
          description: newBlocDescription,
          charter: newBlocCharter,
          founder_territory_id: founderTerritory,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Add founder as first member
      await supabase
        .from('bloc_memberships')
        .insert({
          bloc_id: data.id,
          territory_id: founderTerritory,
          status: 'active'
        });

      toast.success('Bloco criado com sucesso!');
      setCreateDialogOpen(false);
      setNewBlocName('');
      setNewBlocDescription('');
      setNewBlocCharter('');
      setFounderTerritory('');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar bloco');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinBloc = async (blocId: string, territoryId: string) => {
    try {
      const { error } = await supabase
        .from('bloc_memberships')
        .insert({
          bloc_id: blocId,
          territory_id: territoryId,
          status: 'active'
        });

      if (error) throw error;

      toast.success('Território ingressou no bloco!');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao ingressar no bloco');
    }
  };

  const handleLeaveBloc = async (blocId: string, territoryId: string) => {
    try {
      const { error } = await supabase
        .from('bloc_memberships')
        .update({ 
          status: 'inactive',
          left_at: new Date().toISOString()
        })
        .eq('bloc_id', blocId)
        .eq('territory_id', territoryId);

      if (error) throw error;

      toast.success('Território deixou o bloco');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deixar o bloco');
    }
  };

  const isMember = (blocId: string, territoryId: string) => {
    return myMemberships.some(m => m.bloc_id === blocId && m.territory_id === territoryId);
  };

  const getAvailableTerritories = (blocId: string) => {
    return myTerritories.filter(t => !isMember(blocId, t.id));
  };

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
            <Globe2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Blocos Geopolíticos</h1>
              <p className="text-muted-foreground">Alianças e organizações internacionais</p>
            </div>
          </div>

          {user && myTerritories.length > 0 && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Bloco
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Criar Bloco Geopolítico</DialogTitle>
                  <DialogDescription>
                    Funde um novo bloco e convide outros territórios a participar
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome do Bloco</Label>
                    <Input
                      value={newBlocName}
                      onChange={(e) => setNewBlocName(e.target.value)}
                      placeholder="Ex: União dos Estados Livres"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={newBlocDescription}
                      onChange={(e) => setNewBlocDescription(e.target.value)}
                      placeholder="Descreva os objetivos do bloco..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Carta do Bloco (Constituição)</Label>
                    <Textarea
                      value={newBlocCharter}
                      onChange={(e) => setNewBlocCharter(e.target.value)}
                      placeholder="Defina as regras e princípios do bloco..."
                      className="min-h-[150px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Território Fundador</Label>
                    <select
                      value={founderTerritory}
                      onChange={(e) => setFounderTerritory(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="">Selecione...</option>
                      {myTerritories.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <Button 
                    onClick={handleCreateBloc} 
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? 'Criando...' : 'Criar Bloco'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Blocs List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Blocos Ativos ({blocs.length})</h2>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {blocs.map((bloc) => (
                  <Card 
                    key={bloc.id}
                    className={`cursor-pointer transition-colors ${selectedBloc?.id === bloc.id ? 'border-primary' : ''}`}
                    onClick={() => handleSelectBloc(bloc)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{bloc.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {bloc.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{bloc.bloc_memberships?.filter(m => m.status === 'active').length || 0} membros</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {blocs.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Globe2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Nenhum bloco criado</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Bloc Details */}
          <div className="lg:col-span-2">
            {selectedBloc ? (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="charter">Carta</TabsTrigger>
                  <TabsTrigger value="laws">Leis ({blocLaws.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{selectedBloc.name}</CardTitle>
                        <Badge variant="outline">{selectedBloc.status}</Badge>
                      </div>
                      <CardDescription>{selectedBloc.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Fundado em: {new Date(selectedBloc.founded_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Membros
                        </h3>
                        <div className="space-y-2">
                          {selectedBloc.bloc_memberships?.filter(m => m.status === 'active').map((membership) => (
                            <div 
                              key={membership.id}
                              className="flex items-center justify-between p-2 bg-muted rounded-lg"
                            >
                              <span>{membership.territories?.name}</span>
                              {myTerritories.some(t => t.id === membership.territory_id) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => handleLeaveBloc(selectedBloc.id, membership.territory_id)}
                                >
                                  <LogOut className="h-4 w-4 mr-1" />
                                  Sair
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {user && getAvailableTerritories(selectedBloc.id).length > 0 && (
                        <div className="pt-4 border-t">
                          <h3 className="font-medium mb-2">Ingressar no Bloco</h3>
                          <div className="flex flex-wrap gap-2">
                            {getAvailableTerritories(selectedBloc.id).map((territory) => (
                              <Button
                                key={territory.id}
                                size="sm"
                                variant="outline"
                                onClick={() => handleJoinBloc(selectedBloc.id, territory.id)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                {territory.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="charter">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Carta do Bloco
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px]">
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                          {selectedBloc.charter || 'Nenhuma carta definida para este bloco.'}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="laws" className="space-y-4">
                  {blocLaws.length > 0 ? (
                    blocLaws.map((law) => (
                      <Card key={law.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{law.name}</CardTitle>
                            <Badge variant="outline">{law.category}</Badge>
                          </div>
                          <CardDescription>{law.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Promulgada: {new Date(law.enacted_at).toLocaleDateString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nenhuma lei promulgada neste bloco</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-24">
                  <Globe2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Selecione um bloco para ver detalhes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
