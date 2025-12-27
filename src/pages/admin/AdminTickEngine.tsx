import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Clock, AlertTriangle, CheckCircle, Zap, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export default function AdminTickEngine() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExecuting, setIsExecuting] = useState(false);
  const [autoRunDev, setAutoRunDev] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);

  // Fetch world config
  const { data: worldConfig, isLoading: configLoading } = useQuery({
    queryKey: ['worldConfig'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('world_config')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent tick logs
  const { data: tickLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['tickLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tick_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent event logs
  const { data: eventLogs, isLoading: eventsLoading } = useQuery({
    queryKey: ['eventLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_logs')
        .select('*, territories(name)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Execute tick mutation
  const executeTick = useMutation({
    mutationFn: async () => {
      setIsExecuting(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const { data, error } = await supabase.functions.invoke('process-tick', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Tick executado com sucesso!',
        description: `Tick #${data.tick_number} processado. ${data.summary.territories_processed} territórios, ${data.summary.events_generated} eventos.`,
      });
      queryClient.invalidateQueries({ queryKey: ['worldConfig'] });
      queryClient.invalidateQueries({ queryKey: ['tickLogs'] });
      queryClient.invalidateQueries({ queryKey: ['eventLogs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao executar tick',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsExecuting(false);
    },
  });

  useEffect(() => {
    if (!autoRunDev) return;
    const minutes = Math.max(1, Number(intervalMinutes) || 60);
    const ms = minutes * 60 * 1000;
    const timer = setInterval(() => {
      if (!isExecuting) {
        executeTick.mutate();
      }
    }, ms);
    return () => clearInterval(timer);
  }, [autoRunDev, intervalMinutes, isExecuting]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-status-success/20 text-status-success"><CheckCircle className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'running':
        return <Badge className="bg-status-warning/20 text-status-warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Em execução</Badge>;
      case 'failed':
        return <Badge className="bg-status-danger/20 text-status-danger"><AlertTriangle className="h-3 w-3 mr-1" /> Falhou</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      bonus_production: { label: 'Produção', className: 'bg-status-success/20 text-status-success' },
      mineral_discovery: { label: 'Descoberta', className: 'bg-primary/20 text-primary' },
      tech_breakthrough: { label: 'Tecnologia', className: 'bg-accent/20 text-accent-foreground' },
      trade_boom: { label: 'Comércio', className: 'bg-status-warning/20 text-status-warning' },
      storm: { label: 'Tempestade', className: 'bg-status-danger/20 text-status-danger' },
      harvest: { label: 'Colheita', className: 'bg-status-success/20 text-status-success' },
      research_grant: { label: 'Pesquisa', className: 'bg-accent/20 text-accent-foreground' },
      energy_surge: { label: 'Energia', className: 'bg-status-warning/20 text-status-warning' },
      cultural_event: { label: 'Cultural', className: 'bg-primary/20 text-primary' },
      minor_accident: { label: 'Acidente', className: 'bg-status-danger/20 text-status-danger' },
      crisis: { label: 'Crise', className: 'bg-status-danger/20 text-status-danger' },
      contested_cell: { label: 'Contestação', className: 'bg-status-danger/20 text-status-danger' },
      research_complete: { label: 'Pesquisa Completa', className: 'bg-status-success/20 text-status-success' },
    };
    const config = types[type] || { label: type, className: 'bg-muted text-muted-foreground' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (configLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow">Motor de Turnos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o sistema de ciclos automáticos do jogo
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Tick Atual</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                #{worldConfig?.total_ticks || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Dia da Temporada</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-status-warning" />
                {worldConfig?.season_day || 1}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Intervalo</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                {worldConfig?.tick_interval_hours || 24}h
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Último Tick</CardDescription>
              <CardTitle className="text-sm">
                {worldConfig?.last_tick_at
                  ? format(new Date(worldConfig.last_tick_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : 'Nunca executado'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Execute Tick Button */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Executar Tick Manual</CardTitle>
            <CardDescription>
              Execute um ciclo de processamento manualmente para testes. Em produção, isso é feito automaticamente a cada {worldConfig?.tick_interval_hours || 24} horas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <Button
                onClick={() => executeTick.mutate()}
                disabled={isExecuting}
                className="w-full md:w-auto"
                size="lg"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Executar Tick (Admin)
                  </>
                )}
              </Button>

              {/* Dev auto scheduler */}
              <div className="flex items-center gap-3">
                <Switch checked={autoRunDev} onCheckedChange={setAutoRunDev} />
                <span className="text-sm text-muted-foreground">Auto (Dev)</span>
                <Input
                  type="number"
                  min={1}
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-24"
                  placeholder="min"
                />
                <span className="text-xs text-muted-foreground">min entre ticks</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tick Logs */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Histórico de Ticks</CardTitle>
              <CardDescription>Últimos 10 ciclos executados</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tickLogs && tickLogs.length > 0 ? (
                <div className="space-y-3">
                  {tickLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Tick #{log.tick_number}</span>
                          {getStatusBadge(log.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(log.started_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{log.territories_processed} territórios</p>
                        <p>{log.cities_processed} cidades</p>
                        <p>{log.events_generated} eventos</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum tick executado ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Eventos Recentes</CardTitle>
              <CardDescription>Últimos 20 eventos gerados</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : eventLogs && eventLogs.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {eventLogs.map((event) => (
                    <div key={event.id} className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{event.title}</span>
                        {getEventTypeBadge(event.event_type)}
                      </div>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-primary">
                          {(event.territories as { name: string } | null)?.name || 'Global'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum evento gerado ainda</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Como funciona o Motor de Turnos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-foreground mb-2">1. Produção</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cada cidade gera recursos conforme seu perfil</li>
                  <li>População afeta o multiplicador de produção</li>
                  <li>Baixa estabilidade reduz produção em 50%</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">2. Manutenção</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Cada cidade tem custo de manutenção</li>
                  <li>Tesouraria negativa reduz estabilidade</li>
                  <li>Falta de comida/energia causa instabilidade</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">3. Estabilidade</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Estabilidade &lt; 20: chance de crise</li>
                  <li>Estabilidade &lt; 5: células podem ser contestadas</li>
                  <li>Excedente de recursos aumenta estabilidade</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-2">4. Eventos</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>1-3 eventos aleatórios por tick</li>
                  <li>Podem dar bônus ou penalidades</li>
                  <li>Afetam recursos, moeda ou estabilidade</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}