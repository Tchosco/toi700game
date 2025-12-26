import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, FileText, Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Territory {
  id: string;
  name: string;
  owner_id: string;
}

interface Law {
  id: string;
  name: string;
  legal_level: string;
  category: string;
  description: string;
  full_text: string;
  status: string;
  enacted_at: string;
  repealed_at: string;
  population_sympathy: number;
  population_repulsion: number;
  positive_effects: string[];
  negative_effects: string[];
  economic_impact: number;
  social_impact: number;
  territorial_impact: number;
  military_impact: number;
  territory_id: string;
}

export default function StateLawsPage() {
  const { user } = useAuth();
  const [myTerritories, setMyTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerritories();
  }, [user]);

  useEffect(() => {
    if (selectedTerritory) {
      fetchLaws(selectedTerritory);
    }
  }, [selectedTerritory]);

  const fetchTerritories = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('territories')
        .select('id, name, owner_id')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('name');

      if (data && data.length > 0) {
        setMyTerritories(data);
        setSelectedTerritory(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching territories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaws = async (territoryId: string) => {
    try {
      const { data } = await supabase
        .from('laws')
        .select('*')
        .eq('territory_id', territoryId)
        .eq('legal_level', 'national')
        .order('enacted_at', { ascending: false });

      if (data) {
        setLaws(data as Law[]);
      }
    } catch (error) {
      console.error('Error fetching laws:', error);
    }
  };

  const handleRepealLaw = async (lawId: string) => {
    try {
      const { error } = await supabase
        .from('laws')
        .update({ 
          status: 'repealed',
          repealed_at: new Date().toISOString()
        })
        .eq('id', lawId);

      if (error) throw error;

      // Log to history
      await supabase
        .from('legal_history')
        .insert({
          law_id: lawId,
          action: 'repealed',
          description: 'Lei revogada por decreto real',
          old_status: 'enacted',
          new_status: 'repealed',
          performed_by: user?.id,
          territory_id: selectedTerritory
        });

      toast.success('Lei revogada com sucesso');
      fetchLaws(selectedTerritory);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao revogar lei');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enacted':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Em Vigor</Badge>;
      case 'repealed':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Revogada</Badge>;
      case 'draft':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const enactedLaws = laws.filter(l => l.status === 'enacted');
  const repealedLaws = laws.filter(l => l.status === 'repealed');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Crown className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Faça login para ver suas leis</p>
              <Link to="/auth">
                <Button>Entrar</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (myTerritories.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Crown className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Você não possui territórios</p>
              <Link to="/criar-territorio">
                <Button>Criar Território</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-amber-500" />
            <div>
              <h1 className="text-3xl font-bold">Leis do Estado</h1>
              <p className="text-muted-foreground">Decretos reais e legislação nacional</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione território" />
              </SelectTrigger>
              <SelectContent>
                {myTerritories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link to="/leis/criar">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Decreto
              </Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">Em Vigor ({enactedLaws.length})</TabsTrigger>
            <TabsTrigger value="repealed">Revogadas ({repealedLaws.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {enactedLaws.length > 0 ? (
              enactedLaws.map((law) => (
                <Card key={law.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {law.name}
                        </CardTitle>
                        <CardDescription>{law.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{law.category}</Badge>
                        {getStatusBadge(law.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Econômico</p>
                        <p className={`font-bold ${law.economic_impact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {law.economic_impact >= 0 ? '+' : ''}{law.economic_impact}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Social</p>
                        <p className={`font-bold ${law.social_impact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {law.social_impact >= 0 ? '+' : ''}{law.social_impact}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Territorial</p>
                        <p className={`font-bold ${law.territorial_impact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {law.territorial_impact >= 0 ? '+' : ''}{law.territorial_impact}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Militar</p>
                        <p className={`font-bold ${law.military_impact >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {law.military_impact >= 0 ? '+' : ''}{law.military_impact}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-500 mb-2">Efeitos Positivos</p>
                        <ul className="text-sm space-y-1">
                          {(law.positive_effects || []).map((effect, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500">+</span>
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-500 mb-2">Efeitos Negativos</p>
                        <ul className="text-sm space-y-1">
                          {(law.negative_effects || []).map((effect, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-500">-</span>
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-500">Apoio: {law.population_sympathy}%</span>
                        <span className="text-red-500">Oposição: {law.population_repulsion}%</span>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRepealLaw(law.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revogar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Nenhuma lei em vigor</p>
                  <Link to="/leis/criar">
                    <Button>Criar Primeiro Decreto</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="repealed" className="space-y-4">
            {repealedLaws.length > 0 ? (
              repealedLaws.map((law) => (
                <Card key={law.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{law.name}</CardTitle>
                        <CardDescription>{law.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{law.category}</Badge>
                        {getStatusBadge(law.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Revogada em: {law.repealed_at ? new Date(law.repealed_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma lei revogada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
