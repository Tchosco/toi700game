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
import { Globe, Grid3X3, Filter, ZoomIn, ZoomOut, Info } from 'lucide-react';
import { generateCell, regions, TOTAL_CELLS, CELL_AREA_KM2, GLOBAL_DENSITY } from '@/lib/dynamic-map';

type Filters = {
  regionId: string | 'all';
  type: 'all' | 'rural' | 'urban';
  owner: 'all' | 'free' | 'owned';
  fertMin: number;
  fertMax: number;
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
  });
  const [selectedCell, setSelectedCell] = useState<ReturnType<typeof generateCell> | null>(null);

  const totalPages = Math.ceil(TOTAL_CELLS / PAGE_SIZE);
  const startId = (page - 1) * PAGE_SIZE + 1;
  const endId = Math.min(page * PAGE_SIZE, TOTAL_CELLS);

  const pageCells = useMemo(() => {
    const arr: ReturnType<typeof generateCell>[] = [];
    for (let id = startId; id <= endId; id++) {
      arr.push(generateCell(id, seed));
    }
    return arr;
  }, [startId, endId, seed]);

  const filteredCells = useMemo(() => {
    return pageCells.filter((c) => {
      if (filters.regionId !== 'all' && c.region_id !== filters.regionId) return false;
      if (filters.type !== 'all' && c.type !== filters.type) return false;
      if (filters.owner === 'free' && c.owner_state_id !== null) return false;
      if (filters.owner === 'owned' && c.owner_state_id === null) return false;
      if (c.fertility < filters.fertMin || c.fertility > filters.fertMax) return false;
      return true;
    });
  }, [pageCells, filters]);

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
              Grid de células geradas por semente determinística (seed_global + cell_id)
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {TOTAL_CELLS.toLocaleString()} células • {CELL_AREA_KM2.toLocaleString()} km²/célula • densidade base {GLOBAL_DENSITY} hab/km²
          </Badge>
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
              <Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="ex.: TOI-700" />
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
                  <TableHead>Minerais</TableHead>
                  <TableHead>Energia</TableHead>
                  <TableHead>População</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCells.map((cell) => (
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
                    <TableCell>{cell.mineral_richness}</TableCell>
                    <TableCell>{cell.energy_potential}</TableCell>
                    <TableCell className="font-mono">{cell.population_total.toLocaleString()}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setSelectedCell(cell)}>
                        <Info className="w-4 h-4 mr-2" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredCells.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nenhuma célula encontrada com os filtros atuais.
              </div>
            )}
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