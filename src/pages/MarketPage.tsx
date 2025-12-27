import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Wallet, Coins, TrendingUp, TrendingDown, Minus, ShoppingCart, ArrowUpDown,
  Building2, MapPin, Flag, Zap, Wheat, Gem, Cpu, Plus, X, History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MarketListing {
  id: string;
  listing_type: 'sell' | 'buy';
  resource_type: string;
  quantity: number;
  filled_quantity: number;
  price_per_unit: number;
  status: string;
  seller_user_id: string;
  seller_territory_id: string | null;
  created_at: string;
  territories?: { name: string } | null;
}

interface TradeHistory {
  id: string;
  resource_type: string;
  quantity: number;
  price_per_unit: number;
  total_price: number;
  buyer_user_id: string;
  seller_user_id: string;
  created_at: string;
}

const resourceLabels: Record<string, { name: string; icon: typeof Wheat; color: string }> = {
  food: { name: 'Alimentos', icon: Wheat, color: 'text-green-400' },
  energy: { name: 'Energia', icon: Zap, color: 'text-yellow-400' },
  minerals: { name: 'Minerais', icon: Gem, color: 'text-orange-400' },
  tech: { name: 'Tecnologia', icon: Cpu, color: 'text-blue-400' },
  token_city: { name: 'City Token', icon: Building2, color: 'text-blue-400' },
  token_land: { name: 'Land Token', icon: MapPin, color: 'text-green-400' },
  token_state: { name: 'State Token', icon: Flag, color: 'text-purple-400' },
};

const [avgPrices, setAvgPrices] = useState<Record<string, number>>({});

