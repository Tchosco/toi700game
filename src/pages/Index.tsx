import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Map, BookOpen, PlusCircle, Building2, Globe, Sparkles, Users, TrendingUp,
  Coins, FlaskConical, Sword, Handshake, ShoppingCart, Leaf, Zap, Mountain, Cpu, Vote
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const quickLinks = [
  { to: '/mapa', label: 'Ver Mapa', description: 'Explore o mapa oficial de TOI-700', icon: Map, variant: 'default' as const },
  { to: '/mercado', label: 'Mercado', description: 'Compre tokens e negocie recursos', icon: ShoppingCart, variant: 'default' as const },
  { to: '/como-jogar', label: 'Como Jogar', description: 'Aprenda as regras do simulador', icon: BookOpen, variant: 'secondary' as const },
  { to: '/criar-territorio', label: 'Criar Território', description: 'Estabeleça sua nação no planeta', icon: PlusCircle, variant: 'outline' as const },
  { to: '/territorios', label: 'Territórios Ativos', description: 'Veja todas as nações ativas', icon: Building2, variant: 'outline' as const },
];

const mechanics = [
  { 
    icon: Coins, 
    title: 'Economia & Moeda', 
    description: 'Sistema monetário com ₮ Créditos Planetários para comércio e investimentos.',
    color: 'text-yellow-500'
  },
  { 
    icon: FlaskConical, 
    title: 'Pesquisa Científica', 
    description: 'Gere pontos de pesquisa para desbloquear novas regiões e tecnologias.',
    color: 'text-blue-500'
  },
  { 
    icon: Globe, 
    title: 'Exploração Planetária', 
    description: 'Revele células bloqueadas e expanda as fronteiras conhecidas do planeta.',
    color: 'text-green-500'
  },
  { 
    icon: Handshake, 
    title: 'Diplomacia', 
    description: 'Negocie tratados de paz, comércio, alianças e acordos territoriais.',
    color: 'text-purple-500'
  },
  { 
    icon: Sword, 
    title: 'Sistema de Guerra', 
    description: 'Conflitos baseados em ciclos, recursos e estratégia territorial.',
    color: 'text-red-500'
  },
  { 
    icon: ShoppingCart, 
    title: 'Mercado de Recursos', 
    description: 'Compre e venda alimentos, energia, minerais, tecnologia e influência.',
    color: 'text-orange-500'
  },
];

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

