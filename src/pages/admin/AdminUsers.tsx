import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Shield, ShieldOff, Users } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  username: string | null;
  created_at: string;
  roles: AppRole[];
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast.error('Erro ao carregar papéis');
      setLoading(false);
      return;
    }

    const usersWithRoles = profiles?.map(profile => ({
      ...profile,
      roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
    })) || [];

    setUsers(usersWithRoles);
    setLoading(false);
  }

  async function toggleAdmin(userId: string, isCurrentlyAdmin: boolean) {
    if (userId === currentUser?.id) {
      toast.error('Você não pode remover seu próprio papel de admin');
      return;
    }

    setUpdating(userId);

    if (isCurrentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) {
        toast.error('Erro ao remover papel de admin');
      } else {
        toast.success('Papel de admin removido');
        fetchUsers();
      }
    } else {
      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) {
        if (error.code === '23505') {
          toast.error('Usuário já é admin');
        } else {
          toast.error('Erro ao adicionar papel de admin');
        }
      } else {
        toast.success('Usuário promovido a admin');
        fetchUsers();
      }
    }

    setUpdating(null);
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-glow">Gerenciar Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Visualize usuários e gerencie permissões de administrador
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum usuário registrado.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Usuários Registrados ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((u) => {
                  const isAdmin = u.roles.includes('admin');
                  const isCurrentUser = u.id === currentUser?.id;
                  
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {(u.username || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{u.username || 'Sem nome'}</span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Badge className="bg-status-warning/20 text-status-warning border-status-warning/30">
                            Admin
                          </Badge>
                        )}
                        
                        <Button
                          size="sm"
                          variant={isAdmin ? 'destructive' : 'outline'}
                          onClick={() => toggleAdmin(u.id, isAdmin)}
                          disabled={updating === u.id || isCurrentUser}
                        >
                          {updating === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isAdmin ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-1" />
                              Remover Admin
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-1" />
                              Tornar Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
