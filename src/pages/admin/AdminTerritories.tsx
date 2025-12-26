import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import type { Database } from '@/integrations/supabase/types';

type Territory = Database['public']['Tables']['territories']['Row'];
type TerritoryStatus = Database['public']['Enums']['territory_status'];

interface TerritoryWithProfile extends Territory {
  profiles: { username: string | null } | null;
  regions: { name: string } | null;
}

export default function AdminTerritories() {
  const [territories, setTerritories] = useState<TerritoryWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TerritoryStatus | 'all'>('pending');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchTerritories();
  }, [filter]);

  async function fetchTerritories() {
    setLoading(true);
    let query = supabase
      .from('territories')
      .select(`
        *,
        regions:region_id(name)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: territoriesData, error } = await query;
    
    // Fetch profiles separately
    const ownerIds = territoriesData?.map(t => t.owner_id).filter(Boolean) || [];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ownerIds);
    
    const data = territoriesData?.map(t => ({
      ...t,
      profiles: profilesData?.find(p => p.id === t.owner_id) || null
    }));

    if (error) {
      toast.error('Erro ao carregar territórios');
      console.error(error);
    } else {
      setTerritories(data as TerritoryWithProfile[] || []);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, status: TerritoryStatus) {
    setUpdating(id);
    const { error } = await supabase
      .from('territories')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    } else {
      toast.success(`Território ${status === 'approved' ? 'aprovado' : status === 'rejected' ? 'rejeitado' : 'atualizado'}`);
      fetchTerritories();
    }
    setUpdating(null);
  }

  const getStatusBadge = (status: TerritoryStatus) => {
    const styles: Record<TerritoryStatus, string> = {
      pending: 'bg-status-pending/20 text-status-pending border-status-pending/30',
      approved: 'bg-status-active/20 text-status-active border-status-active/30',
      rejected: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30',
      active: 'bg-status-active/20 text-status-active border-status-active/30',
      inactive: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30'
    };
    return styles[status];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-glow">Gerenciar Territórios</h1>
            <p className="text-muted-foreground mt-1">
              Aprove ou rejeite solicitações de territórios
            </p>
          </div>
          
          <Select value={filter} onValueChange={(v) => setFilter(v as TerritoryStatus | 'all')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : territories.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum território encontrado com este filtro.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {territories.map((territory) => (
              <Card key={territory.id} className="border-border/50 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{territory.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Governante: {territory.profiles?.username || 'Desconhecido'}
                      </p>
                    </div>
                    <Badge className={getStatusBadge(territory.status)}>
                      {territory.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-muted-foreground">Região:</span>
                      <p>{territory.regions?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Governo:</span>
                      <p className="capitalize">{territory.government_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estilo:</span>
                      <p className="capitalize">{territory.style}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nível:</span>
                      <p className="capitalize">{territory.level}</p>
                    </div>
                  </div>
                  
                  {territory.lore && (
                    <div className="mb-4">
                      <span className="text-muted-foreground text-sm">Lore:</span>
                      <p className="text-sm mt-1">{territory.lore}</p>
                    </div>
                  )}

                  {territory.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(territory.id, 'approved')}
                        disabled={updating === territory.id}
                        className="bg-status-active hover:bg-status-active/80"
                      >
                        {updating === territory.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(territory.id, 'rejected')}
                        disabled={updating === territory.id}
                      >
                        {updating === territory.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  
                  {territory.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(territory.id, 'active')}
                      disabled={updating === territory.id}
                    >
                      {updating === territory.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : null}
                      Ativar Território
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
