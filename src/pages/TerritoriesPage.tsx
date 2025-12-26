import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { TerritoryCard } from '@/components/cards/TerritoryCard';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Filter, TrendingUp, Users } from 'lucide-react';
import { mockTerritories, regions } from '@/lib/data';

export default function TerritoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTerritories = mockTerritories.filter((territory) => {
    const matchesSearch = 
      territory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      territory.governorName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRegion = regionFilter === 'all' || territory.region === regionFilter;
    const matchesStatus = statusFilter === 'all' || territory.status === statusFilter;

    return matchesSearch && matchesRegion && matchesStatus;
  });

  const totalPoints = mockTerritories.reduce((sum, t) => sum + t.developmentPoints + t.influencePoints, 0);
  const totalCities = mockTerritories.reduce((sum, t) => sum + t.cities.length, 0);

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
              <p className="text-2xl font-display font-bold text-primary">{mockTerritories.length}</p>
              <p className="text-sm text-muted-foreground">Total de Territórios</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-display font-bold text-status-active">{mockTerritories.filter(t => t.status === 'Ativo').length}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <Users className="w-5 h-5 text-secondary" />
                <p className="text-2xl font-display font-bold text-secondary">{totalCities}</p>
              </div>
              <p className="text-sm text-muted-foreground">Cidades Ocupadas</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="w-5 h-5 text-accent" />
                <p className="text-2xl font-display font-bold text-accent">{totalPoints.toLocaleString()}</p>
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
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-muted/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em Análise">Em Análise</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
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
        {filteredTerritories.length > 0 ? (
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
