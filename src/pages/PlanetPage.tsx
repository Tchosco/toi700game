import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Map, Grid3X3, Users, Clock } from 'lucide-react';

type KVItem = { key: string; value: string };

export default function PlanetPage() {
  const { data: world } = useQuery({
    queryKey: ['world-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('world_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: kv } = useQuery({
    queryKey: ['planetary-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planetary_config')
        .select('*');
      if (error) throw error;
      return (data || []) as KVItem[];
    },
  });

  const kvMap = new Map<string, string>();
  (kv || []).forEach((item) => kvMap.set(item.key, item.value));

  const planetaAreaTotalKm2 = Number(kvMap.get('planeta_area_total_km2')) || 714_140_000;
  const proporcaoAreaSeca = Number(kvMap.get('proporcao_area_seca')) || 0.45;
  const areaSecaTotalKm2 = Number(world?.total_planet_land_km2) || Number(kvMap.get('area_seca_total_km2')) || 321_363_000;
  const cellSizeKm2 = Number(world?.cell_size_km2_default) || Number(kvMap.get('cell_size_km2')) || 5_000;
  const totalCellsLand = Math.round(areaSecaTotalKm2 / cellSizeKm2);
  const totalPopulation = Number(world?.total_planet_population) || Number(kvMap.get('total_population')) || 11_000_000_000;
  const densidadeMedia = totalPopulation > 0 && areaSecaTotalKm2 > 0 ? (totalPopulation / areaSecaTotalKm2) : 0;
  const tickIntervalHours = Number(world?.tick_interval_hours) || Number(kvMap.get('tick_interval_hours')) || 24;

  const fullyUnlocked = (kvMap.get('planeta_totalmente_liberado') || '').toLowerCase() === 'true'
    || (Number(world?.initial_playable_land_km2) || 0) >= areaSecaTotalKm2;

  const stats = [
    { label: 'Área Total do Planeta', value: `${planetaAreaTotalKm2.toLocaleString()} km²`, icon: Globe, color: 'text-primary' },
    { label: 'Proporção de Terra', value: `${(proporcaoAreaSeca * 100).toFixed(0)}%`, icon: Map, color: 'text-secondary' },
    { label: 'Área Terrestre Total', value: `${areaSecaTotalKm2.toLocaleString()} km²`, icon: Map, color: 'text-foreground' },
    { label: 'Tamanho da Célula', value: `${cellSizeKm2.toLocaleString()} km²`, icon: Grid3X3, color: 'text-status-active' },
    { label: 'Total de Células (Terra)', value: totalCellsLand.toLocaleString(), icon: Grid3X3, color: 'text-accent' },
    { label: 'População Total', value: totalPopulation.toLocaleString(), icon: Users, color: 'text-primary' },
    { label: 'Densidade Média', value: `${densidadeMedia.toFixed(1)} hab/km²`, icon: Users, color: 'text-secondary' },
    { label: 'Intervalo de Tick', value: `${tickIntervalHours} h`, icon: Clock, color: 'text-foreground' },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              Planeta TOI-700
            </h1>
            <p className="text-muted-foreground mt-1">
              Parâmetros globais e estatísticas derivadas
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {fullyUnlocked ? 'Planeta totalmente liberado' : 'Liberação parcial'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    {stat.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}