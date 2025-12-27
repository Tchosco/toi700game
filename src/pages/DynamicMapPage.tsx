import { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Grid3X3, Filter, ZoomIn, ZoomOut, Info, Users } from 'lucide-react';
import { regions, TOTAL_CELLS, CELL_AREA_KM2, GLOBAL_DENSITY, generateAllCellsRebalanced, computeRegionTotals, computeGlobalTotals } from '@/lib/dynamic-map';
import { getResourceProfile } from '@/lib/dynamic-map';

type Filters = {
  regionId: string | 'all';
  type: 'all' | 'rural' | 'urban';
  owner: 'all' | 'free' | 'owned';
  fertMin: number;
  fertMax: number;
  resource capacity thresholds
  minFood?: number;
  minEnergy?: number;
  minMinerals?: number;
  minTech?: number;
  minInfluence?: number;
};

const PAGE_SIZE = 500;

export default function DynamicMapPage() {
  const [seed, setSeed] = useState('TOI-700');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    regionId: 'all',
    type: 'all',
    owner: 'all',
    fertMin: 0.2,
    fertMax: 2.0,
    minFood: 0,
    minEnergy: 0,
    minMinerals: 0,
    minTech: 0,
    minInfluence: 0,
  });
  const [selectedCell, setSelectedCell] = useState<ReturnType<typeof generateAllCellsRebalanced>[number] | null>(null);

  // Gera todas as células com rebalanço para somar exatamente 11B
  const allCells = useMemo(() => generateAllCellsRebalanced(seed), [seed]);

  const totalPages = Math.ceil(TOTAL_CELLS / PAGE_SIZE);
  const startId = (page - 1) * PAGE_SIZE + 1;
  const endId = Math.min(page * PAGE_SIZE, TOTAL_CELLS);

  const pageCells = useMemo(() => {
    return allCells.slice(startId - 1, endId);
  }, [allCells, startId, endId]);

  const filteredCells = useMemo(() => {
    return pageCells.filter((c) => {
      if (filters.regionId !== 'all' && c.region_id !== filters.regionId) return false;
      if (filters.type !== 'all' && c.type !== filters.type) return false;
      if (filters.owner === 'free' && c.owner_state_id !== null) return false;
      if (filters.owner === 'owned' && c.owner_state_id === null) return false;
      if (c.fertility < filters.fertMin || c.fertility > filters.fertMax) return false;
      const caps = c.resource_nodes;
      if (caps.food_capacity < (filters.minFood || 0)) return false;
      if (caps.energy_capacity < (filters.minEnergy || 0)) return false;
      if (caps.minerals_capacity < (filters.minMinerals || 0)) return false;
      if (caps.tech_capacity < (filters.minTech || 0)) return false;
      if (caps.influence_capacity < (filters.minInfluence || 0)) return false;
      return true;
    });
  }, [pageCells, filters]);

  const regionTotals = useMemo(() => computeRegionTotals(allCells), [allCells]);
  const globalTotals = useMemo(() => computeGlobalTotals(allCells), [allCells]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              Mapa Dinâmico
            </h1>
            <p className="text-muted-foreground mt-1">
              Grid de células geradas por semente determinística (seed_global + cell_id), população coerente e total reequilibrado para 11 bilhões.
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {TOTAL_CELLS.toLocaleString()} células • {CELL_AREA_KM2.toLocaleString()} km²/célula • densidade base {GLOBAL_DENSITY} hab/km²
          </Badge>
        </div>

        {/* Global population summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                População Total (Global)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold">{globalTotals.total.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Urbana (Global)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-accent">{globalTotals.urban.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-status-active" />
                Rural (Global)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-status-active">{globalTotals.rural.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filtros e Seed
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Seed Global</Label>
              <Input value={seed} onChange={(e) => { setPage(1); setSeed(e.target.value); }} placeholder="ex.: TOI-700" />
            </div>
            <div className="space-y-2">
              <Label>Região</Label>
              <Select
                value={filters.regionId}
                onValueChange={(v) => setFilters((f) => ({ ...f, regionId: v as Filters['regionId'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.climate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={filters.type}
                onValueChange={(v) => setFilters((f) => ({ ...f, type: v as Filters['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="urban">Urbano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Propriedade</Label>
              <Select
                value={filters.owner}
                onValueChange={(v) => setFilters((f) => ({ ...f, owner: v as Filters['owner'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="free">Livres</SelectItem>
                  <SelectItem value="owned">Com dono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fertilidade (mín)</Label>
              <Input
                type="number"
                step="0.1"
                min={0.2}
                max={2.0}
                value={filters.fertMin}
                onChange={(e) => setFilters((f) => ({ ...f, fertMin: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fertilidade (máx)</Label>
              <Input
                type="number"
                step="0.1"
                min={0.2}
                max={2.0}
                value={filters.fertMax}
                onChange={(e) => setFilters((f) => ({ ...f, fertMax: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Food mín</Label>
              <Input type="number" value={filters.minFood} onChange={(e) => setFilters((f) => ({ ...f, minFood: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Energy mín</Label>
              <Input type="number" value={filters.minEnergy} onChange={(e) => setFilters((f) => ({ ...f, minEnergy: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Minerals mín</Label>
              <Input type="number" value={filters.minMinerals} onChange={(e) => setFilters((f) => ({ ...f, minMinerals: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Tech mín</Label>
              <Input type="number" value={filters.minTech} onChange={(e) => setFilters((f) => ({ ...f, minTech: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Influence mín</Label>
              <Input type="number" value={filters.minInfluence} onChange={(e) => setFilters((f) => ({ ...f, minInfluence: Number(e.target.value) }))} />
            </div>
          </CardContent>
        </Card>

        {/* Pagination cluster controls */}
        <Card className="glass-card">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-secondary" />
              <span className="text-sm text-muted-foreground">
                Cluster de IDs: {startId}–{endId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handlePrev} disabled={page <= 1}>
                <ZoomOut className="w-4 h-4 mr-2" />
                Página anterior
              </Button>
              <div className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </div>
              <Button variant="secondary" onClick={handleNext} disabled={page >= totalPages}>
                <ZoomIn className="w-4 h-4 mr-2" />
                Próxima página
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cells table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-primary" />
              Células ({filteredCells.length}/{pageCells.length} nesta página)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Clima</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fertilidade</TableHead>
                  <TableHead>Habitabilidade</TableHead>
                  <TableHead>População</TableHead>
                  <TableHead>Urbana / Rural</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCells.map((cell) => {
                  const profile = getResourceProfile(cell);
                  return (
                    <TableRow key={cell.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono">{cell.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{cell.region_name}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{cell.climate}</TableCell>
                      <TableCell className={cell.type === 'urban' ? 'text-accent' : 'text-status-active'}>
                        {cell.type === 'urban' ? 'Urbano' : 'Rural'}
                      </TableCell>
                      <TableCell>{cell.fertility}</TableCell>
                      <TableCell>{cell.habitability}</TableCell>
                      <TableCell className="font-mono">{cell.population_total.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">
                        <div>Urb: {cell.population_urban.toLocaleString()} ({Math.round(cell.urban_share * 100)}%)</div>
                        <div>Rur: {cell.population_rural.toLocaleString()} ({Math.round(cell.rural_share * 100)}%)</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{profile.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedCell(cell)}>
                          <Info className="w-4 h-4 mr-2" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredCells.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma célula encontrada com os filtros atuais.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Region totals */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Totais por Região</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Região</TableHead>
                  <TableHead>Clima</TableHead>
                  <TableHead>Células Urbanas</TableHead>
                  <TableHead>Células Rurais</TableHead>
                  <TableHead>População Total</TableHead>
                  <TableHead>Urbana</TableHead>
                  <TableHead>Rural</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionTotals.map((r) => (
                  <TableRow key={r.region_id}>
                    <TableCell className="font-medium">{r.region_name}</TableCell>
                    <TableCell className="capitalize">{r.climate}</TableCell>
                    <TableCell>{r.urban_cells.toLocaleString()}</TableCell>
                    <TableCell>{r.rural_cells.toLocaleString()}</TableCell>
                    <TableCell className="font-mono">{r.total_population.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-accent">{r.urban_population.toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-status-active">{r.rural_population.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* NEW: Mapa de recursos (rankings) */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Mapa de Recursos — Rankings Top 10</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { key: 'food_capacity', title: 'Alimentos' },
              { key: 'energy_capacity', title: 'Energia' },
              { key: 'minerals_capacity', title: 'Minerais' },
              { key: 'tech_capacity', title: 'Tecnologia' },
              { key: 'influence_capacity', title: 'Influência' },
            ].map((res) => {
              const top = [...allCells]
                .sort((a, b) => b.resource_nodes[res.key as keyof typeof a.resource_nodes] - a.resource_nodes[res.key as keyof typeof a.resource_nodes])
                .slice(0, 10);
              return (
                <Card key={res.key} className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">{res.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Região</TableHead>
                          <TableHead>Capacidade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {top.map((c) => (
                          <TableRow key={`${res.key}-${c.id}`}>
                            <TableCell className="font-mono">{c.id}</TableCell>
                            <TableCell className="text-xs">{c.region_name}</TableCell>
                            <TableCell className="font-mono">
                              {c.resource_nodes[res.key as keyof typeof c.resource_nodes] as number}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        {/* Cell details dialog */}
        <Dialog open={!!selectedCell} onOpenChange={(o) => !o && setSelectedCell(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhe da Célula {selectedCell?.id}</DialogTitle>
              <DialogDescription>
                Atributos, população e capacidades derivadas
              </DialogDescription>
            </DialogHeader>
            {selectedCell && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Região</span><span className="font-mono">{selectedCell.region_name}</span></div>
                    <div className="flex justify-between"><span>Clima</span><span className="capitalize">{selectedCell.climate}</span></div>
                    <div className="flex justify-between"><span>Tipo</span><span>{selectedCell.type === 'urban' ? 'Urbano' : 'Rural'}</span></div>
                    <div className="flex justify-between"><span>Status</span><span>Livre</span></div>
                    <div className="flex justify-between"><span>Área</span><span className="font-mono">{CELL_AREA_KM2.toLocaleString()} km²</span></div>
                    <div className="flex justify-between">
                      <span>Perfil de recursos</span>
                      <span className="font-mono">
                        {getResourceProfile(selectedCell).label}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Atributos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span>Fertilidade</span><span>{selectedCell.fertility}</span></div>
                    <div className="flex justify-between"><span>Habitabilidade</span><span>{selectedCell.habitability}</span></div>
                    <div className="flex justify-between"><span>Minerais</span><span>{selectedCell.mineral_richness}</span></div>
                    <div className="flex justify-between"><span>Energia</span><span>{selectedCell.energy_potential}</span></div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">População</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total</span><span className="font-mono">{selectedCell.population_total.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span>Urbana</span><span className="font-mono">{selectedCell.population_urban.toLocaleString()} ({Math.round(selectedCell.urban_share * 100)}%)</span></div>
                    <div className="flex justify-between"><span>Rural</span><span className="font-mono">{selectedCell.population_rural.toLocaleString()} ({Math.round(selectedCell.rural_share * 100)}%)</span></div>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm">Capacidades de Recursos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span>Alimentos</span><span className="font-mono">{selectedCell.resource_nodes.food_capacity}</span></div>
                    <div className="flex justify-between"><span>Energia</span><span className="font-mono">{selectedCell.resource_nodes.energy_capacity}</span></div>
                    <div className="flex justify-between"><span>Minerais</span><span className="font-mono">{selectedCell.resource_nodes.minerals_capacity}</span></div>
                    <div className="flex justify-between"><span>Tecnologia</span><span className="font-mono">{selectedCell.resource_nodes.tech_capacity}</span></div>
                    <div className="flex justify-between"><span>Influência</span><span className="font-mono">{selectedCell.resource_nodes.influence_capacity}</span></div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}