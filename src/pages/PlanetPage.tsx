import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Globe, Database, Activity } from 'lucide-react';

interface WorldConfig {
  planet_total_area_km2?: number;
  proportion_dry_area?: number;
  total_planet_land_km2?: number;
  cell_size_km2_default?: number;
  total_cells_land?: number;
  total_planet_population?: number;
  tick_interval_hours?: number;
  planet_released?: boolean;
}

interface TickLog {
  tick_number: number;
  started_at: string;
  completed_at: string | null;
  summary: any;
}

export default function PlanetPage() {
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [lastTick, setLastTick] = useState<TickLog | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: wc } = await supabase.from('world_config').select('*').limit(1).maybeSingle();
    setConfig(wc || null);
    const { data: log } = await supabase.from('tick_logs').select('*').order('tick_number', { ascending: false }).limit(1).maybeSingle();
    setLastTick(log || null);
  }

  const density = config?.total_planet_land_km2 && config?.total_planet_population
    ? (config.total_planet_population / config.total_planet_land_km2)
    : null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Globe className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Planeta</h1>
            <p className="text-muted-foreground">Parâmetros globais e resumo do tick</p>
          </div>
        </div>

        {/* Config */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Configuração do Planeta</CardTitle>
            <CardDescription>Valores atuais e estado de liberação</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Área Total (km²)</p>
              <p className="font-bold">{config?.planet_total_area_km2?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Área Seca Total (km²)</p>
              <p className="font-bold">{config?.total_planet_land_km2?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Proporção Área Seca</p>
              <p className="font-bold">{config?.proportion_dry_area !== undefined ? `${(config.proportion_dry_area * 100).toFixed(1)}%` : '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Tamanho da Célula (km²)</p>
              <p className="font-bold">{config?.cell_size_km2_default?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Total de Células (terra)</p>
              <p className="font-bold">{config?.total_cells_land?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">População Total</p>
              <p className="font-bold">{config?.total_planet_population?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Densidade Média (hab/km²)</p>
              <p className="font-bold">{density ? density.toFixed(1) : '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Tick Interval (h)</p>
              <p className="font-bold">{config?.tick_interval_hours ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground">Planeta Liberado</p>
              <p className="font-bold">{config?.planet_released ? 'Sim' : 'Não'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Last tick summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Resumo do Último Tick</CardTitle>
            <CardDescription>Produção, consumo, crises e migração por Estado</CardDescription>
          </CardHeader>
          <CardContent>
            {lastTick ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Tick #</p>
                    <p className="font-bold">{lastTick.tick_number}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Intervalo (h)</p>
                    <p className="font-bold">{config?.tick_interval_hours ?? 24}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Estados Processados</p>
                    <p className="font-bold">{lastTick.summary?.per_state?.length ?? 0}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Trades Executados</p>
                    <p className="font-bold">{lastTick.summary?.trades_executed ?? 0}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {(lastTick.summary?.per_state || []).slice(0, 8).map((s: any) => (
                    <div key={s.territory_id} className="p-3 rounded border bg-muted/30">
                      <div className="flex justify-between text-sm mb-2">
                        <span>ID do Estado</span>
                        <span className="font-mono">{s.territory_id}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Produção</p>
                          <p>Food {s.prod.food} • Energy {s.prod.energy}</p>
                          <p>Minerals {s.prod.minerals} • Tech {s.prod.tech}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Consumo</p>
                          <p>Food {s.cons.food} • Energy {s.cons.energy}</p>
                          <p>Tech {s.cons.tech}</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mt-2">
                        <span>Crises: {Object.entries(s.crises).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'Nenhuma'}</span>
                        <span>Migração líquida: {s.migration_net}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Nenhum tick registrado ainda.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}