import { useState } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FlaskConical, Plus, Edit, Trash2, Globe } from 'lucide-react';

export default function AdminResearchProjects() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_region_id: '',
    cost_research_points_total: 100,
    progress_research_points: 0,
    status: 'active',
    is_global: true,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['research-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('research_projects')
        .select(`
          *,
          target_region:regions(name),
          created_by_territory:territories(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regions').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('research_projects').insert({
        name: data.name,
        description: data.description || null,
        target_region_id: data.target_region_id || null,
        cost_research_points_total: data.cost_research_points_total,
        progress_research_points: data.progress_research_points,
        status: data.status as 'active' | 'completed' | 'cancelled',
        is_global: data.is_global,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Projeto criado!');
      resetForm();
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('research_projects')
        .update({
          name: data.name,
          description: data.description || null,
          target_region_id: data.target_region_id || null,
          cost_research_points_total: data.cost_research_points_total,
          progress_research_points: data.progress_research_points,
          status: data.status as 'active' | 'completed' | 'cancelled',
          is_global: data.is_global,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Projeto atualizado!');
      resetForm();
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('research_projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-projects'] });
      toast.success('Projeto excluído!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      target_region_id: '',
      cost_research_points_total: 100,
      progress_research_points: 0,
      status: 'active',
      is_global: true,
    });
    setEditingProject(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      target_region_id: project.target_region_id || '',
      cost_research_points_total: project.cost_research_points_total,
      progress_research_points: project.progress_research_points,
      status: project.status,
      is_global: project.is_global,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-gray-500',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-primary" />
              Projetos de Pesquisa
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie projetos de exploração e pesquisa
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto de Pesquisa'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do projeto..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Região Alvo</Label>
                  <Select
                    value={formData.target_region_id}
                    onValueChange={(v) => setFormData({ ...formData, target_region_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região..." />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Custo Total (PP)</Label>
                    <Input
                      type="number"
                      value={formData.cost_research_points_total}
                      onChange={(e) => setFormData({ ...formData, cost_research_points_total: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Progresso (PP)</Label>
                    <Input
                      type="number"
                      value={formData.progress_research_points}
                      onChange={(e) => setFormData({ ...formData, progress_research_points: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={formData.is_global ? 'global' : 'private'}
                      onValueChange={(v) => setFormData({ ...formData, is_global: v === 'global' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="private">Privado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingProject ? 'Atualizar' : 'Criar'} Projeto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">Carregando...</div>
          ) : projects && projects.length > 0 ? (
            projects.map((project) => {
              const progress = (project.progress_research_points / project.cost_research_points_total) * 100;
              return (
                <Card key={project.id} className="glass-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(project)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[project.status]}>{project.status}</Badge>
                      {project.is_global && (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="w-3 h-3" />
                          Global
                        </Badge>
                      )}
                    </div>
                    {project.target_region && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Região:</span>{' '}
                        {project.target_region.name}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span className="font-mono">
                          {project.progress_research_points}/{project.cost_research_points_total} PP
                        </span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Nenhum projeto cadastrado
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