export default function Index() {
  // Fetch real stats from database
  const { data: stats } = useQuery({
    queryKey: ['planet-stats'],
    queryFn: async () => {
      const [territoriesRes, citiesRes, cellsRes, warsRes, treatiesRes, erasRes] = await Promise.all([
        supabase.from('territories').select('id, status, level').eq('status', 'active'),
        supabase.from('cities').select('id, status'),
        supabase.from('cells').select('id, status'),
        supabase.from('wars').select('id, status').eq('status', 'active'),
        supabase.from('treaties').select('id, status').eq('status', 'active'),
        supabase.from('planetary_eras').select('*').eq('is_active', true).single(),
      ]);

      const territories = territoriesRes.data || [];
      const cities = citiesRes.data || [];
      const cells = cellsRes.data || [];

      return {
        activeTeritories: territories.length,
        powers: territories.filter(t => t.level === 'power' || t.level === 'kingdom').length,
        totalCities: cities.length,
        occupiedCities: cities.filter(c => c.status === 'occupied').length,
        freeCities: cities.filter(c => c.status === 'free').length,
        exploredCells: cells.filter(c => c.status === 'explored' || c.status === 'colonized').length,
        colonizedCells: cells.filter(c => c.status === 'colonized').length,
        blockedCells: cells.filter(c => c.status === 'blocked').length,
        totalCells: cells.length,
        activeWars: warsRes.data?.length || 0,
        activeTreaties: treatiesRes.data?.length || 0,
        currentEra: erasRes.data?.name || 'Era da Cartografia',
      };
    },
  });

  // Fetch resource market data
  const { data: resourceMarket } = useQuery({
    queryKey: ['resource-market-index'],
    queryFn: async () => {
      const { data } = await supabase.from('resource_market').select('*');
      return data || [];
    },
  });

  // Fetch token market data
  const { data: tokenMarket } = useQuery({
    queryKey: ['token-market-index'],
    queryFn: async () => {
      const { data } = await supabase.from('token_market').select('*').eq('is_active', true);
      return data || [];
    },
  });

  const planetStats = [
    { label: 'Territórios Ativos', value: stats?.activeTeritories || 0, icon: Building2, color: 'text-primary' },
    { label: 'Cidades Ocupadas', value: stats?.occupiedCities || 0, icon: Users, color: 'text-secondary' },
    { label: 'Células Exploradas', value: stats?.exploredCells || 0, icon: Map, color: 'text-status-active' },
    { label: 'Potências', value: stats?.powers || 0, icon: TrendingUp, color: 'text-accent' },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Simulador Micronacional Gamificado</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <span className="text-gradient">Planeta TOI-700</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Construa sua nação, governe cidades, forme alianças e escreva a história de um novo mundo. 
              Um simulador estratégico de longo prazo baseado em dados e sistemas automáticos.
            </p>

            {/* Current Era Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 mb-10 animate-fade-in" style={{ animationDelay: '0.25s' }}>
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Era Atual: {stats?.currentEra || 'Carregando...'}</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/criar-territorio">
                <Button size="lg" className="glow-primary font-display">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Criar Território
                </Button>
              </Link>
              <Link to="/mercado">
                <Button size="lg" variant="secondary">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Mercado
                </Button>
              </Link>
              <Link to="/como-jogar">
                <Button size="lg" variant="outline">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Como Jogar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative planet */}
        <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent blur-3xl opacity-50" />
      </section>

      {/* Planet Stats Section */}
      <section className="py-12 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {planetStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={stat.label}
                  className="text-center animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3">
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="font-display text-3xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planet Data Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Dados Planetários
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Estatísticas em tempo real do estado atual de TOI-700
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Geography Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Geografia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Área Total</span>
                  <span className="font-mono font-bold">663.000.000 km²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Área Terrestre</span>
                  <span className="font-mono font-bold">269.000.000 km²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Área Jogável</span>
                  <span className="font-mono font-bold text-primary">~30.000.000 km²</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total de Células</span>
                  <span className="font-mono font-bold">{stats?.totalCells || '~4.000'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Exploration Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Map className="w-5 h-5 text-green-500" />
                  Exploração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Células Bloqueadas</span>
                  <span className="font-mono font-bold text-muted-foreground">{stats?.blockedCells || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Células Exploradas</span>
                  <span className="font-mono font-bold text-yellow-500">{stats?.exploredCells || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Células Colonizadas</span>
                  <span className="font-mono font-bold text-green-500">{stats?.colonizedCells || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Cidades Livres</span>
                  <span className="font-mono font-bold text-blue-500">{stats?.freeCities || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* Diplomacy Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Handshake className="w-5 h-5 text-purple-500" />
                  Diplomacia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tratados Ativos</span>
                  <span className="font-mono font-bold text-green-500">{stats?.activeTreaties || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Guerras Ativas</span>
                  <span className="font-mono font-bold text-red-500">{stats?.activeWars || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Territórios</span>
                  <span className="font-mono font-bold">{stats?.activeTeritories || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Potências</span>
                  <span className="font-mono font-bold text-accent">{stats?.powers || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Resource Market Preview */}
      {resourceMarket && resourceMarket.length > 0 && (
        <section className="py-16 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Mercado de Recursos
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Preços atuais dos recursos planetários
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              {resourceMarket.map((resource) => {
                const Icon = resourceIcons[resource.resource_type] || Coins;
                const label = resourceLabels[resource.resource_type] || resource.resource_type;
                return (
                  <Card key={resource.id} className="glass-card text-center">
                    <CardContent className="pt-6">
                      <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-sm font-medium mb-1">{label}</div>
                      <div className="font-mono font-bold text-lg text-primary">
                        ₮{Number(resource.current_price).toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Base: ₮{Number(resource.base_price).toFixed(1)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link to="/mercado">
                <Button variant="outline">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ver Mercado Completo
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Token Market Preview */}
      {tokenMarket && tokenMarket.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                Tokens Disponíveis
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Adquira tokens para expandir seu território
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {tokenMarket.map((token) => {
                const tokenInfo: Record<string, { icon: React.ElementType; label: string; description: string; color: string }> = {
                  city: { icon: Building2, label: 'City Token', description: 'Funda 1 cidade', color: 'text-blue-500' },
                  land: { icon: Map, label: 'Land Token', description: 'Coloniza 1 célula rural', color: 'text-green-500' },
                  state: { icon: Globe, label: 'State Token', description: 'Cria um país oficial', color: 'text-purple-500' },
                };
                const info = tokenInfo[token.token_type] || { icon: Coins, label: token.token_type, description: '', color: 'text-primary' };
                const Icon = info.icon;

                return (
                  <Card key={token.id} className="glass-card hover:border-primary/50 transition-all">
                    <CardContent className="pt-6 text-center">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4`}>
                        <Icon className={`w-8 h-8 ${info.color}`} />
                      </div>
                      <h3 className="font-display font-bold text-lg mb-1">{info.label}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
                      <div className="font-mono text-2xl font-bold text-primary mb-2">
                        ₮{Number(token.price_per_unit).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {token.available_quantity} disponíveis
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Game Mechanics Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Mecânicas do Jogo
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Um simulador estratégico completo com sistemas interconectados
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {mechanics.map((mechanic, index) => {
              const Icon = mechanic.icon;
              return (
                <Card 
                  key={mechanic.title} 
                  className="glass-card animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <CardContent className="pt-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-4">
                      <Icon className={`w-6 h-6 ${mechanic.color}`} />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-2">{mechanic.title}</h3>
                    <p className="text-sm text-muted-foreground">{mechanic.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Links Section */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Explore o Sistema
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Navegue pelas diferentes áreas do simulador e descubra as possibilidades de TOI-700
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              return (
                <Link 
                  key={link.to} 
                  to={link.to}
                  className="animate-fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <Card className="glass-card h-full hover:border-primary/50 transition-all duration-300 hover:glow-primary group">
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-display font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                        {link.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
                  <Globe className="w-4 h-4 text-secondary" />
                  <span className="text-xs font-medium text-secondary">Sobre o Planeta</span>
                </div>
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
                  Um Novo Mundo Aguarda
                </h2>
                <p className="text-muted-foreground mb-6">
                  TOI-700 é um planeta fictício inspirado no exoplaneta real descoberto pela NASA. 
                  Com 1,3× a área da Terra, oferece um vasto território para exploração, colonização e 
                  disputas políticas. Um jogo de longo prazo focado em estratégia e administração.
                </p>
                <ul className="space-y-3">
                  {[
                    'Sistema de tokens para aquisição e expansão territorial',
                    'Economia dinâmica com mercado de recursos',
                    'Pesquisa científica para desbloquear novas regiões',
                    'Diplomacia e guerras baseadas em ciclos',
                    'Progressão por eras planetárias',
                    'Níveis políticos de Colônia a Potência Planetária',
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 border border-border/50 flex items-center justify-center">
                  <Globe className="w-32 h-32 text-primary/30 animate-float" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
