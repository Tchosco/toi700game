import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Users, Building2, TreePine, AlertTriangle, Globe, Loader2 } from 'lucide-react';

interface PopulationData {
  totalPlanetPopulation: number;
  activeUrbanPopulation: number;
  activeRuralPopulation: number;
  latentPopulation: number;
}

interface TerritoryPopulation {
  territoryId: string;
  territoryName: string;
  urbanPopulation: number;
  ruralPopulation: number;
  totalPopulation: number;
}

interface PopulationStatsProps {
  territoryId?: string;
  compact?: boolean;
}

export function PopulationStats({ territoryId, compact = false }: PopulationStatsProps) {
  const [planetData, setPlanetData] = useState<PopulationData | null>(null);
  const [territoryData, setTerritoryData] = useState<TerritoryPopulation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopulationData();
  }, [territoryId]);

  async function fetchPopulationData() {
    setLoading(true);

    // Fetch world config for planet population
    const { data: worldConfig } = await supabase
      .from('world_config')
      .select('total_planet_population, active_urban_population, active_rural_population, latent_population')
      .limit(1)
      .single();

    if (worldConfig) {
      setPlanetData({
        totalPlanetPopulation: Number(worldConfig.total_planet_population) || 10000000000,
        activeUrbanPopulation: Number(worldConfig.active_urban_population) || 0,
        activeRuralPopulation: Number(worldConfig.active_rural_population) || 0,
        latentPopulation: Number(worldConfig.latent_population) || 10000000000,
      });
    }

    // Fetch territory-specific population if provided
    if (territoryId) {
      const { data: territory } = await supabase
        .from('territories')
        .select('id, name, total_rural_population, total_urban_population')
        .eq('id', territoryId)
        .single();

      if (territory) {
        setTerritoryData({
          territoryId: territory.id,
          territoryName: territory.name,
          urbanPopulation: territory.total_urban_population || 0,
          ruralPopulation: territory.total_rural_population || 0,
          totalPopulation: (territory.total_urban_population || 0) + (territory.total_rural_population || 0),
        });
      }
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

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {territoryData && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Building2 className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Pop. Urbana</p>
                <p className="font-bold text-sm">{formatPopulation(territoryData.urbanPopulation)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
              <TreePine className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pop. Rural</p>
                <p className="font-bold text-sm">{formatPopulation(territoryData.ruralPopulation)}</p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Planet Population Overview */}
      {planetData && !territoryId && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-primary" />
              População Planetária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">População Total</span>
              <span className="font-bold text-xl">{formatPopulation(planetData.totalPlanetPopulation)}</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Urbana Ativa
                </span>
                <span className="font-medium">{formatPopulation(planetData.activeUrbanPopulation)}</span>
              </div>
              <Progress 
                value={(planetData.activeUrbanPopulation / planetData.totalPlanetPopulation) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-green-500" />
                  Rural Ativa
                </span>
                <span className="font-medium">{formatPopulation(planetData.activeRuralPopulation)}</span>
              </div>
              <Progress 
                value={(planetData.activeRuralPopulation / planetData.totalPlanetPopulation) * 100} 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  Latente (Não Explorada)
                </span>
                <span className="font-medium text-muted-foreground">{formatPopulation(planetData.latentPopulation)}</span>
              </div>
              <Progress 
                value={(planetData.latentPopulation / planetData.totalPlanetPopulation) * 100} 
                className="h-2 opacity-50"
              />
            </div>

            <div className="pt-2 border-t border-border/50">
              <Badge variant="outline" className="text-xs">
                {((planetData.activeUrbanPopulation + planetData.activeRuralPopulation) / planetData.totalPlanetPopulation * 100).toFixed(2)}% da população está economicamente ativa
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Territory Population */}
      {territoryData && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              População do Território
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">População Total</span>
              <span className="font-bold text-xl">{formatPopulation(territoryData.totalPopulation)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Urbana</span>
                </div>
                <p className="text-2xl font-bold">{formatPopulation(territoryData.urbanPopulation)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gera: moeda, tech, pesquisa, influência
                </p>
              </div>

              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <TreePine className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">Rural</span>
                </div>
                <p className="text-2xl font-bold">{formatPopulation(territoryData.ruralPopulation)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gera: alimentos, minerais, base econômica
                </p>
              </div>
            </div>

            {/* Population Balance Warning */}
            {territoryData.ruralPopulation > 0 && territoryData.urbanPopulation / territoryData.ruralPopulation > 0.5 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-500">Desequilíbrio Populacional</p>
                  <p className="text-muted-foreground">
                    Alta proporção urbana/rural pode causar escassez de alimentos e recursos básicos.
                  </p>
                </div>
              </div>
            )}

            {territoryData.ruralPopulation === 0 && territoryData.urbanPopulation > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-500">Alerta Crítico</p>
                  <p className="text-muted-foreground">
                    Sem população rural, o território não pode produzir alimentos suficientes.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
