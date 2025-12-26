import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Globe, MapPin, Grid3X3, Building2 } from 'lucide-react';

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

export default function AdminConfig() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planetary_config')
        .select('*')
        .order('key');

      if (error) throw error;
      setConfigs(data || []);
      
      const values: Record<string, string> = {};
      data?.forEach(c => { values[c.key] = c.value; });
      setEditedValues(values);
    } catch (error) {
      console.error('Error fetching configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const config of configs) {
        if (editedValues[config.key] !== config.value) {
          const { error } = await supabase
            .from('planetary_config')
            .update({ value: editedValues[config.key] })
            .eq('key', config.key);
          if (error) throw error;
        }
      }
      toast({ title: 'Configurações salvas com sucesso' });
      fetchConfigs();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const getConfigIcon = (key: string) => {
    if (key.includes('planet')) return Globe;
    if (key.includes('land') || key.includes('playable')) return MapPin;
    if (key.includes('cell')) return Grid3X3;
    if (key.includes('urban')) return Building2;
    return Globe;
  };

  const formatValue = (key: string, value: string) => {
    if (key.includes('km2') || key.includes('area')) {
      return parseInt(value).toLocaleString() + ' km²';
    }
    if (key.includes('percentage')) {
      return value + '%';
    }
    return value;
  };

  // Calculate derived values
  const totalPlanetArea = parseInt(editedValues['total_planet_area_km2'] || '0');
  const totalLandArea = parseInt(editedValues['total_land_area_km2'] || '0');
  const playableLandArea = parseInt(editedValues['playable_land_area_km2'] || '0');
  const cellSize = parseInt(editedValues['cell_size_km2'] || '7500');
  const maxUrbanPercentage = parseInt(editedValues['max_urban_percentage'] || '20');
  
  const totalCellsPlayable = Math.floor(playableLandArea / cellSize);
  const maxUrbanCells = Math.floor(totalCellsPlayable * (maxUrbanPercentage / 100));
  const landPercentage = ((totalLandArea / totalPlanetArea) * 100).toFixed(1);
  const playablePercentage = ((playableLandArea / totalLandArea) * 100).toFixed(1);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display text-glow">Configurações Planetárias</h1>
            <p className="text-muted-foreground mt-1">
              Configure os parâmetros do planeta TOI-700
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Alterações
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription>Células Jogáveis</CardDescription>
              <CardTitle className="text-3xl text-glow">{totalCellsPlayable.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {playableLandArea.toLocaleString()} km² ÷ {cellSize.toLocaleString()} km²
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Células Urbanas Máx.</CardDescription>
              <CardTitle className="text-2xl text-blue-400">{maxUrbanCells.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {maxUrbanPercentage}% das células jogáveis
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Terra do Planeta</CardDescription>
              <CardTitle className="text-2xl">{landPercentage}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {totalLandArea.toLocaleString()} km²
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Área Jogável</CardDescription>
              <CardTitle className="text-2xl text-status-success">{playablePercentage}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                da área terrestre
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Config Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {configs.filter(c => c.key !== 'current_era').map((config) => {
            const Icon = getConfigIcon(config.key);
            return (
              <Card key={config.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{config.key.replace(/_/g, ' ').replace(/km2/g, '(km²)')}</CardTitle>
                  </div>
                  {config.description && (
                    <CardDescription>{config.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor={config.key}>Valor</Label>
                    <Input
                      id={config.key}
                      type={config.key.includes('percentage') ? 'number' : 'text'}
                      value={editedValues[config.key] || ''}
                      onChange={(e) => setEditedValues({ ...editedValues, [config.key]: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Valor formatado: {formatValue(config.key, editedValues[config.key] || '')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Planet Info */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Informações do Planeta TOI-700</CardTitle>
            <CardDescription>Resumo das configurações atuais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-medium text-foreground mb-2">Dimensões</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Área total: {totalPlanetArea.toLocaleString()} km²</li>
                  <li>Área terrestre: {totalLandArea.toLocaleString()} km²</li>
                  <li>Área jogável: {playableLandArea.toLocaleString()} km²</li>
                  <li>Comparação: ~1,3× a área da Terra</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Sistema de Células</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Tamanho padrão: {cellSize.toLocaleString()} km²</li>
                  <li>Total jogáveis: {totalCellsPlayable.toLocaleString()}</li>
                  <li>Máximo urbanas: {maxUrbanCells.toLocaleString()}</li>
                  <li>Células rurais: ~{(totalCellsPlayable - maxUrbanCells).toLocaleString()}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">Distribuição</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Células bloqueadas: ~{Math.floor((totalLandArea - playableLandArea) / cellSize).toLocaleString()}</li>
                  <li>Limite urbano: {maxUrbanPercentage}%</li>
                  <li>Tipo inicial: Rural/Bloqueada</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}