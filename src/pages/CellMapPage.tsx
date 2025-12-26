import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MapPin, Building2, Coins, TreePine, Home, Filter, Search } from 'lucide-react';

interface Cell {
  id: string;
  status: string;
  cell_type: string;
  area_km2: number;
  is_urban_eligible: boolean;
  colonization_cost: number;
  owner_territory_id: string | null;
  region_id: string | null;
  has_city: boolean;
  regions: { name: string; difficulty: string } | null;
  territories: { name: string } | null;
  cities: { name: string } | null;
}

interface Territory {
  id: string;
  name: string;
}

export default function CellMapPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [urbanOnlyFilter, setUrbanOnlyFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [colonizeDialogOpen, setColonizeDialogOpen] = useState(false);
  const [foundCityDialogOpen, setFoundCityDialogOpen] = useState(false);
  const [cityName, setCityName] = useState('');
  const [useToken, setUseToken] = useState(true);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string>('');

  // Fetch cells
  const { data: cells, isLoading: cellsLoading } = useQuery({
    queryKey: ['cells', statusFilter, regionFilter, typeFilter, urbanOnlyFilter],
    queryFn: async () => {
      let query = supabase
        .from('cells')
        .select('*, regions(name, difficulty), territories:owner_territory_id(name), cities:city_id(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'blocked' | 'explored' | 'colonized');
      }
      if (regionFilter !== 'all') {
        query = query.eq('region_id', regionFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('cell_type', typeFilter as 'rural' | 'urban' | 'neutral' | 'blocked');
      }
      if (urbanOnlyFilter) {
        query = query.eq('is_urban_eligible', true);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Cell[];
    },
  });

  // Fetch regions for filter
  const { data: regions } = useQuery({
    queryKey: ['regions-visible'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .eq('is_visible', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's territories
  const { data: userTerritories } = useQuery({
    queryKey: ['user-territories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('territories')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active');
      if (error) throw error;
      return data as Territory[];
    },
    enabled: !!user?.id,
  });

  // Fetch user tokens
  const { data: userTokens } = useQuery({
    queryKey: ['user-tokens', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user profile for currency
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Colonize mutation
  const colonizeMutation = useMutation({
    mutationFn: async ({ cellId, territoryId, useToken }: { cellId: string; territoryId: string; useToken: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('colonize-cell', {
        body: { cell_id: cellId, territory_id: territoryId, use_token: useToken },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Célula colonizada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setColonizeDialogOpen(false);
      setSelectedCell(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao colonizar', description: error.message, variant: 'destructive' });
    },
  });

  // Found city mutation
  const foundCityMutation = useMutation({
    mutationFn: async ({ cellId, territoryId, cityName }: { cellId: string; territoryId: string; cityName: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const { data, error } = await supabase.functions.invoke('found-city', {
        body: { cell_id: cellId, territory_id: territoryId, city_name: cityName },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Cidade fundada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['cells'] });
      queryClient.invalidateQueries({ queryKey: ['user-tokens'] });
      setFoundCityDialogOpen(false);
      setSelectedCell(null);
      setCityName('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao fundar cidade', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'blocked':
        return <Badge variant="secondary" className="bg-muted/50">Bloqueada</Badge>;
      case 'explored':
        return <Badge className="bg-status-warning/20 text-status-warning">Explorada</Badge>;
      case 'colonized':
        return <Badge className="bg-status-success/20 text-status-success">Colonizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string, isUrbanEligible: boolean) => {
    if (type === 'urban') {
      return <Badge className="bg-primary/20 text-primary"><Building2 className="h-3 w-3 mr-1" />Urbana</Badge>;
    }
    if (isUrbanEligible) {
      return <Badge className="bg-accent/20 text-accent-foreground"><Home className="h-3 w-3 mr-1" />Urbanizável</Badge>;
    }
    return <Badge variant="outline"><TreePine className="h-3 w-3 mr-1" />Rural</Badge>;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-status-success';
      case 'medium': return 'text-status-warning';
      case 'hard': return 'text-orange-500';
      case 'extreme': return 'text-status-danger';
      case 'anomaly': return 'text-purple-500';
      default: return 'text-muted-foreground';
    }
  };

  const filteredCells = cells?.filter(cell => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const regionName = (cell.regions as { name: string } | null)?.name?.toLowerCase() || '';
      const territoryName = (cell.territories as { name: string } | null)?.name?.toLowerCase() || '';
      return regionName.includes(search) || territoryName.includes(search) || cell.id.toLowerCase().includes(search);
    }
    return true;
  });

  const canColonize = (cell: Cell) => {
    return cell.status === 'explored' && !cell.owner_territory_id && user && userTerritories && userTerritories.length > 0;
  };

  const canFoundCity = (cell: Cell) => {
    return cell.status === 'colonized' && 
           cell.is_urban_eligible && 
           !cell.has_city && 
           userTerritories?.some(t => t.id === cell.owner_territory_id);
  };

  const openColonizeDialog = (cell: Cell) => {
    setSelectedCell(cell);
    if (userTerritories && userTerritories.length > 0) {
      setSelectedTerritoryId(userTerritories[0].id);
    }
    setColonizeDialogOpen(true);
  };

  const openFoundCityDialog = (cell: Cell) => {
    setSelectedCell(cell);
    setSelectedTerritoryId(cell.owner_territory_id || '');
    setFoundCityDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow">Mapa de Células</h1>
          <p className="text-muted-foreground mt-1">
            Explore, colonize e funde cidades nas células disponíveis
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Tokens de Terra</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {userTokens?.land_tokens || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Tokens de Cidade</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" />
                {userTokens?.city_tokens || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Moeda</CardDescription>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-status-warning" />
                {userProfile?.currency?.toLocaleString() || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-2">
              <CardDescription>Seus Territórios</CardDescription>
              <CardTitle>{userTerritories?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Região, território..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="explored">Exploradas</SelectItem>
                    <SelectItem value="colonized">Colonizadas</SelectItem>
                    <SelectItem value="blocked">Bloqueadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Região</Label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {regions?.map(region => (
                      <SelectItem key={region.id} value={region.id}>{region.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="rural">Rural</SelectItem>
                    <SelectItem value="urban">Urbana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant={urbanOnlyFilter ? 'default' : 'outline'}
                  onClick={() => setUrbanOnlyFilter(!urbanOnlyFilter)}
                  className="w-full"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Só Urbanizáveis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cells Grid */}
        <Tabs defaultValue="grid" className="w-full">
          <TabsList>
            <TabsTrigger value="grid">Grade</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            {cellsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCells && filteredCells.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCells.map(cell => (
                  <Card key={cell.id} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        {getStatusBadge(cell.status)}
                        {getTypeBadge(cell.cell_type, cell.is_urban_eligible)}
                      </div>
                      <CardDescription className="text-xs font-mono mt-2">
                        {cell.id.slice(0, 8)}...
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Região:</span>
                          <span className={getDifficultyColor((cell.regions as { difficulty: string } | null)?.difficulty || '')}>
                            {(cell.regions as { name: string } | null)?.name || 'Desconhecida'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Área:</span>
                          <span>{cell.area_km2.toLocaleString()} km²</span>
                        </div>
                        {cell.colonization_cost > 0 && cell.status === 'explored' && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo:</span>
                            <span className="text-status-warning">{cell.colonization_cost.toLocaleString()}</span>
                          </div>
                        )}
                        {(cell.territories as { name: string } | null)?.name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Dono:</span>
                            <span className="text-primary">{(cell.territories as { name: string }).name}</span>
                          </div>
                        )}
                        {cell.has_city && (cell.cities as { name: string } | null)?.name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cidade:</span>
                            <span className="text-accent">{(cell.cities as { name: string }).name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        {canColonize(cell) && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => openColonizeDialog(cell)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            Colonizar
                          </Button>
                        )}
                        {canFoundCity(cell) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => openFoundCityDialog(cell)}
                          >
                            <Building2 className="h-3 w-3 mr-1" />
                            Fundar Cidade
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma célula encontrada com os filtros selecionados</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {cellsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCells && filteredCells.length > 0 ? (
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3">ID</th>
                      <th className="text-left p-3">Região</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Área</th>
                      <th className="text-left p-3">Dono</th>
                      <th className="text-left p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCells.map(cell => (
                      <tr key={cell.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{cell.id.slice(0, 8)}...</td>
                        <td className="p-3">{(cell.regions as { name: string } | null)?.name || '-'}</td>
                        <td className="p-3">{getStatusBadge(cell.status)}</td>
                        <td className="p-3">{getTypeBadge(cell.cell_type, cell.is_urban_eligible)}</td>
                        <td className="p-3">{cell.area_km2.toLocaleString()} km²</td>
                        <td className="p-3">{(cell.territories as { name: string } | null)?.name || '-'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {canColonize(cell) && (
                              <Button size="sm" variant="outline" onClick={() => openColonizeDialog(cell)}>
                                Colonizar
                              </Button>
                            )}
                            {canFoundCity(cell) && (
                              <Button size="sm" variant="outline" onClick={() => openFoundCityDialog(cell)}>
                                Fundar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma célula encontrada
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Colonize Dialog */}
        <Dialog open={colonizeDialogOpen} onOpenChange={setColonizeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Colonizar Célula</DialogTitle>
              <DialogDescription>
                Escolha como deseja pagar pela colonização desta célula.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCell && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Região:</span>
                    <span>{(selectedCell.regions as { name: string } | null)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Área:</span>
                    <span>{selectedCell.area_km2.toLocaleString()} km²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Urbanizável:</span>
                    <span>{selectedCell.is_urban_eligible ? 'Sim' : 'Não'}</span>
                  </div>
                </div>

                <div>
                  <Label>Território</Label>
                  <Select value={selectedTerritoryId} onValueChange={setSelectedTerritoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um território" />
                    </SelectTrigger>
                    <SelectContent>
                      {userTerritories?.map(territory => (
                        <SelectItem key={territory.id} value={territory.id}>{territory.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Método de Pagamento</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant={useToken ? 'default' : 'outline'}
                      onClick={() => setUseToken(true)}
                      className="justify-start"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      1 Token de Terra
                      <span className="ml-auto text-xs opacity-70">({userTokens?.land_tokens || 0})</span>
                    </Button>
                    <Button
                      variant={!useToken ? 'default' : 'outline'}
                      onClick={() => setUseToken(false)}
                      className="justify-start"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      {((selectedCell.colonization_cost || 0) + 500).toLocaleString()}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setColonizeDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedCell && selectedTerritoryId) {
                    colonizeMutation.mutate({
                      cellId: selectedCell.id,
                      territoryId: selectedTerritoryId,
                      useToken,
                    });
                  }
                }}
                disabled={colonizeMutation.isPending || !selectedTerritoryId}
              >
                {colonizeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                Colonizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Found City Dialog */}
        <Dialog open={foundCityDialogOpen} onOpenChange={setFoundCityDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fundar Cidade</DialogTitle>
              <DialogDescription>
                Crie uma nova cidade nesta célula urbanizável. Custo: 1 Token de Cidade.
              </DialogDescription>
            </DialogHeader>
            
            {selectedCell && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Região:</span>
                    <span>{(selectedCell.regions as { name: string } | null)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seus Tokens de Cidade:</span>
                    <span className={userTokens?.city_tokens && userTokens.city_tokens > 0 ? 'text-status-success' : 'text-status-danger'}>
                      {userTokens?.city_tokens || 0}
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="city-name">Nome da Cidade</Label>
                  <Input
                    id="city-name"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="Digite o nome da cidade"
                    maxLength={50}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setFoundCityDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedCell && cityName.trim()) {
                    foundCityMutation.mutate({
                      cellId: selectedCell.id,
                      territoryId: selectedCell.owner_territory_id!,
                      cityName: cityName.trim(),
                    });
                  }
                }}
                disabled={foundCityMutation.isPending || !cityName.trim() || (userTokens?.city_tokens || 0) < 1}
              >
                {foundCityMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Building2 className="h-4 w-4 mr-2" />
                )}
                Fundar Cidade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
