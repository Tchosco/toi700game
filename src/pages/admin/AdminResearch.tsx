import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, FlaskConical, Beaker, Atom, Lightbulb } from 'lucide-react';

interface TerritoryResearch {
  id: string;
  territory_id: string;
  research_points: number;
  research_rate: number;
  total_research_generated: number;
  territory?: { name: string };
}

interface TerritoryResource {
  id: string;
  territory_id: string;
  resource_type: string;
  amount: number;
  production_rate: number;
  consumption_rate: number;
  territory?: { name: string };
}

export default function AdminResearch() {
  const [research, setResearch] = useState<TerritoryResearch[]>([]);
  const [resources, setResources] = useState<TerritoryResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [researchRes, resourcesRes, territoriesRes] = await Promise.all([
        supabase.from('territory_research').select('*').order('research_points', { ascending: false }),
        supabase.from('territory_resources').select('*').order('amount', { ascending: false }),
        supabase.from('territories').select('id, name')
      ]);

      const territories = territoriesRes.data || [];

      if (researchRes.data) {
        setResearch(researchRes.data.map(r => ({
          ...r,
          territory: territories.find(t => t.id === r.territory_id)
        })));
      }

      if (resourcesRes.data) {
        setResources(resourcesRes.data.map(r => ({
          ...r,
          territory: territories.find(t => t.id === r.territory_id)
        })));
      }
    } catch (error) {
      console.error('Error fetching research data:', error);
    } finally {
      setLoading(false);
    }
  }

  const resourceLabels: Record<string, { label: string; icon: typeof FlaskConical; color: string }> = {
    food: { label: 'Alimentos', icon: FlaskConical, color: 'text-green-400' },
    energy: { label: 'Energia', icon: Lightbulb, color: 'text-yellow-400' },
    minerals: { label: 'Minerais', icon: Atom, color: 'text-orange-400' },
    technology: { label: 'Tecnologia', icon: Beaker, color: 'text-blue-400' },
    influence: { label: 'Influência', icon: FlaskConical, color: 'text-purple-400' }
  };

  const totalResearchPoints = research.reduce((sum, r) => sum + Number(r.research_points), 0);
  const totalResearchRate = research.reduce((sum, r) => sum + Number(r.research_rate), 0);
  const maxResearchPoints = Math.max(...research.map(r => Number(r.research_points)), 1);

  // Group resources by type
  const resourcesByType = resources.reduce((acc, r) => {
    if (!acc[r.resource_type]) {
      acc[r.resource_type] = { total: 0, production: 0, consumption: 0 };
    }
    acc[r.resource_type].total += Number(r.amount);
    acc[r.resource_type].production += Number(r.production_rate);
    acc[r.resource_type].consumption += Number(r.consumption_rate);
    return acc;
  }, {} as Record<string, { total: number; production: number; consumption: number }>);

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
        <div>
          <h1 className="text-3xl font-display text-glow">Pesquisa & Recursos</h1>
          <p className="text-muted-foreground mt-1">
            Pontos de pesquisa e recursos dos territórios
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription>Total de PP</CardDescription>
              <CardTitle className="text-2xl text-glow">
                {totalResearchPoints.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Taxa de Pesquisa/ciclo</CardDescription>
              <CardTitle className="text-2xl">
                +{totalResearchRate.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Territórios Pesquisando</CardDescription>
              <CardTitle className="text-2xl">{research.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Tipos de Recursos</CardDescription>
              <CardTitle className="text-2xl">{Object.keys(resourcesByType).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Resources Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recursos Globais</CardTitle>
            <CardDescription>
              Visão geral dos recursos do planeta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              {Object.entries(resourcesByType).map(([type, data]) => {
                const config = resourceLabels[type] || { label: type, icon: FlaskConical, color: 'text-muted-foreground' };
                const Icon = config.icon;
                const net = data.production - data.consumption;
                
                return (
                  <Card key={type} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {data.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs mt-1">
                        <span className="text-status-success">+{data.production.toFixed(1)}</span>
                        {' / '}
                        <span className="text-destructive">-{data.consumption.toFixed(1)}</span>
                        {' = '}
                        <span className={net >= 0 ? 'text-status-success' : 'text-destructive'}>
                          {net >= 0 ? '+' : ''}{net.toFixed(1)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {Object.keys(resourcesByType).length === 0 && (
                <div className="col-span-5 text-center text-muted-foreground py-8">
                  Nenhum recurso registrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Research Rankings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Ranking de Pesquisa</CardTitle>
            <CardDescription>
              Territórios por pontos de pesquisa acumulados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Território</TableHead>
                  <TableHead>Pontos de Pesquisa</TableHead>
                  <TableHead>Taxa/Ciclo</TableHead>
                  <TableHead>Total Gerado</TableHead>
                  <TableHead>Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {research.map((r, index) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {r.territory?.name || 'Desconhecido'}
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      {Number(r.research_points).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} PP
                    </TableCell>
                    <TableCell className="text-status-success">
                      +{Number(r.research_rate).toFixed(1)}/ciclo
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(r.total_research_generated).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="min-w-32">
                      <Progress 
                        value={(Number(r.research_points) / maxResearchPoints) * 100} 
                        className="h-2" 
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {research.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum território com pesquisa registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detailed Resources */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recursos por Território</CardTitle>
            <CardDescription>
              Detalhamento de recursos por território
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Território</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Produção</TableHead>
                  <TableHead>Consumo</TableHead>
                  <TableHead>Balanço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.slice(0, 50).map((r) => {
                  const net = Number(r.production_rate) - Number(r.consumption_rate);
                  const config = resourceLabels[r.resource_type] || { label: r.resource_type, color: 'text-muted-foreground' };
                  
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.territory?.name || 'Desconhecido'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {Number(r.amount).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-status-success">
                        +{Number(r.production_rate).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-destructive">
                        -{Number(r.consumption_rate).toFixed(1)}
                      </TableCell>
                      <TableCell className={net >= 0 ? 'text-status-success' : 'text-destructive'}>
                        {net >= 0 ? '+' : ''}{net.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {resources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum recurso registrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}