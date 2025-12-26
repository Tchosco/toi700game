import { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Plus, Edit, Trash2, Leaf, Zap, Mountain, Cpu } from 'lucide-react';

interface CityProfile {
  id: string;
  name: string;
  description: string | null;
  base_outputs_per_tick: {
    food: number;
    energy: number;
    minerals: number;
    tech: number;
  };
  base_research_per_tick: number;
  maintenance_cost_per_tick: number;
}

export default function AdminCityProfiles() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<CityProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    food: 10,
    energy: 10,
    minerals: 5,
    tech: 2,
    base_research_per_tick: 1,
    maintenance_cost_per_tick: 50,
  });

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['city-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('city_profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as unknown as CityProfile[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('city_profiles').insert({
        name: data.name,
        description: data.description || null,
        base_outputs_per_tick: {
          food: data.food,
          energy: data.energy,
          minerals: data.minerals,
          tech: data.tech,
        },
        base_research_per_tick: data.base_research_per_tick,
        maintenance_cost_per_tick: data.maintenance_cost_per_tick,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-profiles'] });
      toast.success('Perfil criado!');
      resetForm();
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('city_profiles')
        .update({
          name: data.name,
          description: data.description || null,
          base_outputs_per_tick: {
            food: data.food,
            energy: data.energy,
            minerals: data.minerals,
            tech: data.tech,
          },
          base_research_per_tick: data.base_research_per_tick,
          maintenance_cost_per_tick: data.maintenance_cost_per_tick,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-profiles'] });
      toast.success('Perfil atualizado!');
      resetForm();
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('city_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-profiles'] });
      toast.success('Perfil excluído!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      food: 10,
      energy: 10,
      minerals: 5,
      tech: 2,
      base_research_per_tick: 1,
      maintenance_cost_per_tick: 50,
    });
    setEditingProfile(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (profile: CityProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || '',
      food: profile.base_outputs_per_tick.food,
      energy: profile.base_outputs_per_tick.energy,
      minerals: profile.base_outputs_per_tick.minerals,
      tech: profile.base_outputs_per_tick.tech,
      base_research_per_tick: profile.base_research_per_tick,
      maintenance_cost_per_tick: Number(profile.maintenance_cost_per_tick),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Perfis de Cidade
            </h1>
            <p className="text-muted-foreground mt-1">
              Defina os tipos de cidade e suas produções base
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil de Cidade'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Agrícola, Industrial..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo de Manutenção (₮/tick)</Label>
                    <Input
                      type="number"
                      value={formData.maintenance_cost_per_tick}
                      onChange={(e) => setFormData({ ...formData, maintenance_cost_per_tick: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do perfil..."
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Leaf className="w-4 h-4 text-green-500" />
                      Alimentos
                    </Label>
                    <Input
                      type="number"
                      value={formData.food}
                      onChange={(e) => setFormData({ ...formData, food: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      Energia
                    </Label>
                    <Input
                      type="number"
                      value={formData.energy}
                      onChange={(e) => setFormData({ ...formData, energy: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Mountain className="w-4 h-4 text-orange-500" />
                      Minerais
                    </Label>
                    <Input
                      type="number"
                      value={formData.minerals}
                      onChange={(e) => setFormData({ ...formData, minerals: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      Tecnologia
                    </Label>
                    <Input
                      type="number"
                      value={formData.tech}
                      onChange={(e) => setFormData({ ...formData, tech: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Pesquisa Base por Tick</Label>
                  <Input
                    type="number"
                    value={formData.base_research_per_tick}
                    onChange={(e) => setFormData({ ...formData, base_research_per_tick: Number(e.target.value) })}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingProfile ? 'Atualizar' : 'Criar'} Perfil
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Perfis Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : profiles && profiles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Produção/Tick</TableHead>
                    <TableHead>Pesquisa</TableHead>
                    <TableHead>Manutenção</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{profile.name}</div>
                          {profile.description && (
                            <div className="text-xs text-muted-foreground">{profile.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-500">🌾 {profile.base_outputs_per_tick.food}</span>
                          <span className="text-yellow-500">⚡ {profile.base_outputs_per_tick.energy}</span>
                          <span className="text-orange-500">⛏️ {profile.base_outputs_per_tick.minerals}</span>
                          <span className="text-blue-500">🔬 {profile.base_outputs_per_tick.tech}</span>
                        </div>
                      </TableCell>
                      <TableCell>{profile.base_research_per_tick}/tick</TableCell>
                      <TableCell>₮{profile.maintenance_cost_per_tick}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(profile)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(profile.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhum perfil cadastrado</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
