import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Warehouse, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Wheat, 
  Zap, 
  Mountain, 
  Cpu, 
  Users,
  Factory,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Territory {
  id: string;
  name: string;
  stability: number;
  treasury: number;
  total_rural_population: number;
  total_urban_population: number;
}

interface ResourceBalance {
  id: string;
  territory_id: string;
  food: number;
  energy: number;
  minerals: number;
  tech: number;
  tick_number: number;
}

interface ResourceFlow {
  resource: string;
  production: number;
  consumption: number;
  net: number;
  icon: React.ReactNode;
  color: string;
}

const RESOURCE_INFO = {
  food: {
    name: 'Alimentos',
    icon: <Wheat className="h-5 w-5" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Produzido pela população rural. Consumido pela população urbana.',
  },
  energy: {
    name: 'Energia',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: 'Produzido por células rurais e urbanas. Essencial para cidades e pesquisa.',
  },
  minerals: {
    name: 'Minerais',
    icon: <Mountain className="h-5 w-5" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Produzido por células rurais. Usado para expansão e infraestrutura.',
  },
  tech: {
    name: 'Tecnologia',
    icon: <Cpu className="h-5 w-5" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Produzido por cidades urbanas. Essencial para pesquisa e avanço.',
  },
};

export default function WarehousePage() {
  const { user } = useAuth();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [resourceBalance, setResourceBalance] = useState<ResourceBalance | null>(null);
  const [previousBalance, setPreviousBalance] = useState<ResourceBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTerritories();
  }, [user]);

  useEffect(() => {
    if (selectedTerritory) {
      fetchResourceBalance(selectedTerritory);
    }
  }, [selectedTerritory]);

  async function fetchTerritories() {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('territories')
      .select('id, name, stability, treasury, total_rural_population, total_urban_population')
      .eq('owner_id', user.id)
      .eq('status', 'active')
      .order('name');

    if (data && data.length > 0) {
      setTerritories(data);
      setSelectedTerritory(data[0].id);
    }
    setLoading(false);
  }

  async function fetchResourceBalance(territoryId: string) {
    // Get current balance
    const { data: current } = await supabase
      .from('resource_balances')
      .select('*')
      .eq('territory_id', territoryId)
      .order('tick_number', { ascending: false })
      .limit(1)
      .single();

    if (current) {
      setResourceBalance(current);

      // Get previous tick balance for comparison
      const { data: previous } = await supabase
        .from('resource_balances')
        .select('*')
        .eq('territory_id', territoryId)
        .lt('tick_number', current.tick_number)
        .order('tick_number', { ascending: false })
        .limit(1)
        .single();

      setPreviousBalance(previous);
    }
  }

  const territory = territories.find(t => t.id === selectedTerritory);

  // Calculate production/consumption estimates
  const calculateFlows = (): ResourceFlow[] => {
    if (!territory) return [];

    const ruralPop = territory.total_rural_population || 0;
    const urbanPop = territory.total_urban_population || 0;
    const ruralFactor = Math.sqrt(ruralPop / 10000);
    const urbanFactor = Math.sqrt(urbanPop / 5000);

    return [
      {
        resource: 'food',
        production: Math.round(ruralFactor * 20),
        consumption: Math.round(urbanFactor * 15),
        net: Math.round(ruralFactor * 20 - urbanFactor * 15),
        icon: RESOURCE_INFO.food.icon,
        color: RESOURCE_INFO.food.color,
      },
      {
        resource: 'energy',
        production: Math.round(ruralFactor * 10 + urbanFactor * 8),
        consumption: Math.round(urbanFactor * 10),
        net: Math.round(ruralFactor * 10 + urbanFactor * 8 - urbanFactor * 10),
        icon: RESOURCE_INFO.energy.icon,
        color: RESOURCE_INFO.energy.color,
      },
      {
        resource: 'minerals',
        production: Math.round(ruralFactor * 10),
        consumption: Math.round(urbanFactor * 3),
        net: Math.round(ruralFactor * 10 - urbanFactor * 3),
        icon: RESOURCE_INFO.minerals.icon,
        color: RESOURCE_INFO.minerals.color,
      },
      {
        resource: 'tech',
        production: Math.round(urbanFactor * 5),
        consumption: Math.round(urbanFactor * 1),
        net: Math.round(urbanFactor * 5 - urbanFactor * 1),
        icon: RESOURCE_INFO.tech.icon,
        color: RESOURCE_INFO.tech.color,
      },
    ];
  };

  const flows = calculateFlows();

  const getChangeIndicator = (current: number, previous: number) => {
    const diff = current - previous;
    if (diff > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (diff < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Faça login para ver seu armazém</p>
              <Link to="/auth">
                <Button>Entrar</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (territories.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Você precisa de um território para ter um armazém</p>
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
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Warehouse className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Armazém do Estado</h1>
              <p className="text-muted-foreground">Estoque de recursos e fluxo econômico</p>
            </div>
          </div>

          <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione território" />
            </SelectTrigger>
            <SelectContent>
              {territories.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Territory Summary */}
        {territory && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pop. Rural</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(territory.total_rural_population)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Pop. Urbana</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(territory.total_urban_population)}</p>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Estabilidade</span>
                </div>
                <p className="text-2xl font-bold">{territory.stability}%</p>
                <Progress value={territory.stability} className="mt-2 h-1" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-muted-foreground">Tesouro</span>
                </div>
                <p className="text-2xl font-bold text-amber-500">
                  ₮ {formatNumber(territory.treasury)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="stock" className="w-full">
          <TabsList>
            <TabsTrigger value="stock">Estoque Atual</TabsTrigger>
            <TabsTrigger value="flow">Fluxo de Recursos</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(RESOURCE_INFO).map(([key, info]) => {
                const value = resourceBalance?.[key as keyof ResourceBalance] as number || 0;
                const prevValue = previousBalance?.[key as keyof ResourceBalance] as number || value;
                const diff = value - prevValue;

                return (
                  <Card key={key} className={`glass-card border-l-4 ${info.bgColor.replace('/10', '')}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <div className={`flex items-center gap-2 ${info.color}`}>
                          {info.icon}
                          {info.name}
                        </div>
                        {previousBalance && getChangeIndicator(value, prevValue)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold mb-1">{formatNumber(value)}</p>
                      {previousBalance && diff !== 0 && (
                        <p className={`text-sm ${diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {diff > 0 ? '+' : ''}{formatNumber(diff)} desde último tick
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{info.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="flow" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Produção vs Consumo por Tick</CardTitle>
                <CardDescription>
                  Estimativa baseada na população atual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {flows.map((flow) => {
                    const info = RESOURCE_INFO[flow.resource as keyof typeof RESOURCE_INFO];
                    const maxValue = Math.max(flow.production, flow.consumption, 1);
                    
                    return (
                      <div key={flow.resource} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 ${info.color}`}>
                            {info.icon}
                            <span className="font-medium">{info.name}</span>
                          </div>
                          <Badge 
                            variant={flow.net >= 0 ? 'default' : 'destructive'}
                            className={flow.net >= 0 ? 'bg-green-500' : ''}
                          >
                            {flow.net >= 0 ? '+' : ''}{flow.net}/tick
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Produção</span>
                              <span className="text-green-500">+{flow.production}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(flow.production / maxValue) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Consumo</span>
                              <span className="text-red-500">-{flow.consumption}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500 rounded-full"
                                style={{ width: `${(flow.consumption / maxValue) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Fontes de Produção</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-green-500" />
                      <h4 className="font-medium">População Rural</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Produz: Alimentos (principal)</li>
                      <li>• Produz: Minerais</li>
                      <li>• Produz: Energia básica</li>
                      <li>• Gera: Receita econômica base</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Factory className="h-5 w-5 text-blue-500" />
                      <h4 className="font-medium">População Urbana</h4>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Produz: Tecnologia (principal)</li>
                      <li>• Produz: Energia</li>
                      <li>• Consome: Alimentos</li>
                      <li>• Consome: Energia</li>
                      <li>• Gera: Alta receita econômica</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {resourceBalance && (
              <div className="space-y-4">
                {resourceBalance.food <= 0 && (
                  <Card className="border-red-500/50 bg-red-500/5">
                    <CardContent className="flex items-center gap-4 py-4">
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                      <div>
                        <h3 className="font-bold text-red-500">Escassez de Alimentos!</h3>
                        <p className="text-sm text-muted-foreground">
                          Sem alimentos, a estabilidade cairá e a população urbana sofrerá.
                          Aumente a população rural ou compre no mercado.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resourceBalance.energy <= 0 && (
                  <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="flex items-center gap-4 py-4">
                      <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      <div>
                        <h3 className="font-bold text-yellow-500">Falta de Energia!</h3>
                        <p className="text-sm text-muted-foreground">
                          Sem energia, as cidades não funcionam corretamente.
                          A produção será reduzida.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {territory && territory.stability < 30 && (
                  <Card className="border-orange-500/50 bg-orange-500/5">
                    <CardContent className="flex items-center gap-4 py-4">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <h3 className="font-bold text-orange-500">Baixa Estabilidade</h3>
                        <p className="text-sm text-muted-foreground">
                          A estabilidade está em {territory.stability}%. Risco de crises e perda de células.
                          Garanta recursos suficientes e equilíbrio populacional.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {territory && territory.total_rural_population > 0 && 
                  territory.total_urban_population / territory.total_rural_population > 0.6 && (
                  <Card className="border-blue-500/50 bg-blue-500/5">
                    <CardContent className="flex items-center gap-4 py-4">
                      <AlertTriangle className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-bold text-blue-500">Desequilíbrio Populacional</h3>
                        <p className="text-sm text-muted-foreground">
                          Proporção urbano/rural muito alta. Pode causar instabilidade e escassez de alimentos.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resourceBalance.food > 0 && resourceBalance.energy > 0 && 
                  territory && territory.stability >= 30 && (
                  <Card className="border-green-500/50 bg-green-500/5">
                    <CardContent className="flex items-center gap-4 py-4">
                      <TrendingUp className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-bold text-green-500">Economia Estável</h3>
                        <p className="text-sm text-muted-foreground">
                          Todos os recursos essenciais estão disponíveis. 
                          Continue monitorando para manter o crescimento.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link to="/mercado">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              Ir ao Mercado
            </Button>
          </Link>
          <Link to="/populacao">
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Ver População
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
