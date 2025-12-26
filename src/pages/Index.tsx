import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Map, BookOpen, PlusCircle, Building2, Globe, Sparkles, Users, TrendingUp } from 'lucide-react';
import { mockTerritories, mockCities } from '@/lib/data';

const stats = [
  { label: 'Territórios Ativos', value: mockTerritories.filter(t => t.status === 'Ativo').length, icon: Building2, color: 'text-primary' },
  { label: 'Cidades Ocupadas', value: mockCities.filter(c => c.status === 'Ocupada').length, icon: Users, color: 'text-secondary' },
  { label: 'Cidades Livres', value: mockCities.filter(c => c.status === 'Livre').length, icon: Map, color: 'text-status-active' },
  { label: 'Potências', value: mockTerritories.filter(t => t.levelNumber >= 4).length, icon: TrendingUp, color: 'text-accent' },
];

const quickLinks = [
  { to: '/mapa', label: 'Ver Mapa', description: 'Explore o mapa oficial de TOI-700', icon: Map, variant: 'default' as const },
  { to: '/como-jogar', label: 'Como Jogar', description: 'Aprenda as regras do simulador', icon: BookOpen, variant: 'secondary' as const },
  { to: '/criar-territorio', label: 'Criar Território', description: 'Estabeleça sua nação no planeta', icon: PlusCircle, variant: 'outline' as const },
  { to: '/territorios', label: 'Territórios Ativos', description: 'Veja todas as nações ativas', icon: Building2, variant: 'outline' as const },
];

export default function Index() {
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
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Construa sua nação, governe cidades, forme alianças e escreva a história de um novo mundo. 
              Um simulador político e territorial baseado em dados e narrativa.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/criar-territorio">
                <Button size="lg" className="glow-primary font-display">
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Criar Território
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

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
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

      {/* Quick Links Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Explore o Sistema
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Navegue pelas diferentes áreas do simulador e descubra as possibilidades de TOI-700
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
                  Neste simulador, você assume o papel de governante de um território, 
                  administrando cidades, formando países e participando de eventos que moldam a história planetária.
                </p>
                <ul className="space-y-3">
                  {[
                    'Sistema de tokens para aquisição e expansão',
                    'Níveis políticos de Colônia a Potência Planetária',
                    'Eventos globais e crises regionais',
                    'Progressão baseada em pontos e participação',
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
