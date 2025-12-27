import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Map, ZoomIn, ZoomOut, Flame, Loader2 } from 'lucide-react';
import { HeatmapLegend } from '@/components/map/HeatmapLegend';
import { MapFilters, MapFiltersState } from '@/components/map/MapFilters';
import { ClusterCard } from '@/components/map/ClusterCard';
import { SectorCard } from '@/components/map/SectorCard';
import { CellTile } from '@/components/map/CellTile';
import { Button } from '@/components/ui/button';

type HeatmapMode = 'habitability' | 'fertility' | 'minerals' | 'energy' | 'density' | 'urban_share' | 'food_capacity' | 'tech_capacity';

export default function DynamicMapPage() {
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<MapFiltersState>({});
  const [heatmap, setHeatmap] = useState<HeatmapMode>('habitability');
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [sectorKey, setSectorKey] = useState<number | null>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [cells, setCells] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalCells, setTotalCells] = useState(0);
  const [lastTick, setLastTick] = useState<any>(null);

  // Helper: RPC call without generics to avoid TSX parsing conflicts
  const rpcCall = async (fn: string, params: any): Promise<any | null> => {
    const { data, error } = await (supabase as any).rpc(fn, params);
    if (error) {
      console.error('RPC error:', fn, error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    if (zoom === 1) {
      fetchClusters();
    } else if (zoom === 2 && regionId) {
      fetchSectors(regionId);
    } else if (zoom === 3 && regionId !== null && sectorKey !== null) {
      fetchSectorCells(regionId!, sectorKey!, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, regionId, sectorKey, filters, page]);

  async function fetchInitial() {
    const { data: regionsData } = await supabase.from('regions').select('id, name').order('name');
    setRegions(regionsData || []);
    const { data: log } = await supabase.from('tick_logs').select('*').order('tick_number', { ascending: false }).limit(1).maybeSingle();
    setLastTick(log || null);
    setLoading(false);
  }

  async function fetchClusters() {
    const resp = await rpcCall("get_region_clusters", {
      p_region_id: filters.regionId || null,
      p_type_filter: filters.type || null,
      p_status_filter: filters.status || null,
      p_owner_territory_id: filters.onlyMine ? await myTerritoryId() : null,
    });
    if (resp && resp.success) {
      setClusters(resp.clusters || []);
    } else {
      setClusters([]);
    }
  }

  async function fetchSectors(rid: string) {
    const resp = await rpcCall("get_region_sectors", {
      p_region_id: rid,
      p_bucket_size: 300,
      p_type_filter: filters.type || null,
      p_status_filter: filters.status || null,
      p_owner_territory_id: filters.onlyMine ? await myTerritoryId() : null,
    });
    if (resp && resp.success) {
      setSectors(resp.sectors || []);
    } else {
      setSectors([]);
    }
  }

  async function fetchSectorCells(rid: string, skey: number, p: number) {
    const resp = await rpcCall("get_sector_cells", {
      p_region_id: rid,
      p_sector_key: skey,
      p_page: p,
      p_page_size: 100,
      p_type_filter: filters.type || null,
      p_status_filter: filters.status || null,
      p_owner_territory_id: filters.onlyMine ? await myTerritoryId() : null,
      p_habitability_min: filters.habitabilityMin ?? null,
      p_habitability_max: filters.habitabilityMax ?? null,
      p_fertility_min: filters.fertilityMin ?? null,
      p_fertility_max: filters.fertilityMax ?? null,
      p_density_min: filters.densityMin ?? null,
      p_density_max: filters.densityMax ?? null,
      p_predominant_resource: filters.predominant ?? null,
    });
    if (resp && resp.success) {
      setCells(resp.cells || []);
      setTotalCells(resp.total || 0);
    } else {
      setCells([]);
      setTotalCells(0);
    }
  }

  async function myTerritoryId(): Promise<string | null> {
    const { data: t } = await supabase.from('territories').select('id').eq('owner_id', (await supabase.auth.getUser()).data.user?.id || '').limit(1).maybeSingle();
    return t?.id || null;
  }

  function enterRegion(id: string) {
    setRegionId(id);
    setZoom(2);
    setPage(1);
    setSectorKey(null);
  }

  function viewSectorCells(key: number) {
    setSectorKey(key);
    setZoom(3);
    setPage(1);
  }

  function heatColor(val: number) {
    if (val < 0.33) return 'bg-red-500/20 border-red-500/30';
    if (val < 0.66) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-green-500/20 border-green-500/30';
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Map className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Mapa Dinâmico</h1>
              <p className="text-muted-foreground">Clusters, setores e células com heatmaps</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HeatmapLegend mode={heatmap} />
            <Button variant="outline" onClick={() => setHeatmap('habitability')}><Flame className="h-4 w-4 mr-1" /> Habitability</Button>
            <Button variant="outline" onClick={() => setHeatmap('fertility')}>Fertility</Button>
            <Button variant="outline" onClick={() => setHeatmap('minerals')}>Minerals</Button>
            <Button variant="outline" onClick={() => setHeatmap('energy')}>Energy</Button>
            <Button variant="outline" onClick={() => setHeatmap('density')}>Density</Button>
          </div>
        </div>

        {/* Last tick info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Último Tick</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {lastTick ? (
              <div className="flex items-center gap-4">
                <span>Tick #{lastTick.tick_number}</span>
                <span>Atualizado: {new Date(lastTick.completed_at || lastTick.started_at).toLocaleString('pt-BR')}</span>
                <span>Estados: {lastTick.summary?.per_state?.length ?? 0}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Aguardando primeiro tick...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <MapFilters filters={filters} onChange={setFilters} regions={regions} />
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" onClick={() => setZoom(1)}><ZoomOut className="h-4 w-4 mr-1" /> Zoom 1</Button>
              <Button variant="outline" disabled={!filters.regionId} onClick={() => filters.regionId && enterRegion(filters.regionId)}><ZoomIn className="h-4 w-4 mr-1" /> Zoom 2</Button>
            </div>
          </CardContent>
        </Card>

        {/* Zoom content */}
        {zoom === 1 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cl: any) => {
              const regionName = regions.find(r => r.id === cl.region_id)?.name || cl.region_id;
              return (
                <div key={cl.region_id} className={`rounded border ${heatColor(cl.metrics[heatmap === 'habitability' ? 'habitability_avg' : heatmap === 'fertility' ? 'fertility_avg' : heatmap === 'minerals' ? 'minerals_avg' : heatmap === 'energy' ? 'energy_avg' : 'density_avg'])}`}>
                  <ClusterCard regionName={regionName} data={cl} onEnter={() => enterRegion(cl.region_id)} />
                </div>
              );
            })}
          </div>
        )}

        {zoom === 2 && regionId && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((s: any) => {
              const metricVal = heatmap === 'density' ? s.metrics.density
                : heatmap === 'fertility' ? s.metrics.fertility
                : heatmap === 'habitability' ? s.metrics.habitability
                : heatmap === 'minerals' ? s.metrics.minerals
                : s.metrics.energy;
              return (
                <div key={s.sector_key} className={`rounded border ${heatColor(metricVal)}`}>
                  <SectorCard sectorKey={s.sector_key} data={s} onViewCells={() => viewSectorCells(s.sector_key)} />
                </div>
              );
            })}
          </div>
        )}

        {zoom === 3 && regionId && sectorKey !== null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Células: {totalCells.toLocaleString()} • Página {page}</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))}>Anterior</Button>
                <Button variant="outline" onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cells.map((c: any) => (
                <CellTile key={c.id} cell={c} onClick={() => window.location.href = `/celula/${c.id}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}