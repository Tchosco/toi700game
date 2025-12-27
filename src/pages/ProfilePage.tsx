"use client";

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Building2, Coins, Map, Wallet, History, Crown, 
  Leaf, Zap, Mountain, Cpu, Vote, ArrowUpRight, ArrowDownRight,
  Globe, Shield, TrendingUp, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const resourceIcons: Record<string, React.ElementType> = {
  food: Leaf,
  energy: Zap,
  minerals: Mountain,
  technology: Cpu,
  influence: Vote,
};

const resourceLabels: Record<string, string> = {
  food: 'Alimentos',
  energy: 'Energia',
  minerals: 'Minerais',
  technology: 'Tecnologia',
  influence: 'Influência',
};

const tokenLabels: Record<string, string> = {
  city: 'City Token',
  land: 'Land Token',
  state: 'State Token',
};

const tokenIcons: Record<string, React.ElementType> = {
  city: Building2,
  land: Map,
  state: Globe,
};

const levelLabels: Record<string, string> = {
  colony: 'Colônia',
  autonomous: 'Autônomo',
  recognized: 'Reconhecido',
  kingdom: 'Reino',
  power: 'Potência',
};

const levelColors: Record<string, string> = {
  colony: 'bg-gray-500',
  autonomous: 'bg-blue-500',
  recognized: 'bg-green-500',
  kingdom: 'bg-purple-500',
  power: 'bg-yellow-500',
};

