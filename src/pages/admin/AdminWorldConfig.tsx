import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Globe, Settings, Save, RefreshCw } from 'lucide-react';

export default function AdminWorldConfig() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['world-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('world_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    cell_size_km2_default: 7500,
    initial_playable_land_km2: 30000000,
    total_planet_land_km2: 269000000,
    max_urban_ratio: 0.20,
    tick_interval_hours: 24,
    season_day: 1,
  });

  // Atualiza os campos do formulário quando a configuração for carregada
  useEffect(() => {
    if (config) {
      setFormData({
        cell_size_km2_default: Number(config.cell_size_km2_default),
        initial_playable_land_km2: Number(config.initial_playable_land_km2),
        total_planet_land_km2: Number(config.total_planet_land_km2),
        max_urban_ratio: Number(config.max_urban_ratio),
        tick_interval_hours: config.tick_interval_hours,
        season_day: config.season_day,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('world_config')
        .update(data)
        .eq('id', config?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['world-config'] });
      toast.success('Configuração atualizada!');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const playableCells = Math.round(formData.initial_playable_land_km2 / formData.cell_size_km2_default);
  const totalPossibleCells = Math.round(formData.total_planet_land_km2 / formData.cell_size_km2_default);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Globe className="w-8 h-8 text-primary" />
              Configuração Mundial
            </h1>
            <p className="text-muted-foreground mt-1">
              Parâmetros globais do planeta TOI-700
            </p>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? 'secondary' : 'default'}
          >
            <Settings className="w-4 h-4 mr-2" />
            {isEditing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Main Config */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Parâmetros do Planeta</CardTitle>
              <CardDescription>Configurações base do mundo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tamanho de Célula Padrão (km²)</Label>
                <Input
                  type="number"
                  value={formData.cell_size_km2_default}
                  onChange={(e) => setFormData({ ...formData, cell_size_km2_default: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Área Terrestre Jogável Inicial (km²)</Label>
                <Input
                  type="number"
                  value={formData.initial_playable_land_km2}
                  onChange={(e) => setFormData({ ...formData, initial_playable_land_km2: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Área Terrestre Total do Planeta (km²)</Label>
                <Input
                  type="number"
                  value={formData.total_planet_land_km2}
                  onChange={(e) => setFormData({ ...formData, total_planet_land_km2: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Proporção Máxima Urbana</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={formData.max_urban_ratio}
                  onChange={(e) => setFormData({ ...formData, max_urban_ratio: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Time Config */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Configurações de Tempo</CardTitle>
              <CardDescription>Ciclos e temporadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Intervalo de Tick (horas)</Label>
                <Input
                  type="number"
                  value={formData.tick_interval_hours}
                  onChange={(e) => setFormData({ ...formData, tick_interval_hours: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia da Temporada (contador)</Label>
                <Input
                  type="number"
                  value={formData.season_day}
                  onChange={(e) => setFormData({ ...formData, season_day: Number(e.target.value) })}
                  disabled={!isEditing}
                />
              </div>
              
              {isEditing && (
                <Button onClick={handleSave} className="w-full mt-4" disabled={updateMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Derived Stats */}
          <Card className="glass-card md:col-span-2">
            <CardHeader>
              <CardTitle>Estatísticas Derivadas</CardTitle>
              <CardDescription>Valores calculados automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="font-mono text-2xl font-bold text-primary">{playableCells.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Células Jogáveis Iniciais</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="font-mono text-2xl font-bold text-secondary">{totalPossibleCells.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total de Células Possíveis</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="font-mono text-2xl font-bold text-accent">{Math.round(playableCells * formData.max_urban_ratio).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Máximo de Cidades</div>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <div className="font-mono text-2xl font-bold">{((formData.initial_playable_land_km2 / formData.total_planet_land_km2) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Terra Desbloqueada</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}