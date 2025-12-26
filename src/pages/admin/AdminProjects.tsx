import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Loader2, Compass, MapPin, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Project {
  id: string;
  name: string;
  description: string | null;
  project_type: 'exploration' | 'colonization';
  target_cells: number;
  cells_completed: number;
  status: 'active' | 'completed' | 'cancelled';
  started_by: string | null;
  era_id: string | null;
  created_at: string;
}

interface Era {
  id: string;
  name: string;
}

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [eras, setEras] = useState<Era[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_type: 'exploration' as 'exploration' | 'colonization',
    target_cells: 10,
    cells_completed: 0,
    status: 'active' as 'active' | 'completed' | 'cancelled',
    era_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [projectsRes, erasRes] = await Promise.all([
        supabase.from('exploration_projects').select('*').order('created_at', { ascending: false }),
        supabase.from('planetary_eras').select('id, name').order('order_index')
      ]);

      if (projectsRes.data) setProjects(projectsRes.data as Project[]);
      if (erasRes.data) setEras(erasRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        project_type: formData.project_type,
        target_cells: formData.target_cells,
        cells_completed: formData.cells_completed,
        status: formData.status,
        era_id: formData.era_id || null
      };

      if (editingProject) {
        const { error } = await supabase
          .from('exploration_projects')
          .update(projectData)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast({ title: 'Projeto atualizado com sucesso' });
      } else {
        const { error } = await supabase
          .from('exploration_projects')
          .insert([projectData]);
        if (error) throw error;
        toast({ title: 'Projeto criado com sucesso' });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este projeto?')) return;
    
    try {
      const { error } = await supabase.from('exploration_projects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Projeto excluído com sucesso' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      project_type: 'exploration',
      target_cells: 10,
      cells_completed: 0,
      status: 'active',
      era_id: ''
    });
    setEditingProject(null);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      project_type: project.project_type,
      target_cells: project.target_cells,
      cells_completed: project.cells_completed,
      status: project.status,
      era_id: project.era_id || ''
    });
    setIsDialogOpen(true);
  }

  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    exploration: projects.filter(p => p.project_type === 'exploration').length,
    colonization: projects.filter(p => p.project_type === 'colonization').length
  };

  const statusColors = {
    active: 'bg-status-success/20 text-status-success',
    completed: 'bg-primary/20 text-primary',
    cancelled: 'bg-destructive/20 text-destructive'
  };

  const typeIcons = {
    exploration: Compass,
    colonization: MapPin
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-glow">Projetos Planetários</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie projetos de exploração e colonização
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
                <DialogDescription>
                  Configure os detalhes do projeto planetário
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Expedição Aurora"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o objetivo do projeto..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Select value={formData.project_type} onValueChange={(v) => setFormData({ ...formData, project_type: v as 'exploration' | 'colonization' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exploration">Exploração</SelectItem>
                        <SelectItem value="colonization">Colonização</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'completed' | 'cancelled' })}>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Células Alvo</Label>
                    <Input
                      type="number"
                      value={formData.target_cells}
                      onChange={(e) => setFormData({ ...formData, target_cells: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Células Completadas</Label>
                    <Input
                      type="number"
                      value={formData.cells_completed}
                      onChange={(e) => setFormData({ ...formData, cells_completed: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Era Associada</Label>
                  <Select value={formData.era_id} onValueChange={(v) => setFormData({ ...formData, era_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma era" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma</SelectItem>
                      {eras.map(era => (
                        <SelectItem key={era.id} value={era.id}>{era.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Ativos</CardDescription>
              <CardTitle className="text-2xl text-status-success">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Concluídos</CardDescription>
              <CardTitle className="text-2xl text-primary">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Exploração</CardDescription>
              <CardTitle className="text-2xl text-status-warning">{stats.exploration}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Colonização</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{stats.colonization}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Projects List */}
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
                    <TableHead>Projeto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Era</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const Icon = typeIcons[project.project_type];
                    const progress = project.target_cells > 0 
                      ? Math.round((project.cells_completed / project.target_cells) * 100) 
                      : 0;
                    
                    return (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{project.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {project.project_type === 'exploration' ? 'Exploração' : 'Colonização'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-32">
                            <Progress value={progress} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {project.cells_completed}/{project.target_cells}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[project.status]}>
                            {project.status === 'active' && 'Ativo'}
                            {project.status === 'completed' && 'Concluído'}
                            {project.status === 'cancelled' && 'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {eras.find(e => e.id === project.era_id)?.name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(project.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(project)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(project.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum projeto cadastrado
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