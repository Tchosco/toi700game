import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Swords, Handshake, ShoppingBag, Flag, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DiplomacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wars, setWars] = useState<any[]>([]);
  const [tradeDeals, setTradeDeals] = useState<any[]>([]);
  const [cellsForSale, setCellsForSale] = useState<any[]>([]);
  const [myTerritory, setMyTerritory] = useState<any>(null);

  useEffect(() => { fetchData(); }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [warsRes, dealsRes, salesRes] = await Promise.all([
        supabase.from('wars').select('*, attacker:territories!wars_attacker_id_fkey(name), defender:territories!wars_defender_id_fkey(name)').in('status', ['declared', 'active']).order('created_at', { ascending: false }),
        supabase.from('trade_deals').select('*, from_territory:territories!trade_deals_from_territory_id_fkey(name), to_territory:territories!trade_deals_to_territory_id_fkey(name)').eq('status', 'proposed').order('created_at', { ascending: false }),
        supabase.from('territory_transfers').select('*, cells(id, region_id), from_territory:territories!territory_transfers_from_territory_id_fkey(name)').eq('transfer_type', 'sale_pending'),
      ]);

      if (warsRes.data) setWars(warsRes.data);
      if (dealsRes.data) setTradeDeals(dealsRes.data);
      if (salesRes.data) setCellsForSale(salesRes.data);

      if (user) {
        const { data: territory } = await supabase.from('territories').select('*').eq('owner_id', user.id).eq('status', 'active').limit(1).maybeSingle();
        setMyTerritory(territory);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptDeal(dealId: string) {
    try {
      const res = await supabase.functions.invoke('execute-trade-deal', { body: { action: 'accept', deal_id: dealId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Sucesso!', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  async function handleRejectDeal(dealId: string) {
    try {
      const res = await supabase.functions.invoke('execute-trade-deal', { body: { action: 'reject', deal_id: dealId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Rejeitado', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  async function handleSurrender(warId: string) {
    if (!confirm('Tem certeza? Você perderá todas as células em disputa.')) return;
    try {
      const res = await supabase.functions.invoke('declare-war', { body: { action: 'surrender', war_id: warId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Rendição', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  if (loading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display text-glow">Diplomacia & Guerra</h1>
          <p className="text-muted-foreground">Gerencie relações, trocas e conflitos</p>
        </div>

        <Tabs defaultValue="wars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="wars"><Swords className="w-4 h-4 mr-2" />Guerras</TabsTrigger>
            <TabsTrigger value="trades"><Handshake className="w-4 h-4 mr-2" />Trocas</TabsTrigger>
            <TabsTrigger value="sales"><ShoppingBag className="w-4 h-4 mr-2" />Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="wars">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />Guerras Ativas</CardTitle>
                <CardDescription>Conflitos são resolvidos por turnos. A cada tick, poder militar é calculado.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Atacante</TableHead><TableHead>Defensor</TableHead><TableHead>Células</TableHead><TableHead>Ciclos</TableHead><TableHead>Placar</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {wars.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma guerra ativa</TableCell></TableRow> :
                      wars.map((war) => {
                        const isParticipant = myTerritory && (war.attacker_id === myTerritory.id || war.defender_id === myTerritory.id);
                        return (
                          <TableRow key={war.id}>
                            <TableCell className="font-medium">{war.attacker?.name}</TableCell>
                            <TableCell>{war.defender?.name}</TableCell>
                            <TableCell>{(war.target_cells as string[])?.length || 0}</TableCell>
                            <TableCell>{war.cycles_elapsed}/{war.max_cycles}</TableCell>
                            <TableCell><span className="text-green-400">{war.attacker_war_score}</span> / <span className="text-red-400">{war.defender_war_score}</span></TableCell>
                            <TableCell>{isParticipant && <Button size="sm" variant="destructive" onClick={() => handleSurrender(war.id)}>Render-se</Button>}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="glass-card">
              <CardHeader><CardTitle>Propostas de Troca</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Oferta</TableHead><TableHead>Pedido</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tradeDeals.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma proposta pendente</TableCell></TableRow> :
                      tradeDeals.map((deal) => {
                        const isRecipient = deal.to_user_id === user?.id;
                        return (
                          <TableRow key={deal.id}>
                            <TableCell>{deal.from_territory?.name}</TableCell>
                            <TableCell>{deal.to_territory?.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{JSON.stringify(deal.offer).slice(0, 30)}...</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{JSON.stringify(deal.request).slice(0, 30)}...</TableCell>
                            <TableCell className="space-x-2">
                              {isRecipient && <>
                                <Button size="sm" onClick={() => handleAcceptDeal(deal.id)}>Aceitar</Button>
                                <Button size="sm" variant="outline" onClick={() => handleRejectDeal(deal.id)}>Rejeitar</Button>
                              </>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card className="glass-card">
              <CardHeader><CardTitle>Células à Venda</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead>Célula</TableHead><TableHead>Preço</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cellsForSale.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma célula à venda</TableCell></TableRow> :
                      cellsForSale.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.from_territory?.name}</TableCell>
                          <TableCell className="font-mono text-xs">{sale.cell_id?.slice(0, 8)}...</TableCell>
                          <TableCell className="text-primary font-bold">₮{Number(sale.price).toLocaleString('pt-BR')}</TableCell>
                          <TableCell><Badge variant="outline">À venda</Badge></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
