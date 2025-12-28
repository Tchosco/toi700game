import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PopulationStats } from '@/components/population/PopulationStats';
import { LatentPopulationCard } from '@/components/population/LatentPopulationCard';
import { supabase } from '@/integrations/supabase/client';
import { Users, Globe, Building2, TreePine, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

interface TerritoryPopSummary {
  id: string;
  name: string;
  urbanPop: number;
  ruralPop: number;
  totalPop: number;
  urbanRatio: number;
  trend?: 'rural' | 'urban';
}

export default function PopulationPage() {
  const [territories, setTerritories] = useState<TerritoryPopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [worldStats, setWorldStats] = useState({
    totalPlanet: 10000000000,
    totalActive: 0,
    totalLatent: 10000000000,
    totalUrban: 0,
    totalRural: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch world config
    const { data: worldConfig } = await supabase
      .from('world_config')
      .select('total_planet_population, active_urban_population, active_rural_population, latent_population')
      .limit(1)
      .single();

    if (worldConfig) {
      setWorldStats({
        totalPlanet: Number(worldConfig.total_planet_population) || 10000000000,
        totalActive: (Number(worldConfig.active_urban_population) || 0) + (Number(worldConfig.active_rural_population) || 0),
        totalLatent: Number(worldConfig.latent_population) || 10000000000,
        totalUrban: Number(worldConfig.active_urban_population) || 0,
        totalRural: Number(worldConfig.active_rural_population) || 0,
      });
    }

    // Fetch territories with population
    const { data: territoriesData } = await supabase
      .from('territories')
      .select('id, name, total_urban_population, total_rural_population')
      .eq('status', 'active')
      .order('name');

    if (territoriesData) {
      const summaries: TerritoryPopSummary[] = territoriesData.map(t => {
        const urbanPop = t.total_urban_population || 0;
        const ruralPop = t.total_rural_population || 0;
        const totalPop = urbanPop + ruralPop;
        return {
          id: t.id,
          name: t.name,
          urbanPop,
          ruralPop,
          totalPop,
          urbanRatio: totalPop > 0 ? (urbanPop / totalPop) * 100 : 0,
        };
      });

      // Calcular tendência rural/urbana baseado em células do território:
      const withTrend = await Promise.all(
        summaries.map(async (s) => {
          const { data: cells } = await supabase
            .from('cells')
            .select('resource_food, resource_tech, has_city, is_urban_eligible, rural_population, urban_population')
            .eq('owner_territory_id', s.id);

          if (cells && cells.length > 0) {
            let ruralScore = 0;
            let urbanScore = 0;
            for (const c of cells) {
              const food = Number(c.resource_food || 0);
              const tech = Number(c.resource_tech || 0);
              ruralScore += food;
              urbanScore += tech;
              if (c.has_city) urbanScore += 30;
              if (c.is_urban_eligible) urbanScore += 20;
            }
            s.trend = urbanScore > ruralScore ? 'urban' : 'rural';
          } else {
            // fallback pela razão urbana
            s.trend = s.urbanRatio > 50 ? 'urban' : 'rural';
          }
          return s;
        })
      );

      setTerritories(withTrend.sort((a, b) => b.totalPop - a.totalPop));
    }

    setLoading(false);
  }

  const formatPopulation = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('pt-BR');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Demografia Planetária</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            População de <span className="text-gradient">TOI-700</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Visualize a distribuição populacional do planeta, incluindo populações urbanas, rurais e latentes em regiões não exploradas.
          </p>
        </div>

        {/* Planet Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Pop. Total</p>
              <p className="text-xl font-bold">{formatPopulation(worldStats.totalPlanet)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Pop. Ativa</p>
              <p className="text-xl font-bold">{formatPopulation(worldStats.totalActive)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Urbana</p>
              <p className="text-xl font-bold">{formatPopulation(worldStats.totalUrban)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <TreePine className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Rural</p>
              <p className="text-xl font-bold">{formatPopulation(worldStats.totalRural)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Latente</p>
              <p className="text-xl font-bold text-muted-foreground">{formatPopulation(worldStats.totalLatent)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="territories">Por Território</TabsTrigger>
            <TabsTrigger value="regions">Por Região</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <PopulationStats />
          </TabsContent>

          <TabsContent value="territories">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {territories.length === 0 ? (
                  <Card className="glass-card">
                    <CardContent className="py-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum território ativo encontrado.</p>
                    </CardContent>
                  </Card>
                ) : (
                  territories.map(territory => (
                    <Card key={territory.id} className="glass-card">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">{territory.name}</h3>
                          <Badge variant="outline">
                            Total: {formatPopulation(territory.totalPop)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-xs text-muted-foreground">Urbana</p>
                              <p className="font-bold">{formatPopulation(territory.urbanPop)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TreePine className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-xs text-muted-foreground">Rural</p>
                              <p className="font-bold">{formatPopulation(territory.ruralPop)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {territory.urbanRatio > 50 ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground">Razão Urbana</p>
                              <p className={`font-bold ${territory.urbanRatio > 50 ? 'text-yellow-500' : 'text-green-500'}`}>
                                {territory.urbanRatio.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <Badge variant="outline" className="flex items-center gap-2">
                            {territory.trend === 'urban' ? (
                              <>
                                <Building2 className="w-3 h-3 text-primary" />
                                Tendência: Urbana (infra/cidade/tecnologia)
                              </>
                            ) : (
                              <>
                                <TreePine className="w-3 h-3 text-green-500" />
                                Tendência: Rural (fertilidade/ alimentos)
                              </>
                            )}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="regions">
            <LatentPopulationCard />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}