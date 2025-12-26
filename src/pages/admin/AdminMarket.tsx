import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, Wallet, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TokenMarketItem {
  id: string;
  token_type: string;
  price_per_unit: number;
  available_quantity: number;
  total_sold: number;
  is_active: boolean;
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
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  profile?: { username: string | null };
}

export default function AdminMarket() {
  const [tokenMarket, setTokenMarket] = useState<TokenMarketItem[]>([]);
  const [resourceMarket, setResourceMarket] = useState<ResourceMarketItem[]>([]);
  const [wallets, setWallets] = useState<PlayerWallet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [tokenRes, resourceRes, walletsRes] = await Promise.all([
        supabase.from('token_market').select('*').order('token_type'),
        supabase.from('resource_market').select('*').order('resource_type'),
        supabase.from('player_wallets').select('*').order('balance', { ascending: false }).limit(20)
      ]);

      if (tokenRes.data) setTokenMarket(tokenRes.data);
      if (resourceRes.data) setResourceMarket(resourceRes.data);
      
      if (walletsRes.data) {
        // Fetch profiles for wallets
        const userIds = walletsRes.data.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        
        const walletsWithProfiles = walletsRes.data.map(w => ({
          ...w,
          profile: profiles?.find(p => p.id === w.user_id)
        }));
        setWallets(walletsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  }

  const resourceLabels: Record<string, string> = {
    food: 'Alimentos',
    energy: 'Energia',
    minerals: 'Minerais',
    technology: 'Tecnologia',
    influence: 'Influência'
  };

  const tokenLabels: Record<string, string> = {
    city: 'City Token',
    land: 'Land Token',
    state: 'State Token'
  };

  const totalMarketCap = resourceMarket.reduce((sum, r) => sum + (r.current_price * r.supply), 0);
  const totalWalletBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

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
          <h1 className="text-3xl font-display text-glow">Mercado</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da economia do planeta TOI-700
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-primary/30">
            <CardHeader className="pb-2">
              <CardDescription>Capitalização Total</CardDescription>
              <CardTitle className="text-2xl text-glow">
                ₮ {totalMarketCap.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Moeda em Circulação</CardDescription>
              <CardTitle className="text-2xl">
                ₮ {totalWalletBalance.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Recursos no Mercado</CardDescription>
              <CardTitle className="text-2xl">{resourceMarket.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Tokens Disponíveis</CardDescription>
              <CardTitle className="text-2xl">
                {tokenMarket.reduce((sum, t) => sum + t.available_quantity, 0)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Token Market */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Mercado de Tokens
            </CardTitle>
            <CardDescription>
              Tokens podem ser comprados com a moeda do jogo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Vendidos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokenMarket.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">
                      {tokenLabels[token.token_type] || token.token_type}
                    </TableCell>
                    <TableCell className="text-primary font-mono">
                      ₮ {Number(token.price_per_unit).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{token.available_quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{token.total_sold}</TableCell>
                    <TableCell>
                      <Badge className={token.is_active ? 'bg-status-success/20 text-status-success' : 'bg-muted text-muted-foreground'}>
                        {token.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Resource Market */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-primary" />
              Mercado de Recursos
            </CardTitle>
            <CardDescription>
              Preços baseados em oferta e demanda
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
                  const variation = ((Number(resource.current_price) - Number(resource.base_price)) / Number(resource.base_price)) * 100;
                  const Icon = variation > 0 ? TrendingUp : variation < 0 ? TrendingDown : Minus;
                  const variationColor = variation > 0 ? 'text-status-success' : variation < 0 ? 'text-destructive' : 'text-muted-foreground';
                  
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">
                        {resourceLabels[resource.resource_type] || resource.resource_type}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        ₮ {Number(resource.base_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-primary">
                        ₮ {Number(resource.current_price).toFixed(2)}
                      </TableCell>
                      <TableCell className={variationColor}>
                        <div className="flex items-center gap-1">
                          <Icon className="w-4 h-4" />
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
          </CardContent>
        </Card>

        {/* Top Wallets */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Top Carteiras</CardTitle>
            <CardDescription>
              Jogadores com maior saldo de moeda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jogador</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Total Ganho</TableHead>
                  <TableHead>Total Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet, index) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {wallet.profile?.username || 'Anônimo'}
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      ₮ {Number(wallet.balance).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-mono text-status-success">
                      +₮ {Number(wallet.total_earned).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-mono text-destructive">
                      -₮ {Number(wallet.total_spent).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {wallets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma carteira encontrada
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