export default function MarketPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [userTokens, setUserTokens] = useState<{ city_tokens: number; land_tokens: number; state_tokens: number } | null>(null);
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [sellOrders, setSellOrders] = useState<MarketListing[]>([]);
  const [buyOrders, setBuyOrders] = useState<MarketListing[]>([]);
  const [myOrders, setMyOrders] = useState<MarketListing[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Order form state
  const [orderType, setOrderType] = useState<'sell' | 'buy'>('sell');
  const [resourceType, setResourceType] = useState('food');
  const [quantity, setQuantity] = useState(1);
  const [pricePerUnit, setPricePerUnit] = useState(10);
  const [selectedTerritory, setSelectedTerritory] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    try {
      const [sellRes, buyRes] = await Promise.all([
        supabase.from('market_listings').select('*, territories(name)').eq('listing_type', 'sell').in('status', ['open', 'partially_filled']).order('price_per_unit', { ascending: true }),
        supabase.from('market_listings').select('*, territories(name)').eq('listing_type', 'buy').in('status', ['open', 'partially_filled']).order('price_per_unit', { ascending: false }),
      ]);

      if (sellRes.data) setSellOrders(sellRes.data as MarketListing[]);
      if (buyRes.data) setBuyOrders(buyRes.data as MarketListing[]);

      if (user) {
        const [walletRes, tokensRes, territoriesRes, myOrdersRes, historyRes] = await Promise.all([
          supabase.from('player_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_tokens').select('city_tokens, land_tokens, state_tokens').eq('user_id', user.id).maybeSingle(),
          supabase.from('territories').select('id, name').eq('owner_id', user.id),
          supabase.from('market_listings').select('*, territories(name)').eq('seller_user_id', user.id).in('status', ['open', 'partially_filled']).order('created_at', { ascending: false }),
          supabase.from('trade_history').select('*').or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(20),
        ]);

        if (walletRes.data) setWallet(walletRes.data);
        if (tokensRes.data) setUserTokens(tokensRes.data);
        if (territoriesRes.data) setTerritories(territoriesRes.data);
        if (myOrdersRes.data) setMyOrders(myOrdersRes.data as MarketListing[]);
        if (historyRes.data) setTradeHistory(historyRes.data);
        if (territoriesRes.data?.length) setSelectedTerritory(territoriesRes.data[0].id);
      }

      // compute average prices from last 24h trades
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentTrades } = await supabase
        .from('trade_history')
        .select('resource_type, price_per_unit')
        .gte('created_at', since);

      const acc: Record<string, { sum: number; count: number }> = {};
      for (const tr of recentTrades || []) {
        const key = tr.resource_type;
        acc[key] = acc[key] || { sum: 0, count: 0 };
        acc[key].sum += Number(tr.price_per_unit || 0);
        acc[key].count += 1;
      }
      const avg: Record<string, number> = {};
      Object.keys(acc).forEach((k) => {
        avg[k] = acc[k].count > 0 ? acc[k].sum / acc[k].count : 0;
      });
      setAvgPrices(avg);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrder() {
    if (!user) return;
    setProcessing(true);
    try {
      const session = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('create-market-order', {
        body: { listing_type: orderType, resource_type: resourceType, quantity, price_per_unit: pricePerUnit, territory_id: resourceType.startsWith('token_') ? null : selectedTerritory },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Sucesso!', description: response.data.message });
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelOrder(listingId: string) {
    setProcessing(true);
    try {
      const response = await supabase.functions.invoke('cancel-market-order', { body: { listing_id: listingId } });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Sucesso!', description: response.data.message });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Preço Médio do Dia</CardTitle>
            <CardDescription>Média dos últimos trades (24h)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['food','energy','minerals','tech'].map((res) => {
              const cfg = resourceLabels[res];
              const price = avgPrices[res] || 0;
              const Icon = cfg.icon;
              return (
                <div key={res} className="p-3 rounded bg-muted/40 flex items-center justify-between">
                  <div className={`flex items-center gap-2 ${cfg.color}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{cfg.name}</span>
                  </div>
                  <span className="font-bold">₮{price > 0 ? price.toFixed(2) : '-'}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-display text-glow">Mercado Planetário</h1>
            <p className="text-muted-foreground">Negocie recursos e tokens com outros jogadores</p>
          </div>
          {user && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Criar Ordem</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Ordem de Mercado</DialogTitle>
                  <DialogDescription>Crie uma ordem de compra ou venda</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={orderType} onValueChange={(v: 'sell' | 'buy') => setOrderType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sell">Vender</SelectItem>
                          <SelectItem value="buy">Comprar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Recurso/Token</Label>
                      <Select value={resourceType} onValueChange={setResourceType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(resourceLabels).map(([key, { name }]) => (
                            <SelectItem key={key} value={key}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!resourceType.startsWith('token_') && territories.length > 0 && (
                    <div className="space-y-2">
                      <Label>Território</Label>
                      <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {territories.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantidade</Label>
                      <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Preço por Unidade (₮)</Label>
                      <Input type="number" min={1} value={pricePerUnit} onChange={(e) => setPricePerUnit(Math.max(1, parseFloat(e.target.value) || 1))} />
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">₮ {(quantity * pricePerUnit).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateOrder} disabled={processing}>
                    {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar Ordem
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {user && wallet && (
          <Card className="glass-card border-primary/30">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className="text-2xl font-display text-glow">₮ {Number(wallet.balance).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center"><p className="text-xs text-muted-foreground">City</p><p className="text-xl font-bold text-blue-400">{userTokens?.city_tokens || 0}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Land</p><p className="text-xl font-bold text-green-400">{userTokens?.land_tokens || 0}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">State</p><p className="text-xl font-bold text-purple-400">{userTokens?.state_tokens || 0}</p></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="orderbook" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="orderbook"><ArrowUpDown className="w-4 h-4 mr-2" />Book</TabsTrigger>
            <TabsTrigger value="myorders"><Coins className="w-4 h-4 mr-2" />Minhas</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="orderbook">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="glass-card border-green-500/30">
                <CardHeader><CardTitle className="text-green-400">Ordens de Venda</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Recurso</TableHead><TableHead>Qtd</TableHead><TableHead>Preço</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {sellOrders.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma ordem</TableCell></TableRow> :
                        sellOrders.slice(0, 10).map((order) => {
                          const config = resourceLabels[order.resource_type];
                          const Icon = config?.icon || Gem;
                          return (
                            <TableRow key={order.id}>
                              <TableCell><div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${config?.color}`} />{config?.name}</div></TableCell>
                              <TableCell>{Number(order.quantity) - Number(order.filled_quantity)}</TableCell>
                              <TableCell className="text-green-400">₮{Number(order.price_per_unit).toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="glass-card border-red-500/30">
                <CardHeader><CardTitle className="text-red-400">Ordens de Compra</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Recurso</TableHead><TableHead>Qtd</TableHead><TableHead>Preço</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {buyOrders.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma ordem</TableCell></TableRow> :
                        buyOrders.slice(0, 10).map((order) => {
                          const config = resourceLabels[order.resource_type];
                          const Icon = config?.icon || Gem;
                          return (
                            <TableRow key={order.id}>
                              <TableCell><div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${config?.color}`} />{config?.name}</div></TableCell>
                              <TableCell>{Number(order.quantity) - Number(order.filled_quantity)}</TableCell>
                              <TableCell className="text-red-400">₮{Number(order.price_per_unit).toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="myorders">
            <Card className="glass-card">
              <CardHeader><CardTitle>Minhas Ordens Ativas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Recurso</TableHead><TableHead>Qtd</TableHead><TableHead>Preço</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {myOrders.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma ordem ativa</TableCell></TableRow> :
                      myOrders.map((order) => {
                        const config = resourceLabels[order.resource_type];
                        return (
                          <TableRow key={order.id}>
                            <TableCell><Badge variant={order.listing_type === 'sell' ? 'default' : 'secondary'}>{order.listing_type === 'sell' ? 'Venda' : 'Compra'}</Badge></TableCell>
                            <TableCell>{config?.name}</TableCell>
                            <TableCell>{Number(order.filled_quantity)}/{Number(order.quantity)}</TableCell>
                            <TableCell>₮{Number(order.price_per_unit).toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline">{order.status}</Badge></TableCell>
                            <TableCell><Button size="sm" variant="ghost" onClick={() => handleCancelOrder(order.id)} disabled={processing}><X className="w-4 h-4" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="glass-card">
              <CardHeader><CardTitle>Histórico de Trades</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Recurso</TableHead><TableHead>Qtd</TableHead><TableHead>Preço</TableHead><TableHead>Total</TableHead><TableHead>Tipo</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tradeHistory.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum trade registrado</TableCell></TableRow> :
                      tradeHistory.map((trade) => {
                        const config = resourceLabels[trade.resource_type];
                        const isBuyer = trade.buyer_user_id === user?.id;
                        return (
                          <TableRow key={trade.id}>
                            <TableCell className="text-muted-foreground">{format(new Date(trade.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                            <TableCell>{config?.name}</TableCell>
                            <TableCell>{Number(trade.quantity)}</TableCell>
                            <TableCell>₮{Number(trade.price_per_unit).toFixed(2)}</TableCell>
                            <TableCell className="font-bold">₮{Number(trade.total_price).toLocaleString('pt-BR')}</TableCell>
                            <TableCell><Badge variant={isBuyer ? 'default' : 'secondary'}>{isBuyer ? 'Compra' : 'Venda'}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
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