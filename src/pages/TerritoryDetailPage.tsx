import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { TokenDisplay } from '@/components/ui/TokenDisplay';
import { PointsDisplay } from '@/components/ui/PointsDisplay';
import { mockTerritories, mockCities } from '@/lib/data';
import { 
  ArrowLeft, Crown, MapPin, Flag, Building2, Scroll, 
  Calendar, History, Globe, Users
} from 'lucide-react';

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const territory = mockTerritories.find(t => t.id === id);

  if (!territory) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="glass-card max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-display font-bold mb-2">Território não encontrado</h2>
              <p className="text-muted-foreground mb-6">
                O território solicitado não existe ou foi removido.
              </p>
              <Link to="/territorios">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar aos Territórios
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const territoryCities = mockCities.filter(c => territory.cities.includes(c.id));
  const totalPopulation = territoryCities.reduce((sum, c) => sum + c.population, 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Back Button */}
        <Link to="/territorios" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar aos Territórios</span>
        </Link>

        {/* Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Main Info */}
          <div className="lg:col-span-2">
            <Card className="glass-card h-full">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Flag Placeholder */}
                  <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 border border-border/50 flex items-center justify-center shrink-0">
                    <Flag className="w-12 h-12 text-primary/30" />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="font-display text-2xl md:text-3xl font-bold">
                          {territory.name}
                        </h1>
                        <StatusBadge status={territory.status} />
                      </div>
                      <LevelBadge level={territory.level} levelNumber={territory.levelNumber} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Governante</p>
                          <p className="font-medium">{territory.governorName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Região</p>
                          <p className="font-medium">{territory.region}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Capital</p>
                          <p className="font-medium">{territory.capital}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Governo</p>
                          <p className="font-medium">{territory.governmentType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{territory.style}</Badge>
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        Fundado em {new Date(territory.createdAt).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pontuação</CardTitle>
              </CardHeader>
              <CardContent>
                <PointsDisplay 
                  developmentPoints={territory.developmentPoints}
                  influencePoints={territory.influencePoints}
                  size="lg"
                  className="flex-col items-start gap-2"
                />
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Disponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <TokenDisplay 
                  cityTokens={territory.cityTokens}
                  landTokens={territory.landTokens}
                  stateTokens={territory.stateTokens}
                  size="lg"
                  className="flex-col items-start gap-2"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lore */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-primary" />
              História
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {territory.lore}
            </p>
          </CardContent>
        </Card>

        {/* Cities */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cidades ({territoryCities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {territoryCities.map((city) => (
                <div 
                  key={city.id}
                  className={`p-4 rounded-lg border ${
                    city.name === territory.capital 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'bg-muted/30 border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{city.name}</h4>
                    {city.name === territory.capital && (
                      <Badge variant="secondary" className="text-xs">
                        Capital
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {city.region}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {city.population.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-4 text-sm text-muted-foreground">
              <span>População total: <strong className="text-foreground">{totalPopulation.toLocaleString()}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Events History */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Histórico de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {territory.events.length > 0 ? (
              <div className="space-y-4">
                {territory.events.map((event) => (
                  <div 
                    key={event.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleDateString('pt-BR')}
                        </p>
                        {event.pointsGained && (
                          <p className="text-sm font-medium text-status-active">
                            +{event.pointsGained} pts
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum evento registrado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
