import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Coins, Send } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type TokenType = Database['public']['Enums']['token_type'];

interface UserWithTokens {
  id: string;
  username: string | null;
  city_tokens: number;
  land_tokens: number;
  state_tokens: number;
}

export default function AdminTokens() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithTokens[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [tokenType, setTokenType] = useState<TokenType>('city');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      toast.error('Erro ao carregar usuários');
      setLoading(false);
      return;
    }

    const { data: tokens, error: tokensError } = await supabase
      .from('user_tokens')
      .select('user_id, city_tokens, land_tokens, state_tokens');

    if (tokensError) {
      toast.error('Erro ao carregar tokens');
      setLoading(false);
      return;
    }

    const usersWithTokens = profiles?.map(profile => {
      const userTokens = tokens?.find(t => t.user_id === profile.id);
      return {
        id: profile.id,
        username: profile.username,
        city_tokens: userTokens?.city_tokens || 0,
        land_tokens: userTokens?.land_tokens || 0,
        state_tokens: userTokens?.state_tokens || 0
      };
    }) || [];

    setUsers(usersWithTokens);
    setLoading(false);
  }

  async function handleSendTokens(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !amount || parseInt(amount) === 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSending(true);
    const amountNum = parseInt(amount);

    // Get current tokens
    const { data: currentTokens, error: fetchError } = await supabase
      .from('user_tokens')
      .select('*')
      .eq('user_id', selectedUser)
      .single();

    if (fetchError) {
      toast.error('Erro ao buscar tokens do usuário');
      setSending(false);
      return;
    }

    // Calculate new values
    const tokenField = `${tokenType}_tokens` as 'city_tokens' | 'land_tokens' | 'state_tokens';
    const newValue = (currentTokens[tokenField] || 0) + amountNum;

    if (newValue < 0) {
      toast.error('Usuário não tem tokens suficientes para debitar');
      setSending(false);
      return;
    }

    // Update tokens
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({ [tokenField]: newValue })
      .eq('user_id', selectedUser);

    if (updateError) {
      toast.error('Erro ao atualizar tokens');
      setSending(false);
      return;
    }

    // Log transaction
    const { error: logError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: selectedUser,
        token_type: tokenType,
        amount: amountNum,
        reason: reason || null,
        admin_id: user?.id
      });

    if (logError) {
      console.error('Error logging transaction:', logError);
    }

    toast.success(`${amountNum > 0 ? 'Enviado' : 'Debitado'} ${Math.abs(amountNum)} ${tokenType} token(s)`);
    
    // Reset form and refresh
    setSelectedUser('');
    setAmount('1');
    setReason('');
    fetchUsers();
    setSending(false);
  }

  const tokenLabels: Record<TokenType, string> = {
    city: 'City Token (CT)',
    land: 'Land Token (LT)',
    state: 'State Token (ST)'
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl text-glow">Gerenciar Tokens</h1>
          <p className="text-muted-foreground mt-1">
            Distribua tokens para governantes
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send tokens form */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Enviar Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTokens} className="space-y-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.username || u.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Token</Label>
                  <Select value={tokenType} onValueChange={(v) => setTokenType(v as TokenType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">{tokenLabels.city}</SelectItem>
                      <SelectItem value="land">{tokenLabels.land}</SelectItem>
                      <SelectItem value="state">{tokenLabels.state}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quantidade (negativo para debitar)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Participação em evento..."
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Coins className="h-4 w-4 mr-2" />}
                  Enviar Tokens
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users list */}
          <Card className="lg:col-span-2 border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Saldo de Tokens por Usuário</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário registrado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Usuário</th>
                        <th className="text-center py-2 font-medium text-token-city">CT</th>
                        <th className="text-center py-2 font-medium text-token-land">LT</th>
                        <th className="text-center py-2 font-medium text-token-state">ST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-border/50">
                          <td className="py-2">{u.username || u.id.slice(0, 8)}</td>
                          <td className="text-center py-2 text-token-city">{u.city_tokens}</td>
                          <td className="text-center py-2 text-token-land">{u.land_tokens}</td>
                          <td className="text-center py-2 text-token-state">{u.state_tokens}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
