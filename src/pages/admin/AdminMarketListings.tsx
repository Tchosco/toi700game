import AdminLayout from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Trash2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const resourceLabels: Record<string, string> = {
  food: 'Alimentos',
  energy: 'Energia',
  minerals: 'Minerais',
  tech: 'Tecnologia',
  token_city: 'Token Cidade',
  token_land: 'Token Terra',
  token_state: 'Token Estado',
};

const statusColors: Record<string, string> = {
  open: 'bg-green-500',
  partially_filled: 'bg-yellow-500',
  filled: 'bg-blue-500',
  cancelled: 'bg-gray-500',
};

export default function AdminMarketListings() {
  const queryClient = useQueryClient();

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-market-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select(`
          *,
          seller_territory:territories(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('market_listings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-market-listings'] });
      toast.success('Listagem cancelada!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('market_listings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-market-listings'] });
      toast.success('Listagem excluída!');
    },
    onError: (error) => toast.error('Erro: ' + error.message),
  });

  const openListings = listings?.filter((l) => l.status === 'open') || [];
  const closedListings = listings?.filter((l) => l.status !== 'open') || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-primary" />
            Listagens do Mercado
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todas as ofertas de compra e venda
          </p>
        </div>

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Abertas ({openListings.length})</TabsTrigger>
            <TabsTrigger value="closed">Fechadas ({closedListings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Listagens Abertas</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : openListings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço/Un</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openListings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Badge variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}>
                              {listing.listing_type === 'sell' ? 'Venda' : 'Compra'}
                            </Badge>
                          </TableCell>
                          <TableCell>{resourceLabels[listing.resource_type] || listing.resource_type}</TableCell>
                          <TableCell>
                            {listing.filled_quantity}/{listing.quantity}
                          </TableCell>
                          <TableCell>₮{Number(listing.price_per_unit).toFixed(2)}</TableCell>
                          <TableCell>{listing.seller_territory?.name || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(listing.created_at), 'dd/MM/yy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelMutation.mutate(listing.id)}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => deleteMutation.mutate(listing.id)}
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
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma listagem aberta
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Listagens Fechadas</CardTitle>
              </CardHeader>
              <CardContent>
                {closedListings.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço/Un</TableHead>
                        <TableHead>Vendedor</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedListings.map((listing) => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Badge className={statusColors[listing.status]}>
                              {listing.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={listing.listing_type === 'sell' ? 'default' : 'secondary'}>
                              {listing.listing_type === 'sell' ? 'Venda' : 'Compra'}
                            </Badge>
                          </TableCell>
                          <TableCell>{resourceLabels[listing.resource_type] || listing.resource_type}</TableCell>
                          <TableCell>
                            {listing.filled_quantity}/{listing.quantity}
                          </TableCell>
                          <TableCell>₮{Number(listing.price_per_unit).toFixed(2)}</TableCell>
                          <TableCell>{listing.seller_territory?.name || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(listing.id)}
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
                    Nenhuma listagem fechada
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