// ADD: Explicit type for territories with nested aliases
type MyTerritory = {
  id: string;
  name: string;
  level: keyof typeof levelLabels;
  government_type: string;
  stability: number;
  economy_rating: number;
  pd_points: number;
  pi_points: number;
  region?: { name?: string } | null;
  capital?: { name?: string } | null;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch wallet data
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('player_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch tokens
  const { data: tokens } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch territories
  const { data: territories } = useQuery<MyTerritory[]>({
    queryKey: ['user-territories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from('territories')
        .select(`
          id, name, level, government_type, stability, economy_rating, pd_points, pi_points,
          region:regions(name),
          capital:cities!territories_capital_city_id_fkey(name)
        `)
        .eq('owner_id', user.id);
      return (data || []) as MyTerritory[];
    },
    enabled: !!user,
  });

  // Fetch territory resources (for all user territories)
  const { data: resources } = useQuery({
    queryKey: ['user-resources', user?.id],
    queryFn: async () => {
      if (!user || !territories?.length) return [];
      const territoryIds = territories.map(t => t.id);
      const { data } = await supabase
        .from('territory_resources')
        .select('*')
        .in('territory_id', territoryIds);
      return data || [];
    },
    enabled: !!user && !!territories?.length,
  });

  // Fetch currency transactions
  const { data: currencyTransactions } = useQuery({
    queryKey: ['currency-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('currency_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch token transactions
  const { data: tokenTransactions } = useQuery({
    queryKey: ['token-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Aggregate resources by type
  const aggregatedResources = resources?.reduce((acc, res) => {
    if (!acc[res.resource_type]) {
      acc[res.resource_type] = { amount: 0, production: 0, consumption: 0 };
    }
    acc[res.resource_type].amount += Number(res.amount);
    acc[res.resource_type].production += Number(res.production_rate);
    acc[res.resource_type].consumption += Number(res.consumption_rate);
    return acc;
  }, {} as Record<string, { amount: number; production: number; consumption: number }>);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">
                {profile?.username || 'Jogador'}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="font-mono text-xl font-bold">₮{Number(wallet?.balance || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Territórios</p>
                  <p className="font-mono text-xl font-bold">{territories?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Ganho</p>
                  <p className="font-mono text-xl font-bold">₮{Number(wallet?.total_earned || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="font-mono text-xl font-bold">₮{Number(wallet?.total_spent || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="territories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="territories" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Territórios</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <Leaf className="w-4 h-4" />
              <span className="hidden sm:inline">Recursos</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Territories Tab */}
          <TabsContent value="territories">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Meus Territórios
                </CardTitle>
                <CardDescription>
                  Gerencie seus territórios e nações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {territories && territories.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {territories.map((territory) => (
                      <Link 
                        key={territory.id} 
                        to={`/territorio/${territory.id}`}
                        className="block"
                      >
                        <Card className="hover:border-primary/50 transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-display font-bold text-lg">{territory.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {territory.region?.name || 'Sem região'}
                                </p>
                              </div>
                              <Badge className={`${levelColors[territory.level]} text-white`}>
                                {levelLabels[territory.level]}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Capital:</span>
                                <span className="ml-2 font-medium">{territory.capital?.name || 'Nenhuma'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Governo:</span>
                                <span className="ml-2 font-medium capitalize">{territory.government_type}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Estabilidade:</span>
                                <span className="ml-2 font-medium">{territory.stability}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Economia:</span>
                                <span className="ml-2 font-medium">{territory.economy_rating}%</span>
                              </div>
                            </div>

                            <div className="flex gap-4 mt-4 pt-4 border-t border-border/50">
                              <div className="flex items-center gap-1 text-sm">
                                <Shield className="w-4 h-4 text-blue-500" />
                                <span className="font-mono">{territory.pd_points} PD</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm">
                                <Vote className="w-4 h-4 text-purple-500" />
                                <span className="font-mono">{territory.pi_points} PI</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display font-bold text-lg mb-2">Nenhum território</h3>
                    <p className="text-muted-foreground mb-4">
                      Você ainda não possui nenhum território. Crie sua primeira nação!
                    </p>
                    <Link to="/criar-territorio">
                      <Button>Criar Território</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Meus Tokens
                </CardTitle>
                <CardDescription>
                  Tokens disponíveis para expansão territorial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {['city', 'land', 'state'].map((type) => {
                    const Icon = tokenIcons[type];
                    const count = type === 'city' 
                      ? tokens?.city_tokens 
                      : type === 'land' 
                        ? tokens?.land_tokens 
                        : tokens?.state_tokens;
                    
                    return (
                      <Card key={type} className="bg-muted/30">
                        <CardContent className="pt-6 text-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Icon className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="font-display font-bold text-lg mb-1">
                            {tokenLabels[type]}
                          </h3>
                          <p className="font-mono text-3xl font-bold text-primary mb-2">
                            {count || 0}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {type === 'city' && 'Permite fundar 1 cidade'}
                            {type === 'land' && 'Permite colonizar 1 célula'}
                            {type === 'state' && 'Permite criar 1 país'}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/mercado">
                    <Button variant="outline">
                      <Coins className="w-4 h-4 mr-2" />
                      Comprar Tokens no Mercado
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  Recursos Totais
                </CardTitle>
                <CardDescription>
                  Soma de recursos de todos os seus territórios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aggregatedResources && Object.keys(aggregatedResources).length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(aggregatedResources).map(([type, data]) => {
                      const Icon = resourceIcons[type] || Leaf;
                      const netProduction = data.production - data.consumption;
                      
                      return (
                        <Card key={type} className="bg-muted/30">
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">{resourceLabels[type] || type}</h3>
                                <p className="font-mono text-xl font-bold">{data.amount.toFixed(0)}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Produção:</span>
                                <span className="text-green-500 font-mono">+{data.production.toFixed(1)}/ciclo</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Consumo:</span>
                                <span className="text-red-500 font-mono">-{data.consumption.toFixed(1)}/ciclo</span>
                              </div>
                              <div className="flex justify-between border-t border-border/50 pt-2">
                                <span className="text-muted-foreground">Líquido:</span>
                                <span className={`font-mono font-bold ${netProduction >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {netProduction >= 0 ? '+' : ''}{netProduction.toFixed(1)}/ciclo
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Leaf className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display font-bold text-lg mb-2">Sem recursos</h3>
                    <p className="text-muted-foreground">
                      Você ainda não possui recursos. Crie um território para começar a produzir!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Currency Transactions */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-500" />
                    Transações de Moeda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currencyTransactions && currencyTransactions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {currencyTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            {tx.transaction_type === 'credit' ? (
                              <ArrowDownRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{tx.description || tx.category}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          <span className={`font-mono font-bold ${tx.transaction_type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.transaction_type === 'credit' ? '+' : '-'}₮{Math.abs(Number(tx.amount)).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma transação</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Token Transactions */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-500" />
                    Transações de Tokens
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {tokenTransactions && tokenTransactions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {tokenTransactions.map((tx) => {
                        const Icon = tokenIcons[tx.token_type] || Crown;
                        return (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium text-sm">{tokenLabels[tx.token_type] || tx.token_type}</p>
                                <p className="text-xs text-muted-foreground">{tx.reason || 'Sem descrição'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), "dd/MM", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma transação</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}