import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Handshake, Trash2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  proposed: 'bg-yellow-500',
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  completed: 'bg-blue-500',
  cancelled: 'bg-gray-500',
};

const statusLabels: Record<string, string> = {
  proposed: 'Proposta',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export default function AdminTradeDeals() {
  const queryClient = useQueryClient();

  const { data: deals, isLoading } = useQuery({
    queryKey: ['admin-trade-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_deals')
        .select(`
          *,
          from_territory:territories!trade_deals_from_territory_id_fkey(name),
          to_territory:territories!trade_deals_to_territory_id_fkey(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trade_deals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trade-deals'] });
      toast.success('Negociação excluída!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const formatDealContent = (content: any) => {
    if (!content || Object.keys(content).length === 0) return '-';
    return Object.entries(content)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Handshake className="w-8 h-8 text-primary" />
            Negociações Diretas
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize todas as trocas diretas entre territórios
          </p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Todas as Negociações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : deals && deals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead></TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <Badge className={statusColors[deal.status]}>
                          {statusLabels[deal.status] || deal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{deal.from_territory?.name || '-'}</TableCell>
                      <TableCell>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell>{deal.to_territory?.name || '-'}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">
                        {formatDealContent(deal.offer)}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">
                        {formatDealContent(deal.request)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(deal.created_at), 'dd/MM/yy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(deal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma negociação registrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
