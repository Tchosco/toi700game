import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, FileText, Handshake, Users, Gavel, Globe } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_ICONS: Record<string, any> = {
  'proposal_created': FileText,
  'proposal_approved': Gavel,
  'proposal_rejected': Gavel,
  'treaty_signed': Handshake,
  'bloc_created': Users,
  'law_enacted': Gavel,
  'default': Globe,
};

const EVENT_COLORS: Record<string, string> = {
  'proposal_approved': 'bg-green-500/20 text-green-500',
  'proposal_rejected': 'bg-red-500/20 text-red-500',
  'treaty_signed': 'bg-blue-500/20 text-blue-500',
  'bloc_created': 'bg-purple-500/20 text-purple-500',
  'law_enacted': 'bg-amber-500/20 text-amber-500',
  'default': 'bg-muted text-muted-foreground',
};

export default function DiplomaticHistoryPage() {
  // Fetch diplomatic history
  const { data: history, isLoading } = useQuery({
    queryKey: ['diplomatic-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diplomatic_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch related territories for display
  const { data: territories } = useQuery({
    queryKey: ['all-territories-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const getTerritoryName = (id: string) => {
    return territories?.find(t => t.id === id)?.name || 'Desconhecido';
  };

  // Fetch recent proposals for history
  const { data: proposals } = useQuery({
    queryKey: ['recent-proposals-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formal_proposals')
        .select(`
          *,
          territories:proposer_territory_id(name)
        `)
        .in('status', ['approved', 'rejected', 'executed'])
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent treaties
  const { data: treaties } = useQuery({
    queryKey: ['recent-treaties-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treaties')
        .select(`
          *,
          territory_a:territory_a_id(name),
          territory_b:territory_b_id(name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Histórico Diplomático
          </h1>
          <p className="text-muted-foreground mt-1">
            Registro permanente de todas as decisões diplomáticas do planeta
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
                <CardDescription>Eventos diplomáticos em ordem cronológica</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : history && history.length > 0 ? (
                  <div className="space-y-4">
                    {history.map((event, index) => {
                      const Icon = EVENT_ICONS[event.event_type] || EVENT_ICONS.default;
                      const color = EVENT_COLORS[event.event_type] || EVENT_COLORS.default;
                      
                      return (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            {index < history.length - 1 && (
                              <div className="w-px h-full bg-border/50 my-2" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{event.title}</h3>
                              <Badge variant="outline" className="text-xs">
                                {event.event_type.replace('_', ' ')}
                              </Badge>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                            )}
                            {event.involved_territories && event.involved_territories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {event.involved_territories.map((tid: string) => (
                                  <Badge key={tid} variant="secondary" className="text-xs">
                                    {getTerritoryName(tid)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum evento diplomático registrado ainda.</p>
                    <p className="text-sm mt-2">Eventos serão registrados quando propostas forem aprovadas ou tratados assinados.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Recent Proposals */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  Propostas Decididas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {proposals && proposals.length > 0 ? (
                  proposals.slice(0, 5).map(proposal => (
                    <div key={proposal.id} className="p-2 rounded bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          className={proposal.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}
                        >
                          {proposal.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{proposal.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(proposal.territories as any)?.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma proposta decidida.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Treaties */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  Tratados Ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {treaties && treaties.length > 0 ? (
                  treaties.slice(0, 5).map(treaty => (
                    <div key={treaty.id} className="p-2 rounded bg-muted/30">
                      <p className="text-sm font-medium">{treaty.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(treaty.territory_a as any)?.name} ↔ {(treaty.territory_b as any)?.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum tratado ativo.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de eventos</span>
                  <span className="font-medium">{history?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Propostas aprovadas</span>
                  <span className="font-medium text-green-500">
                    {proposals?.filter(p => p.status === 'approved').length || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tratados ativos</span>
                  <span className="font-medium text-blue-500">{treaties?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
