import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Grid3X3, MapPin, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type CellStatus = 'blocked' | 'explored' | 'colonized';
type CellType = 'rural' | 'urban' | 'neutral' | 'blocked';

interface Cell {
  id: string;
  region_id: string | null;
  cell_type: CellType;
  status: CellStatus;
  area_km2: number;
  owner_territory_id: string | null;
  city_id: string | null;
  explored_at: string | null;
  colonized_at: string | null;
  unlock_reason: string | null;
  created_at: string;
}

interface Region {
  id: string;
  name: string;
}

interface Territory {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
}

export default function AdminCells() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [formData, setFormData] = useState({
    region_id: '',
    cell_type: 'rural' as CellType,
    status: 'blocked' as CellStatus,
    area_km2: 7500,
    owner_territory_id: '',
    city_id: '',
    unlock_reason: ''
  });
  const [filter, setFilter] = useState({ status: 'all', type: 'all', region: 'all' });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cellsRes, regionsRes, territoriesRes, citiesRes] = await Promise.all([
        supabase.from('cells').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('regions').select('id, name'),
        supabase.from('territories').select('id, name'),
        supabase.from('cities').select('id, name')
      ]);

      if (cellsRes.data) setCells(cellsRes.data as Cell[]);
      if (regionsRes.data) setRegions(regionsRes.data);
      if (territoriesRes.data) setTerritories(territoriesRes.data);
      if (citiesRes.data) setCities(citiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      const cellData = {
        region_id: formData.region_id || null,
        cell_type: formData.cell_type,
        status: formData.status,
        area_km2: formData.area_km2,
        owner_territory_id: formData.owner_territory_id || null,
        city_id: formData.city_id || null,
        unlock_reason: formData.unlock_reason || null,
        explored_at: formData.status === 'explored' || formData.status === 'colonized' ? new Date().toISOString() : null,
        colonized_at: formData.status === 'colonized' ? new Date().toISOString() : null
      };

      if (editingCell) {
        const { error } = await supabase
          .from('cells')
          .update(cellData)
          .eq('id', editingCell.id);
        if (error) throw error;
        toast({ title: 'Célula atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('cells')
          .insert([cellData]);
        if (error) throw error;
        toast({ title: 'Célula criada com sucesso' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta célula?')) return;
    
    try {
      const { error } = await supabase.from('cells').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Célula excluída com sucesso' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleBulkCreate(count: number) {
    try {
      const newCells = Array.from({ length: count }, () => ({
        cell_type: 'rural' as CellType,
        status: 'blocked' as CellStatus,
        area_km2: 7500
      }));

      const { error } = await supabase.from('cells').insert(newCells);
      if (error) throw error;
      toast({ title: `${count} células criadas com sucesso` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  function resetForm() {
    setFormData({
      region_id: '',
      cell_type: 'rural',
      status: 'blocked',
      area_km2: 7500,
      owner_territory_id: '',
      city_id: '',
      unlock_reason: ''
    });
    setEditingCell(null);
  }

  function openEditDialog(cell: Cell) {
    setEditingCell(cell);
    setFormData({
      region_id: cell.region_id || '',
      cell_type: cell.cell_type,
      status: cell.status,
      area_km2: cell.area_km2,
      owner_territory_id: cell.owner_territory_id || '',
      city_id: cell.city_id || '',
      unlock_reason: cell.unlock_reason || ''
    });
    setIsDialogOpen(true);
  }

  const filteredCells = cells.filter(cell => {
    if (filter.status !== 'all' && cell.status !== filter.status) return false;
    if (filter.type !== 'all' && cell.cell_type !== filter.type) return false;
    if (filter.region !== 'all' && cell.region_id !== filter.region) return false;
    return true;
  });

  const stats = {
    total: cells.length,
    blocked: cells.filter(c => c.status === 'blocked').length,
    explored: cells.filter(c => c.status === 'explored').length,
    colonized: cells.filter(c => c.status === 'colonized').length,
    urban: cells.filter(c => c.cell_type === 'urban').length,
    rural: cells.filter(c => c.cell_type === 'rural').length
  };

  const statusColors: Record<CellStatus, string> = {
    blocked: 'bg-muted text-muted-foreground',
    explored: 'bg-status-warning/20 text-status-warning',
    colonized: 'bg-status-success/20 text-status-success'
  };

  const typeColors: Record<CellType, string> = {
    rural: 'bg-green-500/20 text-green-400',
    urban: 'bg-blue-500/20 text-blue-400',
    neutral: 'bg-purple-500/20 text-purple-400',
    blocked: 'bg-muted text-muted-foreground'
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-glow">Células Territoriais</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as células do planeta TOI-700
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleBulkCreate(10)}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              Criar 10 células
            </Button>
            <Button variant="outline" onClick={() => handleBulkCreate(100)}>
              <Grid3X3 className="w-4 h-4 mr-2" />
              Criar 100 células
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Célula
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCell ? 'Editar Célula' : 'Nova Célula'}</DialogTitle>
                  <DialogDescription>
                    Configure os detalhes da célula territorial
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Região</Label>
                    <Select value={formData.region_id} onValueChange={(v) => setFormData({ ...formData, region_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma região" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma</SelectItem>
                        {regions.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <Select value={formData.cell_type} onValueChange={(v) => setFormData({ ...formData, cell_type: v as CellType })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rural">Rural</SelectItem>
                          <SelectItem value="urban">Urbana</SelectItem>
                          <SelectItem value="neutral">Neutra</SelectItem>
                          <SelectItem value="blocked">Bloqueada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as CellStatus })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blocked">Bloqueada</SelectItem>
                          <SelectItem value="explored">Explorada</SelectItem>
                          <SelectItem value="colonized">Colonizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Área (km²)</Label>
                    <Input
                      type="number"
                      value={formData.area_km2}
                      onChange={(e) => setFormData({ ...formData, area_km2: parseInt(e.target.value) || 7500 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Território Controlador</Label>
                    <Select value={formData.owner_territory_id} onValueChange={(v) => setFormData({ ...formData, owner_territory_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {territories.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.cell_type === 'urban' && (
                    <div className="grid gap-2">
                      <Label>Cidade</Label>
                      <Select value={formData.city_id} onValueChange={(v) => setFormData({ ...formData, city_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma cidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {cities.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Motivo de Desbloqueio</Label>
                    <Input
                      value={formData.unlock_reason}
                      onChange={(e) => setFormData({ ...formData, unlock_reason: e.target.value })}
                      placeholder="Ex: Era da Cartografia"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Bloqueadas</CardDescription>
              <CardTitle className="text-2xl text-muted-foreground">{stats.blocked}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Exploradas</CardDescription>
              <CardTitle className="text-2xl text-status-warning">{stats.explored}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Colonizadas</CardDescription>
              <CardTitle className="text-2xl text-status-success">{stats.colonized}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Urbanas</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{stats.urban}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Rurais</CardDescription>
              <CardTitle className="text-2xl text-green-400">{stats.rural}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                  <SelectItem value="explored">Exploradas</SelectItem>
                  <SelectItem value="colonized">Colonizadas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="urban">Urbana</SelectItem>
                  <SelectItem value="neutral">Neutra</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filter.region} onValueChange={(v) => setFilter({ ...filter, region: v })}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as regiões</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="glass-card">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Território</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCells.map((cell) => (
                    <TableRow key={cell.id}>
                      <TableCell className="font-mono text-xs">{cell.id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge className={typeColors[cell.cell_type]}>
                          {cell.cell_type === 'rural' && 'Rural'}
                          {cell.cell_type === 'urban' && 'Urbana'}
                          {cell.cell_type === 'neutral' && 'Neutra'}
                          {cell.cell_type === 'blocked' && 'Bloqueada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[cell.status]}>
                          {cell.status === 'blocked' && 'Bloqueada'}
                          {cell.status === 'explored' && 'Explorada'}
                          {cell.status === 'colonized' && 'Colonizada'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {regions.find(r => r.id === cell.region_id)?.name || '-'}
                      </TableCell>
                      <TableCell>{cell.area_km2.toLocaleString()} km²</TableCell>
                      <TableCell>
                        {territories.find(t => t.id === cell.owner_territory_id)?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(cell)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cell.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCells.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma célula encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}