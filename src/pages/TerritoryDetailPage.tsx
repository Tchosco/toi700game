import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, Crown, MapPin, Flag, Building2, Scroll, 
  Calendar, History, Globe, Loader2
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TerritoryStatus = Database['public']['Enums']['territory_status'];
type TerritoryLevel = Database['public']['Enums']['territory_level'];
type TerritoryStyle = Database['public']['Enums']['territory_style'];
type GovernmentType = Database['public']['Enums']['government_type'];

interface TerritoryDetails {
  id: string;
  name: string;
  governorName: string;
  region: string;
  capital: string;
  status: TerritoryStatus;
  level: TerritoryLevel;
  style: TerritoryStyle;
  governmentType: GovernmentType;
  lore: string | null;
  flagUrl: string | null;
  pdPoints: number;
  piPoints: number;
  createdAt: string;
}

interface City {
  id: string;
  name: string;
  region: string;
  isCapital: boolean;
}

interface TerritoryEvent {
  id: string;
  title: string;
  description: string | null;
  pdChange: number;
  piChange: number;
  createdAt: string;
}

interface UserTokens {
  cityTokens: number;
  landTokens: number;
  stateTokens: number;
}

const statusConfig: Record<TerritoryStatus, { label: string; className: string }> = {
  pending: { label: 'Em Análise', className: 'bg-status-pending/20 text-status-pending border-status-pending/30' },
  approved: { label: 'Aprovado', className: 'bg-status-active/20 text-status-active border-status-active/30' },
  rejected: { label: 'Rejeitado', className: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30' },
  active: { label: 'Ativo', className: 'bg-status-active/20 text-status-active border-status-active/30' },
  inactive: { label: 'Inativo', className: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30' },
};

const levelConfig: Record<TerritoryLevel, { label: string; number: number; className: string }> = {
  colony: { label: 'Colônia', number: 1, className: 'bg-level-1/20 text-level-1 border-level-1/30' },
  autonomous: { label: 'Território Autônomo', number: 2, className: 'bg-level-2/20 text-level-2 border-level-2/30' },
  recognized: { label: 'Estado Reconhecido', number: 3, className: 'bg-level-3/20 text-level-3 border-level-3/30' },
  kingdom: { label: 'Reino / República', number: 4, className: 'bg-level-4/20 text-level-4 border-level-4/30' },
  power: { label: 'Potência Planetária', number: 5, className: 'bg-level-5/20 text-level-5 border-level-5/30' },
};

const styleLabels: Record<TerritoryStyle, string> = {
  cultural: 'Cultural',
  commercial: 'Comercial',
  technological: 'Tecnológico',
  military: 'Militar',
};

const governmentLabels: Record<GovernmentType, string> = {
  monarchy: 'Monarquia',
  republic: 'República',
  theocracy: 'Teocracia',
  oligarchy: 'Oligarquia',
  democracy: 'Democracia',
  dictatorship: 'Ditadura',
};

export default function TerritoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [territory, setTerritory] = useState<TerritoryDetails | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [events, setEvents] = useState<TerritoryEvent[]>([]);
  const [tokens, setTokens] = useState<UserTokens | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTerritoryDetails();
    }
  }, [id]);

  async function fetchTerritoryDetails() {
    setLoading(true);

    // Fetch territory
    const { data: territoryData, error: territoryError } = await supabase
      .from('territories')
      .select(`
        id,
        name,
        owner_id,
        capital_city_id,
        region_id,
        status,
        level,
        style,
        government_type,
        lore,
        flag_url,
        pd_points,
        pi_points,
        created_at
      `)
      .eq('id', id)
      .maybeSingle();

    if (territoryError || !territoryData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Fetch owner profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', territoryData.owner_id)
      .maybeSingle();

    // Fetch region
    const { data: region } = await supabase
      .from('regions')
      .select('name')
      .eq('id', territoryData.region_id)
      .maybeSingle();

    // Fetch capital city name
    const { data: capitalCity } = await supabase
      .from('cities')
      .select('name')
      .eq('id', territoryData.capital_city_id)
      .maybeSingle();

    // Fetch all cities owned by this territory
    const { data: citiesData } = await supabase
      .from('cities')
      .select(`
        id,
        name,
        region_id
      `)
      .eq('owner_territory_id', territoryData.id);

    // Fetch regions for cities
    const cityRegionIds = citiesData?.map(c => c.region_id).filter(Boolean) || [];
    const { data: cityRegions } = await supabase
      .from('regions')
      .select('id, name')
      .in('id', cityRegionIds);

    const citiesWithDetails: City[] = citiesData?.map(city => ({
      id: city.id,
      name: city.name,
      region: cityRegions?.find(r => r.id === city.region_id)?.name || 'N/A',
      isCapital: city.id === territoryData.capital_city_id,
    })) || [];

    // Fetch territory events
    const { data: eventsData } = await supabase
      .from('territory_events')
      .select('id, title, description, pd_change, pi_change, created_at')
      .eq('territory_id', territoryData.id)
      .order('created_at', { ascending: false });

    // Fetch owner tokens
    if (territoryData.owner_id) {
      const { data: tokensData } = await supabase
        .from('user_tokens')
        .select('city_tokens, land_tokens, state_tokens')
        .eq('user_id', territoryData.owner_id)
        .maybeSingle();

      if (tokensData) {
        setTokens({
          cityTokens: tokensData.city_tokens,
          landTokens: tokensData.land_tokens,
          stateTokens: tokensData.state_tokens,
        });
      }
    }

    setTerritory({
      id: territoryData.id,
      name: territoryData.name,
      governorName: profile?.username || 'Desconhecido',
      region: region?.name || 'N/A',
      capital: capitalCity?.name || 'N/A',
      status: territoryData.status,
      level: territoryData.level,
      style: territoryData.style,
      governmentType: territoryData.government_type,
      lore: territoryData.lore,
      flagUrl: territoryData.flag_url,
      pdPoints: territoryData.pd_points,
      piPoints: territoryData.pi_points,
      createdAt: territoryData.created_at,
    });

    setCities(citiesWithDetails);

    setEvents(eventsData?.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      pdChange: e.pd_change,
      piChange: e.pi_change,
      createdAt: e.created_at,
    })) || []);

    setLoading(false);
  }

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (notFound || !territory) {
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

  const status = statusConfig[territory.status];
  const level = levelConfig[territory.level];

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
                  <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                    {territory.flagUrl ? (
                      <img src={territory.flagUrl} alt="Bandeira" className="w-full h-full object-cover" />
                    ) : (
                      <Flag className="w-12 h-12 text-primary/30" />
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h1 className="font-display text-2xl md:text-3xl font-bold">
                          {territory.name}
                        </h1>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <Badge variant="outline" className={level.className}>
                        Nível {level.number} • {level.label}
                      </Badge>
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
                          <p className="font-medium">{governmentLabels[territory.governmentType]}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{styleLabels[territory.style]}</Badge>
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
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Desenvolvimento (PD)</span>
                  <span className="font-bold text-token-city">{territory.pdPoints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Influência (PI)</span>
                  <span className="font-bold text-token-state">{territory.piPoints}</span>
                </div>
              </CardContent>
            </Card>

            {tokens && (
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tokens do Governante</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">City Tokens</span>
                    <span className="font-bold text-token-city">{tokens.cityTokens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Land Tokens</span>
                    <span className="font-bold text-token-land">{tokens.landTokens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">State Tokens</span>
                    <span className="font-bold text-token-state">{tokens.stateTokens}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Lore */}
        {territory.lore && (
          <Card className="glass-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scroll className="w-5 h-5 text-primary" />
                História
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {territory.lore}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cities */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cidades ({cities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cities.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cities.map((city) => (
                  <div 
                    key={city.id}
                    className={`p-4 rounded-lg border ${
                      city.isCapital 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{city.name}</h4>
                      {city.isCapital && (
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma cidade registrada.
              </p>
            )}
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
            {events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-medium mb-1">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                        {(event.pdChange !== 0 || event.piChange !== 0) && (
                          <div className="text-sm font-medium mt-1">
                            {event.pdChange !== 0 && (
                              <span className={event.pdChange > 0 ? 'text-status-active' : 'text-status-inactive'}>
                                {event.pdChange > 0 ? '+' : ''}{event.pdChange} PD
                              </span>
                            )}
                            {event.pdChange !== 0 && event.piChange !== 0 && ' / '}
                            {event.piChange !== 0 && (
                              <span className={event.piChange > 0 ? 'text-status-active' : 'text-status-inactive'}>
                                {event.piChange > 0 ? '+' : ''}{event.piChange} PI
                              </span>
                            )}
                          </div>
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
