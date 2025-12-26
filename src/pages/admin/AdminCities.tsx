import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Building2, Pencil, Trash2, MapPin } from 'lucide-react';
import AdminLayout from './AdminLayout';
import type { Database } from '@/integrations/supabase/types';

type CityStatus = Database['public']['Enums']['city_status'];

interface City {
  id: string;
  name: string;
  regionId: string | null;
  regionName: string;
  status: CityStatus;
  isNeutral: boolean;
  ownerTerritoryId: string | null;
  ownerTerritoryName: string | null;
}

interface Region {
  id: string;
  name: string;
}

const statusLabels: Record<CityStatus, string> = {
  free: 'Livre',
  occupied: 'Ocupada',
  neutral: 'Neutra',
};

const statusStyles: Record<CityStatus, string> = {
  free: 'bg-status-active/20 text-status-active border-status-active/30',
  occupied: 'bg-status-pending/20 text-status-pending border-status-pending/30',
  neutral: 'bg-status-neutral/20 text-status-neutral border-status-neutral/30',
};

export default function AdminCities() {
  const [cities, setCities] = useState<City[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [filter, setFilter] = useState<CityStatus | 'all'>('all');

  // Form state
  const [formName, setFormName] = useState('');
  const [formRegionId, setFormRegionId] = useState('');
  const [formStatus, setFormStatus] = useState<CityStatus>('free');
  const [formIsNeutral, setFormIsNeutral] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch regions
    const { data: regionsData } = await supabase
      .from('regions')
      .select('id, name')
      .order('name');
    setRegions(regionsData || []);

    // Fetch cities
    const { data: citiesData, error } = await supabase
      .from('cities')
      .select('id, name, region_id, status, is_neutral, owner_territory_id')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar cidades');
      setLoading(false);
      return;
    }

    // Fetch territories for owner names
    const territoryIds = citiesData?.map(c => c.owner_territory_id).filter(Boolean) || [];
    const { data: territories } = await supabase
      .from('territories')
      .select('id, name')
      .in('id', territoryIds);

    const citiesWithDetails: City[] = citiesData?.map(city => ({
      id: city.id,
      name: city.name,
      regionId: city.region_id,
      regionName: regionsData?.find(r => r.id === city.region_id)?.name || 'Sem região',
      status: city.status,
      isNeutral: city.is_neutral,
      ownerTerritoryId: city.owner_territory_id,
      ownerTerritoryName: territories?.find(t => t.id === city.owner_territory_id)?.name || null,
    })) || [];

    setCities(citiesWithDetails);
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingCity(null);
    setFormName('');
    setFormRegionId('');
    setFormStatus('free');
    setFormIsNeutral(false);
    setDialogOpen(true);
  }

  function openEditDialog(city: City) {
    setEditingCity(city);
    setFormName(city.name);
    setFormRegionId(city.regionId || '');
    setFormStatus(city.status);
    setFormIsNeutral(city.isNeutral);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Nome da cidade é obrigatório');
      return;
    }

    setSaving(true);

    const cityData = {
      name: formName.trim(),
      region_id: formRegionId || null,
      status: formIsNeutral ? 'neutral' as CityStatus : formStatus,
      is_neutral: formIsNeutral,
    };

    if (editingCity) {
      // Update existing city
      const { error } = await supabase
        .from('cities')
        .update(cityData)
        .eq('id', editingCity.id);

      if (error) {
        toast.error('Erro ao atualizar cidade');
        console.error(error);
      } else {
        toast.success('Cidade atualizada');
        setDialogOpen(false);
        fetchData();
      }
    } else {
      // Create new city
      const { error } = await supabase
        .from('cities')
        .insert(cityData);

      if (error) {
        toast.error('Erro ao criar cidade');
        console.error(error);
      } else {
        toast.success('Cidade criada');
        setDialogOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  }

  async function handleDelete(city: City) {
    if (city.ownerTerritoryId) {
      toast.error('Não é possível excluir uma cidade ocupada');
      return;
    }

    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', city.id);

    if (error) {
      toast.error('Erro ao excluir cidade');
      console.error(error);
    } else {
      toast.success('Cidade excluída');
      fetchData();
    }
  }

  const filteredCities = filter === 'all' 
    ? cities 
    : cities.filter(c => c.status === filter);

  const stats = {
    total: cities.length,
    free: cities.filter(c => c.status === 'free').length,
    occupied: cities.filter(c => c.status === 'occupied').length,
    neutral: cities.filter(c => c.status === 'neutral').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-glow">Gerenciar Cidades</h1>
            <p className="text-muted-foreground mt-1">
              Crie, edite e atribua cidades às regiões
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Cidade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCity ? 'Editar Cidade' : 'Nova Cidade'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome da Cidade *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Nova Esperança"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Região</Label>
                  <Select value={formRegionId} onValueChange={setFormRegionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem região</SelectItem>
                      {regions.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formIsNeutral}
                      onCheckedChange={setFormIsNeutral}
                    />
                    <Label>Cidade Neutra (Administração Planetária)</Label>
                  </div>
                </div>

                {!formIsNeutral && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formStatus} onValueChange={(v) => setFormStatus(v as CityStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">{statusLabels.free}</SelectItem>
                        <SelectItem value="occupied">{statusLabels.occupied}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingCity ? 'Salvar Alterações' : 'Criar Cidade'}
                  </Button>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-status-active">{stats.free}</p>
              <p className="text-sm text-muted-foreground">Livres</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-status-pending">{stats.occupied}</p>
              <p className="text-sm text-muted-foreground">Ocupadas</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-status-neutral">{stats.neutral}</p>
              <p className="text-sm text-muted-foreground">Neutras</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            variant={filter === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('free')}
          >
            Livres
          </Button>
          <Button
            variant={filter === 'occupied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('occupied')}
          >
            Ocupadas
          </Button>
          <Button
            variant={filter === 'neutral' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('neutral')}
          >
            Neutras
          </Button>
        </div>

        {/* Cities List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCities.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhuma cidade encontrada.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Cidades ({filteredCities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredCities.map((city) => (
                  <div
                    key={city.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{city.name}</span>
                          <Badge className={statusStyles[city.status]}>
                            {statusLabels[city.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {city.regionName}
                          </span>
                          {city.ownerTerritoryName && (
                            <span>Dono: {city.ownerTerritoryName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(city)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(city)}
                        disabled={!!city.ownerTerritoryId}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
