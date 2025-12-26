import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TerritoryCard } from '@/components/cards/TerritoryCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Filter, TrendingUp, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TerritoryStatus = Database['public']['Enums']['territory_status'];

interface Region {
  id: string;
  name: string;
}

export interface TerritoryWithDetails {
  id: string;
  name: string;
  governorName: string;
  region: string;
  regionId: string;
  status: TerritoryStatus;
  level: Database['public']['Enums']['territory_level'];
  style: Database['public']['Enums']['territory_style'];
  governmentType: Database['public']['Enums']['government_type'];
  pdPoints: number;
  piPoints: number;
  cityCount: number;
}

const statusLabels: Record<TerritoryStatus, string> = {
  pending: 'Em Análise',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  active: 'Ativo',
  inactive: 'Inativo',
};

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<TerritoryWithDetails[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<TerritoryStatus | 'all'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Fetch regions
    const { data: regionsData } = await supabase
      .from('regions')
      .select('id, name')
      .order('name');

    setRegions(regionsData || []);

    // Fetch territories with related data
    const { data: territoriesData, error } = await supabase
      .from('territories')
      .select(`
        id,
        name,
        owner_id,
        region_id,
        status,
        level,
        style,
        government_type,
        pd_points,
        pi_points
      `)
      .in('status', ['pending', 'approved', 'active'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching territories:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for owners
    const ownerIds = territoriesData?.map(t => t.owner_id).filter(Boolean) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ownerIds);

    // Fetch city counts per territory
    const territoryIds = territoriesData?.map(t => t.id) || [];
    const { data: cities } = await supabase
      .from('cities')
      .select('owner_territory_id')
      .in('owner_territory_id', territoryIds);

    // Build the final list
    const territoriesWithDetails: TerritoryWithDetails[] = territoriesData?.map(t => {
      const profile = profiles?.find(p => p.id === t.owner_id);
      const region = regionsData?.find(r => r.id === t.region_id);
      const cityCount = cities?.filter(c => c.owner_territory_id === t.id).length || 0;

      return {
        id: t.id,
        name: t.name,
        governorName: profile?.username || 'Desconhecido',
        region: region?.name || 'N/A',
        regionId: t.region_id || '',
        status: t.status,
        level: t.level,
        style: t.style,
        governmentType: t.government_type,
        pdPoints: t.pd_points,
        piPoints: t.pi_points,
        cityCount,
      };
    }) || [];

    setTerritories(territoriesWithDetails);
    setLoading(false);
  }

  const filteredTerritories = territories.filter((territory) => {
    const matchesSearch = 
      territory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      territory.governorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRegion = regionFilter === 'all' || territory.regionId === regionFilter;
    const matchesStatus = statusFilter === 'all' || territory.status === statusFilter;

    return matchesSearch && matchesRegion && matchesStatus;
  });

  const totalPoints = territories.reduce((sum, t) => sum + t.pdPoints + t.piPoints, 0);
  const totalCities = territories.reduce((sum, t) => sum + t.cityCount, 0);
  const activeCount = territories.filter(t => t.status === 'active').length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Territórios</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Territórios Ativos
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore todas as nações estabelecidas no planeta TOI-700
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-display font-bold text-primary">
                {loading ? '...' : territories.length}
              </p>
              <p className="text-sm text-muted-foreground">Total de Territórios</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-display font-bold text-status-active">
                {loading ? '...' : activeCount}
              </p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-5 h-5 text-secondary" />
                <p className="text-2xl font-display font-bold text-secondary">
                  {loading ? '...' : totalCities}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Cidades Ocupadas</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-5 h-5 text-accent" />
                <p className="text-2xl font-display font-bold text-accent">
                  {loading ? '...' : totalPoints.toLocaleString()}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Pontos Totais</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou governante..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50"
                />
              </div>
              <div className="flex gap-4">
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px] bg-muted/50">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Regiões</SelectItem>
                    {regions.map((region) => (
                      <SelectItem key={region.id} value={region.id}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TerritoryStatus | 'all')}>
                  <SelectTrigger className="w-[140px] bg-muted/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">{statusLabels.active}</SelectItem>
                    <SelectItem value="pending">{statusLabels.pending}</SelectItem>
                    <SelectItem value="approved">{statusLabels.approved}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4">
          <Badge variant="outline" className="text-muted-foreground">
            {filteredTerritories.length} território(s) encontrado(s)
          </Badge>
        </div>

        {/* Territories Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTerritories.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTerritories.map((territory) => (
              <TerritoryCard key={territory.id} territory={territory} />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum território encontrado com os filtros selecionados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
