"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Building2, Coins } from 'lucide-react';
import FiltersBar from "@/components/cell-map/FiltersBar";
import CellsGrid from "@/components/cell-map/CellsGrid";
import CellsList from "@/components/cell-map/CellsList";
import ColonizeDialog from "@/components/cell-map/ColonizeDialog";
import FoundCityDialog from "@/components/cell-map/FoundCityDialog";

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

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [urbanOnlyFilter, setUrbanOnlyFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [colonizeDialogOpen, setColonizeDialogOpen] = useState(false);
  const [foundCityDialogOpen, setFoundCityDialogOpen] = useState(false);
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

  // Mutations
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
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao fundar cidade', description: error.message, variant: 'destructive' });
    },
  });

  // Derived helpers
  const filteredCells = (cells || []).filter((cell) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const regionName = (cell.regions as { name: string } | null)?.name?.toLowerCase() || '';
      const territoryName = (cell.territories as { name: string } | null)?.name?.toLowerCase() || '';
      return regionName.includes(search) || territoryName.includes(search) || cell.id.toLowerCase().includes(search);
    }
    return true;
  });

  const canColonize = (cell: Cell) =>
    cell.status === 'explored' && !cell.owner_territory_id && user && userTerritories && userTerritories.length > 0;

  const canFoundCity = (cell: Cell) =>
    cell.status === 'colonized' &&
    cell.is_urban_eligible &&
    !cell.has_city &&
    userTerritories?.some((t) => t.id === cell.owner_territory_id);

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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-glow">Mapa de Células</h1>
          <p className="text-muted-foreground mt-1">Explore, colonize e funde cidades nas células disponíveis</p>
        </div>

        {/* Stats */}
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
        <FiltersBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          regionFilter={regionFilter}
          onRegionFilterChange={setRegionFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          urbanOnlyFilter={urbanOnlyFilter}
          onToggleUrbanOnly={() => setUrbanOnlyFilter(!urbanOnlyFilter)}
          regions={regions || []}
        />

        {/* Grid/List */}
        <Tabs defaultValue="grid" className="w-full">
          <TabsList>
            <TabsTrigger value="grid">Grade</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="mt-4">
            <CellsGrid
              cells={filteredCells}
              loading={cellsLoading}
              canColonize={canColonize}
              canFoundCity={canFoundCity}
              onColonize={openColonizeDialog}
              onFoundCity={openFoundCityDialog}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            <CellsList
              cells={filteredCells}
              loading={cellsLoading}
              canColonize={canColonize}
              canFoundCity={canFoundCity}
              onColonize={openColonizeDialog}
              onFoundCity={openFoundCityDialog}
            />
          </TabsContent>
        </Tabs>

        {/* Colonize Dialog */}
        <ColonizeDialog
          open={colonizeDialogOpen}
          onOpenChange={setColonizeDialogOpen}
          selectedCell={selectedCell}
          userTerritories={userTerritories || []}
          selectedTerritoryId={selectedTerritoryId}
          onSelectedTerritoryIdChange={setSelectedTerritoryId}
          useToken={useToken}
          onUseTokenChange={setUseToken}
          onConfirm={() => {
            if (selectedCell && selectedTerritoryId) {
              colonizeMutation.mutate({
                cellId: selectedCell.id,
                territoryId: selectedTerritoryId,
                useToken,
              });
            }
          }}
          isPending={colonizeMutation.isPending}
          userTokens={userTokens}
        />

        {/* Found City Dialog */}
        <FoundCityDialog
          open={foundCityDialogOpen}
          onOpenChange={setFoundCityDialogOpen}
          selectedCell={selectedCell}
          userTokens={userTokens}
          onConfirm={(name) => {
            if (selectedCell && name.trim()) {
              foundCityMutation.mutate({
                cellId: selectedCell.id,
                territoryId: selectedCell.owner_territory_id!,
                cityName: name.trim(),
              });
            }
          }}
          isPending={foundCityMutation.isPending}
        />
      </div>
    </Layout>
  );
}