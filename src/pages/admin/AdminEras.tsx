import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Clock, Loader2, Play, Pause } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Era {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  cells_unlocked: number;
  is_active: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export default function AdminEras() {
  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEra, setEditingEra] = useState<Era | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order_index: 0,
    cells_unlocked: 0,
    is_active: false
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchEras();
  }, []);

  async function fetchEras() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planetary_eras')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setEras(data || []);
    } catch (error) {
      console.error('Error fetching eras:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const eraData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        order_index: formData.order_index,
        cells_unlocked: formData.cells_unlocked,
        is_active: formData.is_active,
        started_at: formData.is_active ? new Date().toISOString() : null
      };

      if (editingEra) {
        const { error } = await supabase
          .from('planetary_eras')
          .update(eraData)
          .eq('id', editingEra.id);
        if (error) throw error;
        toast({ title: 'Era atualizada com sucesso' });
      } else {
        const { error } = await supabase
          .from('planetary_eras')
          .insert([eraData]);
        if (error) throw error;
        toast({ title: 'Era criada com sucesso' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta era?')) return;
    
    try {
      const { error } = await supabase.from('planetary_eras').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Era excluída com sucesso' });
      fetchEras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function toggleEraActive(era: Era) {
    try {
      const updateData: any = {
        is_active: !era.is_active
      };

      if (!era.is_active) {
        // Activating
        updateData.started_at = era.started_at || new Date().toISOString();
        updateData.ended_at = null;
        
        // Deactivate other eras
        await supabase
          .from('planetary_eras')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .neq('id', era.id)
          .eq('is_active', true);
      } else {
        // Deactivating
        updateData.ended_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('planetary_eras')
        .update(updateData)
        .eq('id', era.id);

      if (error) throw error;
      toast({ title: era.is_active ? 'Era desativada' : 'Era ativada' });
      fetchEras();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      order_index: eras.length,
      cells_unlocked: 0,
      is_active: false
    });
    setEditingEra(null);
  }

  function openEditDialog(era: Era) {
    setEditingEra(era);
    setFormData({
      name: era.name,
      description: era.description || '',
      order_index: era.order_index,
      cells_unlocked: era.cells_unlocked,
      is_active: era.is_active
    });
    setIsDialogOpen(true);
  }

  const activeEra = eras.find(e => e.is_active);
  const totalCellsUnlocked = eras.filter(e => e.is_active || e.ended_at).reduce((sum, e) => sum + e.cells_unlocked, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-glow">Eras Planetárias</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as eras de evolução do planeta TOI-700
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Era
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEra ? 'Editar Era' : 'Nova Era'}</DialogTitle>
                <DialogDescription>
                  Configure os detalhes da era planetária
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Era da Cartografia"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva esta era do planeta..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Ordem</Label>
                    <Input
                      type="number"
                      value={formData.order_index}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Células Desbloqueadas</Label>
                    <Input
                      type="number"
                      value={formData.cells_unlocked}
                      onChange={(e) => setFormData({ ...formData, cells_unlocked: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Era Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Era Card */}
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardDescription>Era Atual</CardDescription>
            <CardTitle className="text-2xl text-glow">
              {activeEra ? activeEra.name : 'Nenhuma era ativa'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Células Disponíveis</p>
                <p className="text-xl font-bold text-primary">{activeEra?.cells_unlocked.toLocaleString() || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Desbloqueado</p>
                <p className="text-xl font-bold">{totalCellsUnlocked.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Início</p>
                <p className="text-lg">
                  {activeEra?.started_at 
                    ? format(new Date(activeEra.started_at), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Eras Totais</p>
                <p className="text-xl font-bold">{eras.length}</p>
              </div>
            </div>
            {activeEra?.description && (
              <p className="mt-4 text-muted-foreground">{activeEra.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Eras List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Todas as Eras</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Células</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eras.map((era) => (
                    <TableRow key={era.id}>
                      <TableCell className="font-mono">{era.order_index}</TableCell>
                      <TableCell className="font-medium">{era.name}</TableCell>
                      <TableCell>{era.cells_unlocked.toLocaleString()}</TableCell>
                      <TableCell>
                        {era.is_active ? (
                          <Badge className="bg-status-success/20 text-status-success">
                            <Play className="w-3 h-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : era.ended_at ? (
                          <Badge className="bg-muted text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            Concluída
                          </Badge>
                        ) : (
                          <Badge className="bg-status-warning/20 text-status-warning">
                            <Pause className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {era.started_at 
                          ? format(new Date(era.started_at), 'dd/MM/yy', { locale: ptBR })
                          : '-'} 
                        {era.ended_at && ` - ${format(new Date(era.ended_at), 'dd/MM/yy', { locale: ptBR })}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => toggleEraActive(era)}
                          title={era.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {era.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(era)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(era.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {eras.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma era cadastrada
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