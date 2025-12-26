import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Users, Lock, Unlock, Loader2, MapPin } from 'lucide-react';

interface RegionPopulation {
  regionId: string;
  regionName: string;
  isVisible: boolean;
  totalCells: number;
  colonizedCells: number;
  estimatedRuralPopulation: number;
  activatedPopulation: number;
}

export function LatentPopulationCard() {
  const [regions, setRegions] = useState<RegionPopulation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatentPopulation();
  }, []);

  async function fetchLatentPopulation() {
    setLoading(true);

    // Fetch all regions
    const { data: regionsData } = await supabase
      .from('regions')
      .select('id, name, is_visible')
      .order('name');

    if (!regionsData) {
      setLoading(false);
      return;
    }

    // Fetch cells for each region
    const regionPopulations: RegionPopulation[] = [];

    for (const region of regionsData) {
      const { data: cells } = await supabase
        .from('cells')
        .select('id, status, rural_population, area_km2')
        .eq('region_id', region.id);

      const totalCells = cells?.length || 0;
      const colonizedCells = cells?.filter(c => c.status === 'colonized').length || 0;
      
      // Estimate rural population (500 per km² for blocked/unexplored areas)
      const estimatedRuralPopulation = cells?.reduce((sum, cell) => {
        if (cell.status === 'blocked') {
          return sum + (cell.area_km2 * 500);
        }
        return sum + (cell.rural_population || 0);
      }, 0) || 0;

      // Activated population is from explored/colonized cells
      const activatedPopulation = cells?.reduce((sum, cell) => {
        if (cell.status !== 'blocked') {
          return sum + (cell.rural_population || 0);
        }
        return sum;
      }, 0) || 0;

      regionPopulations.push({
        regionId: region.id,
        regionName: region.name,
        isVisible: region.is_visible,
        totalCells,
        colonizedCells,
        estimatedRuralPopulation,
        activatedPopulation,
      });
    }

    setRegions(regionPopulations);
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

  const visibleRegions = regions.filter(r => r.isVisible);
  const hiddenRegions = regions.filter(r => !r.isVisible);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5 text-primary" />
          População por Região
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visible Regions */}
        {visibleRegions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Unlock className="w-4 h-4 text-green-500" />
              Regiões Exploradas
            </h4>
            <div className="space-y-2">
              {visibleRegions.map(region => (
                <div 
                  key={region.regionId}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{region.regionName}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {region.colonizedCells}/{region.totalCells} células
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pop. Ativa:</span>
                      <span className="ml-2 font-medium text-green-500">
                        {formatPopulation(region.activatedPopulation)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pop. Total Estimada:</span>
                      <span className="ml-2 font-medium">
                        {formatPopulation(region.estimatedRuralPopulation)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden Regions */}
        {hiddenRegions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              Regiões Não Exploradas
            </h4>
            <div className="space-y-2">
              {hiddenRegions.map(region => (
                <div 
                  key={region.regionId}
                  className="p-3 rounded-lg bg-muted/20 border border-border/30 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-muted-foreground">{region.regionName}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Bloqueado
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    População latente: ~{formatPopulation(region.estimatedRuralPopulation)} (estimativa)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {regions.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma região registrada.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
