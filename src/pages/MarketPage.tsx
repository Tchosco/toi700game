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
  Loader2, 
  Wallet, 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ShoppingCart,
  ArrowUpDown,
  Building2,
  MapPin,
  Flag,
  Zap,
  Wheat,
  Gem,
  Cpu,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TokenMarketItem {
  id: string;
  token_type: string;
  price_per_unit: number;
  available_quantity: number;
}

interface ResourceMarketItem {
  id: string;
  resource_type: string;
  base_price: number;
  current_price: number;
  supply: number;
  demand: number;
}

interface PlayerWallet {
  balance: number;
}

interface UserTokens {
  city_tokens: number;
  land_tokens: number;
  state_tokens: number;
}

export default function MarketPage() {
  const { user } = useAuth();
  const [tokenMarket, setTokenMarket] = useState<TokenMarketItem[]>([]);
  const [resourceMarket, setResourceMarket] = useState<ResourceMarketItem[]>([]);
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [userTokens, setUserTokens] = useState<UserTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [selectedToken, setSelectedToken] = useState<TokenMarketItem | null>(null);
  const [isBuyDialogOpen, setIsBuyDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMarketData();
  }, [user]);

  async function fetchMarketData() {
    setLoading(true);
    try {
      const [tokenRes, resourceRes] = await Promise.all([
        supabase.from('token_market').select('*').eq('is_active', true).order('token_type'),
        supabase.from('resource_market').select('*').order('resource_type')
      ]);

      if (tokenRes.data) setTokenMarket(tokenRes.data);
      if (resourceRes.data) setResourceMarket(resourceRes.data);

      if (user) {
        const [walletRes, tokensRes] = await Promise.all([
          supabase.from('player_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_tokens').select('city_tokens, land_tokens, state_tokens').eq('user_id', user.id).maybeSingle()
        ]);

        if (walletRes.data) setWallet(walletRes.data);
        if (tokensRes.data) setUserTokens(tokensRes.data);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleBuyToken() {
    if (!user || !selectedToken || !wallet) return;

    const totalCost = Number(selectedToken.price_per_unit) * buyQuantity;
    
    if (totalCost > Number(wallet.balance)) {
      toast({ title: 'Saldo insuficiente', description: 'Você não tem moeda suficiente para esta compra.', variant: 'destructive' });
      return;
    }

    if (buyQuantity > selectedToken.available_quantity) {
      toast({ title: 'Quantidade indisponível', description: 'Não há tokens suficientes no mercado.', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    try {
      // Update wallet balance
      const newBalance = Number(wallet.balance) - totalCost;
      const { error: walletError } = await supabase
        .from('player_wallets')
        .update({ 
          balance: newBalance,
          total_spent: Number(wallet.balance) + totalCost 
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Update user tokens
      const tokenField = `${selectedToken.token_type}_tokens` as 'city_tokens' | 'land_tokens' | 'state_tokens';
      const currentTokens = userTokens ? userTokens[tokenField] : 0;
      
      const { error: tokenError } = await supabase
        .from('user_tokens')
        .update({ [tokenField]: currentTokens + buyQuantity })
        .eq('user_id', user.id);

      if (tokenError) throw tokenError;

      // Update market availability
      const { error: marketError } = await supabase
        .from('token_market')
        .update({ 
          available_quantity: selectedToken.available_quantity - buyQuantity,
          total_sold: (selectedToken as any).total_sold + buyQuantity
        })
        .eq('id', selectedToken.id);

      if (marketError) throw marketError;

      // Record purchase
      const { error: purchaseError } = await supabase
        .from('token_purchases')
        .insert({
          user_id: user.id,
          token_type: selectedToken.token_type,
          quantity: buyQuantity,
          price_paid: totalCost
        });

      if (purchaseError) throw purchaseError;

      toast({ 
        title: 'Compra realizada!', 
        description: `Você comprou ${buyQuantity} ${tokenLabels[selectedToken.token_type]?.name || selectedToken.token_type} por ₮${totalCost.toLocaleString('pt-BR')}.`
      });

      setIsBuyDialogOpen(false);
      setBuyQuantity(1);
      setSelectedToken(null);
      fetchMarketData();
    } catch (error: any) {
      toast({ title: 'Erro na compra', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  }

  const tokenLabels: Record<string, { name: string; description: string; icon: typeof Coins; color: string }> = {
    city: { 
      name: 'City Token', 
      description: 'Permite fundar 1 cidade',
      icon: Building2, 
      color: 'text-blue-400' 
    },
    land: { 
      name: 'Land Token', 
      description: 'Permite colonizar 1 célula rural',
      icon: MapPin, 
      color: 'text-green-400' 
    },
    state: { 
      name: 'State Token', 
      description: 'Permite criar oficialmente um país',
      icon: Flag, 
      color: 'text-purple-400' 
    }
  };

  const resourceLabels: Record<string, { name: string; icon: typeof Wheat; color: string }> = {
    food: { name: 'Alimentos', icon: Wheat, color: 'text-green-400' },
    energy: { name: 'Energia', icon: Zap, color: 'text-yellow-400' },
    minerals: { name: 'Minerais', icon: Gem, color: 'text-orange-400' },
    technology: { name: 'Tecnologia', icon: Cpu, color: 'text-blue-400' },
    influence: { name: 'Influência', icon: Users, color: 'text-purple-400' }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-display text-glow">Mercado Planetário</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Compre tokens territoriais e negocie recursos para expandir seu território em TOI-700
          </p>
        </div>

        {/* User Wallet */}
        {user ? (
          <Card className="glass-card border-primary/30">
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Wallet className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sua Carteira</p>
                    <p className="text-2xl font-display text-glow">
                      ₮ {wallet ? Number(wallet.balance).toLocaleString('pt-BR') : '0'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">City Tokens</p>
                    <p className="text-xl font-bold text-blue-400">{userTokens?.city_tokens || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Land Tokens</p>
                    <p className="text-xl font-bold text-green-400">{userTokens?.land_tokens || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">State Tokens</p>
                    <p className="text-xl font-bold text-purple-400">{userTokens?.state_tokens || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-card">
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-4">
                Faça login para comprar tokens e negociar recursos
              </p>
              <Link to="/auth">
                <Button>Entrar</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="tokens" className="gap-2">
              <Coins className="w-4 h-4" />
              Tokens
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Recursos
            </TabsTrigger>
          </TabsList>

          {/* Token Market */}
          <TabsContent value="tokens">
            <div className="grid md:grid-cols-3 gap-6">
              {tokenMarket.map((token) => {
                const config = tokenLabels[token.token_type] || { 
                  name: token.token_type, 
                  description: '', 
                  icon: Coins, 
                  color: 'text-muted-foreground' 
                };
                const Icon = config.icon;
                const canBuy = user && wallet && Number(wallet.balance) >= Number(token.price_per_unit) && token.available_quantity > 0;

                return (
                  <Card key={token.id} className="glass-card hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-muted/50 ${config.color}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{config.name}</CardTitle>
                          <CardDescription>{config.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="text-2xl font-display text-primary">
                          ₮ {Number(token.price_per_unit).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Disponível</span>
                        <Badge variant="outline" className={token.available_quantity > 10 ? 'text-status-success' : 'text-status-warning'}>
                          {token.available_quantity} unidades
                        </Badge>
                      </div>
                      <Dialog open={isBuyDialogOpen && selectedToken?.id === token.id} onOpenChange={(open) => {
                        setIsBuyDialogOpen(open);
                        if (!open) {
                          setSelectedToken(null);
                          setBuyQuantity(1);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            className="w-full" 
                            disabled={!canBuy}
                            onClick={() => setSelectedToken(token)}
                          >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            {!user ? 'Faça login' : token.available_quantity === 0 ? 'Esgotado' : 'Comprar'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Comprar {config.name}</DialogTitle>
                            <DialogDescription>
                              Confirme a quantidade que deseja comprar
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                              <Label>Quantidade</Label>
                              <Input
                                type="number"
                                min={1}
                                max={token.available_quantity}
                                value={buyQuantity}
                                onChange={(e) => setBuyQuantity(Math.max(1, Math.min(token.available_quantity, parseInt(e.target.value) || 1)))}
                              />
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Preço unitário</span>
                                <span>₮ {Number(token.price_per_unit).toLocaleString('pt-BR')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Quantidade</span>
                                <span>× {buyQuantity}</span>
                              </div>
                              <div className="border-t border-border pt-2 flex justify-between font-bold">
                                <span>Total</span>
                                <span className="text-primary">
                                  ₮ {(Number(token.price_per_unit) * buyQuantity).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              {wallet && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Saldo após compra</span>
                                  <span className={Number(wallet.balance) - (Number(token.price_per_unit) * buyQuantity) < 0 ? 'text-destructive' : 'text-status-success'}>
                                    ₮ {(Number(wallet.balance) - (Number(token.price_per_unit) * buyQuantity)).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBuyDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleBuyToken} 
                              disabled={processing || !wallet || Number(wallet.balance) < Number(token.price_per_unit) * buyQuantity}
                            >
                              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
                              Confirmar Compra
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Resource Market */}
          <TabsContent value="resources">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Mercado de Recursos
                </CardTitle>
                <CardDescription>
                  Preços baseados em oferta e demanda global do planeta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recurso</TableHead>
                      <TableHead>Preço Base</TableHead>
                      <TableHead>Preço Atual</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Oferta</TableHead>
                      <TableHead>Demanda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resourceMarket.map((resource) => {
                      const config = resourceLabels[resource.resource_type] || { 
                        name: resource.resource_type, 
                        icon: Gem, 
                        color: 'text-muted-foreground' 
                      };
                      const Icon = config.icon;
                      const variation = ((Number(resource.current_price) - Number(resource.base_price)) / Number(resource.base_price)) * 100;
                      const TrendIcon = variation > 0 ? TrendingUp : variation < 0 ? TrendingDown : Minus;
                      const variationColor = variation > 0 ? 'text-status-success' : variation < 0 ? 'text-destructive' : 'text-muted-foreground';

                      return (
                        <TableRow key={resource.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${config.color}`} />
                              <span className="font-medium">{config.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            ₮ {Number(resource.base_price).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-primary font-bold">
                            ₮ {Number(resource.current_price).toFixed(2)}
                          </TableCell>
                          <TableCell className={variationColor}>
                            <div className="flex items-center gap-1">
                              <TrendIcon className="w-4 h-4" />
                              {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                            </div>
                          </TableCell>
                          <TableCell>{Number(resource.supply).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{Number(resource.demand).toLocaleString('pt-BR')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    O sistema de ordens de compra e venda de recursos estará disponível em breve.
                    Por enquanto, recursos são produzidos e consumidos automaticamente pelos territórios.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Como Funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Coins className="w-5 h-5" />
                  <h3 className="font-medium">Tokens</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tokens são necessários para expandir seu território. City Tokens fundam cidades, 
                  Land Tokens colonizam células rurais, e State Tokens criam países oficiais.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Wallet className="w-5 h-5" />
                  <h3 className="font-medium">Moeda</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  A moeda do jogo (₮) é obtida através de boa administração territorial, 
                  produção de recursos, comércio e participação em eventos planetários.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <ArrowUpDown className="w-5 h-5" />
                  <h3 className="font-medium">Recursos</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Recursos são produzidos pelas cidades e zonas rurais. Os preços variam 
                  conforme oferta e demanda global do planeta.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}