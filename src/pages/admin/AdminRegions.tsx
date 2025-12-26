import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Globe, Pencil, Trash2, Building2 } from 'lucide-react';
import AdminLayout from './AdminLayout';

interface Region {
  id: string;
  name: string;
  description: string | null;
  cityCount: number;
}

export default function AdminRegions() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch regions
    const { data: regionsData, error } = await supabase
      .from('regions')
      .select('id, name, description')
      .order('name');

    if (error) {
      toast.error('Erro ao carregar regiões');
      setLoading(false);
      return;
    }

    // Fetch city counts per region
    const { data: citiesData } = await supabase
      .from('cities')
      .select('region_id');

    const cityCounts = (citiesData || []).reduce((acc, city) => {
      if (city.region_id) {
        acc[city.region_id] = (acc[city.region_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const regionsWithCounts: Region[] = (regionsData || []).map(region => ({
      id: region.id,
      name: region.name,
      description: region.description,
      cityCount: cityCounts[region.id] || 0,
    }));

    setRegions(regionsWithCounts);
    setLoading(false);
  }

  function openCreateDialog() {
    setEditingRegion(null);
    setFormName('');
    setFormDescription('');
    setDialogOpen(true);
  }

  function openEditDialog(region: Region) {
    setEditingRegion(region);
    setFormName(region.name);
    setFormDescription(region.description || '');
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Nome da região é obrigatório');
      return;
    }

    setSaving(true);

    const regionData = {
      name: formName.trim(),
      description: formDescription.trim() || null,
    };

    if (editingRegion) {
      // Update existing region
      const { error } = await supabase
        .from('regions')
        .update(regionData)
        .eq('id', editingRegion.id);

      if (error) {
        toast.error('Erro ao atualizar região');
        console.error(error);
      } else {
        toast.success('Região atualizada');
        setDialogOpen(false);
        fetchData();
      }
    } else {
      // Create new region
      const { error } = await supabase
        .from('regions')
        .insert(regionData);

      if (error) {
        toast.error('Erro ao criar região');
        console.error(error);
      } else {
        toast.success('Região criada');
        setDialogOpen(false);
        fetchData();
      }
    }

    setSaving(false);
  }

  async function handleDelete(region: Region) {
    if (region.cityCount > 0) {
      toast.error('Não é possível excluir uma região com cidades');
      return;
    }

    const { error } = await supabase
      .from('regions')
      .delete()
      .eq('id', region.id);

    if (error) {
      toast.error('Erro ao excluir região');
      console.error(error);
    } else {
      toast.success('Região excluída');
      fetchData();
    }
  }

  const stats = {
    total: regions.length,
    totalCities: regions.reduce((acc, r) => acc + r.cityCount, 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-glow">Gerenciar Regiões</h1>
            <p className="text-muted-foreground mt-1">
              Crie, edite e organize as regiões do planeta
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Região
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRegion ? 'Editar Região' : 'Nova Região'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nome da Região *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Planícies do Norte"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descrição da região..."
                    maxLength={500}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingRegion ? 'Salvar Alterações' : 'Criar Região'}
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
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Regiões</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-status-active">{stats.totalCities}</p>
              <p className="text-sm text-muted-foreground">Cidades Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Regions List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : regions.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
              Nenhuma região encontrada.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Regiões ({regions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{region.name}</span>
                        {region.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                            {region.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Building2 className="h-3 w-3" />
                          {region.cityCount} {region.cityCount === 1 ? 'cidade' : 'cidades'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(region)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(region)}
                        disabled={region.cityCount > 0}
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
