import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, FileText, CheckCircle, XCircle, Gavel, Plus, Trash } from 'lucide-react';

interface LegalHistoryEntry {
  id: string;
  law_id: string;
  action: string;
  description: string;
  old_status: string;
  new_status: string;
  performed_by: string;
  territory_id: string;
  bloc_id: string;
  created_at: string;
  laws?: { name: string; legal_level: string };
  territories?: { name: string };
}

export default function LegalHistoryPage() {
  const [history, setHistory] = useState<LegalHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('legal_history')
        .select(`
          *,
          laws (name, legal_level),
          territories (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) {
        setHistory(data as LegalHistoryEntry[]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'enacted':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'repealed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'proposed':
        return <Plus className="h-4 w-4 text-blue-500" />;
      case 'vetoed':
        return <Trash className="h-4 w-4 text-red-500" />;
      default:
        return <Gavel className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      enacted: 'Promulgada',
      repealed: 'Revogada',
      proposed: 'Proposta',
      vetoed: 'Vetada',
      amended: 'Emendada'
    };
    return labels[action] || action;
  };

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      planetary: 'bg-amber-500',
      bloc: 'bg-blue-500',
      national: 'bg-green-500'
    };
    const labels: Record<string, string> = {
      planetary: 'Planetária',
      bloc: 'Bloco',
      national: 'Nacional'
    };
    return (
      <Badge className={colors[level] || 'bg-muted'}>
        {labels[level] || level}
      </Badge>
    );
  };

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(h => h.laws?.legal_level === filter);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Histórico Legal</h1>
              <p className="text-muted-foreground">Registro de todas as ações legislativas</p>
            </div>
          </div>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Níveis</SelectItem>
              <SelectItem value="planetary">Planetárias</SelectItem>
              <SelectItem value="bloc">De Bloco</SelectItem>
              <SelectItem value="national">Nacionais</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ações Recentes</CardTitle>
            <CardDescription>Últimas 100 ações legislativas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((entry) => (
                    <div 
                      key={entry.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-1">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium">{entry.laws?.name || 'Lei Removida'}</span>
                          {entry.laws?.legal_level && getLevelBadge(entry.laws.legal_level)}
                          <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {entry.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                          {entry.territories?.name && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {entry.territories.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
