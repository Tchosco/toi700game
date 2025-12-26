import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Users, CalendarDays, Clock } from 'lucide-react';
import AdminLayout from './AdminLayout';

interface Stats {
  totalTerritories: number;
  pendingTerritories: number;
  totalUsers: number;
  activeEvents: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTerritories: 0,
    pendingTerritories: 0,
    totalUsers: 0,
    activeEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: totalTerritories },
        { count: pendingTerritories },
        { count: totalUsers },
        { count: activeEvents }
      ] = await Promise.all([
        supabase.from('territories').select('*', { count: 'exact', head: true }),
        supabase.from('territories').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('planetary_events').select('*', { count: 'exact', head: true }).eq('is_active', true)
      ]);

      setStats({
        totalTerritories: totalTerritories || 0,
        pendingTerritories: pendingTerritories || 0,
        totalUsers: totalUsers || 0,
        activeEvents: activeEvents || 0
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Territórios',
      value: stats.totalTerritories,
      icon: MapPin,
      color: 'text-primary'
    },
    {
      title: 'Pendentes de Aprovação',
      value: stats.pendingTerritories,
      icon: Clock,
      color: 'text-status-warning'
    },
    {
      title: 'Usuários Registrados',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-token-state'
    },
    {
      title: 'Eventos Ativos',
      value: stats.activeEvents,
      icon: CalendarDays,
      color: 'text-status-active'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl text-glow">Painel Administrativo</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o planeta TOI-700 como Administrador Planetário
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-border/50 bg-card/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {loading ? '...' : stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Revise territórios pendentes na seção "Territórios"
              </p>
              <p className="text-sm text-muted-foreground">
                • Distribua tokens para usuários na seção "Tokens"
              </p>
              <p className="text-sm text-muted-foreground">
                • Crie eventos planetários na seção "Eventos"
              </p>
              <p className="text-sm text-muted-foreground">
                • Promova usuários a admin na seção "Usuários"
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Sobre o Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                O simulador TOI-700 é um sistema de governança micronacional
                onde usuários podem criar e administrar territórios.
              </p>
              <p className="text-sm text-muted-foreground">
                Como Administrador Planetário, você controla a aprovação
                de territórios, distribuição de tokens e eventos globais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
