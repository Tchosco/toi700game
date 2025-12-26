import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, CalendarDays, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type EventType = Database['public']['Enums']['event_type'];
type PlanetaryEvent = Database['public']['Tables']['planetary_events']['Row'];

interface EventWithRegion extends PlanetaryEvent {
  regions: { name: string } | null;
}

export default function AdminEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithRegion[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('global');
  const [regionId, setRegionId] = useState<string>('');
  const [pdReward, setPdReward] = useState('0');
  const [piReward, setPiReward] = useState('0');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchRegions();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('planetary_events')
      .select(`
        *,
        regions:region_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar eventos');
    } else {
      setEvents(data as EventWithRegion[] || []);
    }
    setLoading(false);
  }

  async function fetchRegions() {
    const { data } = await supabase.from('regions').select('id, name');
    setRegions(data || []);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title) {
      toast.error('Título é obrigatório');
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('planetary_events').insert({
      title,
      description: description || null,
      event_type: eventType,
      region_id: regionId || null,
      pd_reward: parseInt(pdReward) || 0,
      pi_reward: parseInt(piReward) || 0,
      is_active: isActive,
      created_by: user?.id
    });

    if (error) {
      toast.error('Erro ao criar evento');
      console.error(error);
    } else {
      toast.success('Evento criado com sucesso!');
      resetForm();
      fetchEvents();
    }
    setCreating(false);
  }

  async function toggleEventActive(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('planetary_events')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar evento');
    } else {
      toast.success(`Evento ${!currentStatus ? 'ativado' : 'desativado'}`);
      fetchEvents();
    }
  }

  async function deleteEvent(id: string) {
    const { error } = await supabase
      .from('planetary_events')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir evento');
    } else {
      toast.success('Evento excluído');
      fetchEvents();
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setEventType('global');
    setRegionId('');
    setPdReward('0');
    setPiReward('0');
    setIsActive(true);
    setShowForm(false);
  }

  const eventTypeLabels: Record<EventType, string> = {
    global: 'Global',
    regional: 'Regional',
    crisis: 'Crise',
    conference: 'Conferência',
    war: 'Guerra'
  };

  const getEventTypeBadge = (type: EventType) => {
    const styles: Record<EventType, string> = {
      global: 'bg-primary/20 text-primary border-primary/30',
      regional: 'bg-token-land/20 text-token-land border-token-land/30',
      crisis: 'bg-status-inactive/20 text-status-inactive border-status-inactive/30',
      conference: 'bg-token-state/20 text-token-state border-token-state/30',
      war: 'bg-status-warning/20 text-status-warning border-status-warning/30'
    };
    return styles[type];
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-glow">Eventos Planetários</h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie eventos no planeta TOI-700
            </p>
          </div>
          
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>

        {showForm && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Criar Novo Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome do evento"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Evento</Label>
                  <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(eventTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição do evento..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Região (para eventos regionais)</Label>
                  <Select value={regionId} onValueChange={setRegionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhuma (Global)</SelectItem>
                      {regions.map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>Recompensa PD</Label>
                    <Input
                      type="number"
                      value={pdReward}
                      onChange={(e) => setPdReward(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label>Recompensa PI</Label>
                    <Input
                      type="number"
                      value={piReward}
                      onChange={(e) => setPiReward(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Ativo</Label>
                </div>

                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
                    Criar Evento
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : events.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum evento criado ainda.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <Card key={event.id} className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge className={getEventTypeBadge(event.event_type)}>
                          {eventTypeLabels[event.event_type]}
                        </Badge>
                        <Badge variant={event.is_active ? 'default' : 'secondary'}>
                          {event.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      )}
                      
                      <div className="flex gap-4 text-sm">
                        {event.regions?.name && (
                          <span className="text-muted-foreground">Região: {event.regions.name}</span>
                        )}
                        {(event.pd_reward > 0 || event.pi_reward > 0) && (
                          <span className="text-muted-foreground">
                            Recompensas: {event.pd_reward} PD, {event.pi_reward} PI
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleEventActive(event.id, event.is_active)}
                      >
                        {event.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
