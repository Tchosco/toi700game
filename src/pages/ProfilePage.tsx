"use client";

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Building2, Coins, Map, Wallet, History, Crown, 
  Leaf, Zap, Mountain, Cpu, Vote, ArrowUpRight, ArrowDownRight,
  Globe, Shield, TrendingUp, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProfileHeader from "@/components/profile/ProfileHeader";
import QuickStats from "@/components/profile/QuickStats";
import TerritoriesGrid from "@/components/profile/TerritoriesGrid";
import TokensPanel from "@/components/profile/TokensPanel";
import ResourcesSummary from "@/components/profile/ResourcesSummary";
import Transactions from "@/components/profile/Transactions";

const resourceIcons: Record<string, React.ElementType> = {
  food: Leaf,
  energy: Zap,
  minerals: Mountain,
  technology: Cpu,
  influence: Vote,
};

const resourceLabels: Record<string, string> = {
  food: 'Alimentos',
  energy: 'Energia',
  minerals: 'Minerais',
  technology: 'Tecnologia',
  influence: 'Influência',
};

const tokenLabels: Record<string, string> = {
  city: 'City Token',
  land: 'Land Token',
  state: 'State Token',
};

const tokenIcons: Record<string, React.ElementType> = {
  city: Building2,
  land: Map,
  state: Globe,
};

const levelLabels: Record<string, string> = {
  colony: 'Colônia',
  autonomous: 'Autônomo',
  recognized: 'Reconhecido',
  kingdom: 'Reino',
  power: 'Potência',
};

const levelColors: Record<string, string> = {
  colony: 'bg-gray-500',
  autonomous: 'bg-blue-500',
  recognized: 'bg-green-500',
  kingdom: 'bg-purple-500',
  power: 'bg-yellow-500',
};

// ADD: Explicit type for territories with nested aliases
type MyTerritory = {
  id: string;
  name: string;
  level: keyof typeof levelLabels;
  government_type: string;
  stability: number;
  economy_rating: number;
  pd_points: number;
  pi_points: number;
  region?: { name?: string } | null;
  capital?: { name?: string } | null;
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch wallet data
  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('player_wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch tokens
  const { data: tokens } = useQuery({
    queryKey: ['tokens', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Fetch territories
  const { data: territories } = useQuery<MyTerritory[]>({
    queryKey: ['user-territories', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from('territories')
        .select(`
          id, name, level, government_type, stability, economy_rating, pd_points, pi_points,
          region:regions(name),
          capital:cities!territories_capital_city_id_fkey(name)
        `)
        .eq('owner_id', user.id);
      return (data || []) as MyTerritory[];
    },
    enabled: !!user,
  });

  // Fetch territory resources (for all user territories)
  const { data: resources } = useQuery({
    queryKey: ['user-resources', user?.id],
    queryFn: async () => {
      if (!user || !territories?.length) return [];
      const territoryIds = territories.map(t => t.id);
      const { data } = await supabase
        .from('territory_resources')
        .select('*')
        .in('territory_id', territoryIds);
      return data || [];
    },
    enabled: !!user && !!territories?.length,
  });

  // Fetch currency transactions
  const { data: currencyTransactions } = useQuery({
    queryKey: ['currency-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('currency_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch token transactions
  const { data: tokenTransactions } = useQuery({
    queryKey: ['token-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  // Aggregate resources by type
  const aggregatedResources = resources?.reduce((acc, res) => {
    if (!acc[res.resource_type]) {
      acc[res.resource_type] = { amount: 0, production: 0, consumption: 0 };
    }
    acc[res.resource_type].amount += Number(res.amount);
    acc[res.resource_type].production += Number(res.production_rate);
    acc[res.resource_type].consumption += Number(res.consumption_rate);
    return acc;
  }, {} as Record<string, { amount: number; production: number; consumption: number }>);

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <ProfileHeader username={profile?.username} email={user.email} />

        {/* Quick Stats */}
        <QuickStats wallet={wallet || undefined} territoriesCount={territories?.length || 0} />

        <Tabs defaultValue="territories" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="territories" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Territórios</span>
            </TabsTrigger>
            <TabsTrigger value="tokens" className="gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <Leaf className="w-4 h-4" />
              <span className="hidden sm:inline">Recursos</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Territories Tab */}
          <TabsContent value="territories">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Meus Territórios
                </CardTitle>
                <CardDescription>Gerencie seus territórios e nações</CardDescription>
              </CardHeader>
              <CardContent>
                <TerritoriesGrid
                  territories={territories || []}
                  levelLabels={levelLabels}
                  levelColors={levelColors}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tokens Tab */}
          <TabsContent value="tokens">
            <TokensPanel tokens={tokens || undefined} />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <ResourcesSummary aggregatedResources={aggregatedResources || undefined} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Transactions
              currencyTransactions={currencyTransactions || []}
              tokenTransactions={tokenTransactions || []}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}