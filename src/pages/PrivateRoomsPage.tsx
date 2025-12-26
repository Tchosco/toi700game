import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Plus, Users, MessageSquare, UserPlus, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PrivateRoomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });
  const [selectedInviteTerritory, setSelectedInviteTerritory] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // Fetch user territory
  const { data: userTerritory } = useQuery({
    queryKey: ['user-active-territory', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('territories')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch my rooms (created by me or invited)
  const { data: myRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['my-private-rooms', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get rooms I created
      const { data: createdRooms, error: err1 } = await supabase
        .from('discussion_spaces')
        .select('*')
        .eq('space_type', 'private_room')
        .eq('created_by', user.id);
      
      // Get rooms I'm invited to
      const { data: invitations } = await supabase
        .from('room_invitations')
        .select('room_id')
        .eq('status', 'accepted')
        .in('invited_territory_id', userTerritory ? [userTerritory.id] : []);
      
      const invitedRoomIds = invitations?.map(i => i.room_id) || [];
      
      let invitedRooms: any[] = [];
      if (invitedRoomIds.length > 0) {
        const { data } = await supabase
          .from('discussion_spaces')
          .select('*')
          .in('id', invitedRoomIds);
        invitedRooms = data || [];
      }
      
      return [...(createdRooms || []), ...invitedRooms];
    },
    enabled: !!user?.id,
  });

  // Fetch pending invitations
  const { data: pendingInvitations } = useQuery({
    queryKey: ['pending-invitations', userTerritory?.id],
    queryFn: async () => {
      if (!userTerritory?.id) return [];
      const { data, error } = await supabase
        .from('room_invitations')
        .select(`
          *,
          discussion_spaces(name, description)
        `)
        .eq('invited_territory_id', userTerritory.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data;
    },
    enabled: !!userTerritory?.id,
  });

  // Fetch all territories for inviting
  const { data: allTerritories } = useQuery({
    queryKey: ['all-territories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name')
        .eq('status', 'active')
        .neq('owner_id', user?.id || '');
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch messages for selected room
  const { data: roomTopics } = useQuery({
    queryKey: ['room-topics', selectedRoom],
    queryFn: async () => {
      if (!selectedRoom) return [];
      const { data, error } = await supabase
        .from('discussion_topics')
        .select(`*, territories:author_territory_id(name)`)
        .eq('space_id', selectedRoom)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedRoom,
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('discussion_spaces')
        .insert({
          space_type: 'private_room',
          name: data.name,
          description: data.description,
          is_private: true,
          created_by: user.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sala criada!' });
      queryClient.invalidateQueries({ queryKey: ['my-private-rooms'] });
      setNewRoomOpen(false);
      setRoomForm({ name: '', description: '' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (territoryId: string) => {
      if (!selectedRoom || !user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('room_invitations')
        .insert({
          room_id: selectedRoom,
          invited_territory_id: territoryId,
          invited_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Convite enviado!' });
      setInviteOpen(false);
      setSelectedInviteTerritory('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Respond to invitation mutation
  const respondInvitationMutation = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase
        .from('room_invitations')
        .update({ status: accept ? 'accepted' : 'rejected' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: variables.accept ? 'Convite aceito!' : 'Convite recusado' });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['my-private-rooms'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedRoom || !user?.id) throw new Error('Não autorizado');
      const { error } = await supabase
        .from('discussion_topics')
        .insert({
          space_id: selectedRoom,
          title: 'Mensagem',
          content,
          author_id: user.id,
          author_territory_id: userTerritory?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-topics', selectedRoom] });
      setMessageContent('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const currentRoom = myRooms?.find(r => r.id === selectedRoom);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow flex items-center gap-3">
            <Lock className="h-8 w-8 text-purple-500" />
            Salas Diplomáticas Privadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Diplomacia sigilosa e pactos estratégicos
          </p>
        </div>

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Convites Pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvitations.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-card/50">
                  <div>
                    <p className="font-medium">{(inv.discussion_spaces as any)?.name}</p>
                    <p className="text-sm text-muted-foreground">{(inv.discussion_spaces as any)?.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => respondInvitationMutation.mutate({ id: inv.id, accept: true })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => respondInvitationMutation.mutate({ id: inv.id, accept: false })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rooms List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Suas Salas</h2>
              {userTerritory && (
                <Dialog open={newRoomOpen} onOpenChange={setNewRoomOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Sala</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Sala Privada</DialogTitle>
                      <DialogDescription>Crie um espaço sigiloso para diplomacia</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome da Sala</Label>
                        <Input 
                          value={roomForm.name}
                          onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                          placeholder="Ex: Aliança Secreta"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea 
                          value={roomForm.description}
                          onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                          placeholder="Propósito da sala..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => createRoomMutation.mutate(roomForm)} disabled={createRoomMutation.isPending}>
                        {createRoomMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Criar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {roomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : myRooms && myRooms.length > 0 ? (
              <div className="space-y-2">
                {myRooms.map(room => (
                  <Card 
                    key={room.id}
                    className={`cursor-pointer transition-all hover:border-purple-500/50 ${
                      selectedRoom === room.id ? 'border-purple-500 bg-purple-500/5' : 'bg-card/50'
                    }`}
                    onClick={() => setSelectedRoom(room.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-purple-500" />
                        <h3 className="font-medium">{room.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{room.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-card/50">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Você não tem salas privadas ainda.
                </CardContent>
              </Card>
            )}
          </div>

          {/* Room Detail */}
          <div className="lg:col-span-2">
            {selectedRoom && currentRoom ? (
              <Card className="bg-card/50 h-full flex flex-col">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-purple-500" />
                        {currentRoom.name}
                      </CardTitle>
                      <CardDescription>{currentRoom.description}</CardDescription>
                    </div>
                    {currentRoom.created_by === user?.id && (
                      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <UserPlus className="h-4 w-4 mr-1" />
                            Convidar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Convidar Território</DialogTitle>
                          </DialogHeader>
                          <div>
                            <Label>Selecionar Território</Label>
                            <Select value={selectedInviteTerritory} onValueChange={setSelectedInviteTerritory}>
                              <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                              <SelectContent>
                                {allTerritories?.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={() => inviteMutation.mutate(selectedInviteTerritory)}
                              disabled={!selectedInviteTerritory || inviteMutation.isPending}
                            >
                              Enviar Convite
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                  {roomTopics?.map(topic => (
                    <div 
                      key={topic.id} 
                      className={`p-3 rounded-lg max-w-[80%] ${
                        topic.author_id === user?.id 
                          ? 'bg-purple-500/20 ml-auto' 
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {(topic.territories as any)?.name || 'Anônimo'}
                      </div>
                      <p className="text-sm">{topic.content}</p>
                    </div>
                  ))}
                </CardContent>
                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && messageContent.trim() && sendMessageMutation.mutate(messageContent)}
                    />
                    <Button 
                      onClick={() => sendMessageMutation.mutate(messageContent)}
                      disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    >
                      Enviar
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="bg-card/50 h-full">
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  Selecione uma sala para ver as mensagens
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
