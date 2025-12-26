import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Target, Clock, Gift, Loader2, CheckCircle2, AlertCircle, Calendar, Timer, BookOpen, Sparkles, Coins, Zap, FlaskConical } from 'lucide-react';

interface Mission {
  id: string;
  name: string;
  description: string | null;
  mission_type: string;
  objectives: any;
  rewards: any;
  duration_hours: number | null;
  is_active: boolean | null;
}

interface TerritoryMission {
  id: string;
  territory_id: string;
  mission_id: string;
  status: string;
  progress: any;
  started_at: string;
  completed_at: string | null;
  expires_at: string | null;
  mission?: Mission;
}

const missionTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  daily: { label: 'Diária', icon: Calendar, color: 'bg-blue-500/20 text-blue-400' },
  weekly: { label: 'Semanal', icon: Timer, color: 'bg-purple-500/20 text-purple-400' },
  story: { label: 'História', icon: BookOpen, color: 'bg-amber-500/20 text-amber-400' },
  special: { label: 'Especial', icon: Sparkles, color: 'bg-pink-500/20 text-pink-400' },
};

const rewardIcons: Record<string, any> = {
  currency: Coins,
  influence: Zap,
  tech_points: FlaskConical,
  research_points: FlaskConical,
  city_token: Target,
  land_token: Target,
};

export default function MissionsPage() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [territoryMissions, setTerritoryMissions] = useState<TerritoryMission[]>([]);
  const [territory, setTerritory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startingMission, setStartingMission] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState('available');

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchData() {
    setLoading(true);

    // Get user's territory
    const { data: territoryData } = await supabase
      .from('territories')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('status', 'active')
      .single();

    if (territoryData) {
      setTerritory(territoryData);

      // Get all active missions
      const { data: missionsData } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('mission_type');

      if (missionsData) {
        setMissions(missionsData);
      }

      // Get territory's missions
      const { data: territoryMissionsData } = await supabase
        .from('territory_missions')
        .select('*, mission:missions(*)')
        .eq('territory_id', territoryData.id);

      if (territoryMissionsData) {
        setTerritoryMissions(territoryMissionsData as any);
      }
    }

    setLoading(false);
  }

  async function startMission(missionId: string) {
    if (!territory) return;

    setStartingMission(missionId);

    const mission = missions.find(m => m.id === missionId);
    let expiresAt = null;

    if (mission?.duration_hours) {
      const expires = new Date();
      expires.setHours(expires.getHours() + mission.duration_hours);
      expiresAt = expires.toISOString();
    }

    const { data, error } = await supabase
      .from('territory_missions')
      .insert({
        territory_id: territory.id,
        mission_id: missionId,
        status: 'in_progress',
        progress: {},
        expires_at: expiresAt,
      })
      .select('*, mission:missions(*)')
      .single();

    if (error) {
      toast.error('Erro ao iniciar missão');
    } else {
      toast.success('Missão iniciada!');
      setTerritoryMissions([...territoryMissions, data as any]);
    }

    setStartingMission(null);
  }

  const activeMissionIds = territoryMissions.map(tm => tm.mission_id);
  const availableMissions = missions.filter(m => !activeMissionIds.includes(m.id));
  const inProgressMissions = territoryMissions.filter(tm => tm.status === 'in_progress');
  const completedMissions = territoryMissions.filter(tm => tm.status === 'completed');

  function formatTimeRemaining(expiresAt: string | null) {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirada';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Faça login para ver suas missões</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (!territory) {
    return (
      <Layout>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Crie um território para acessar missões</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Missões
          </h1>
          <p className="text-muted-foreground mt-1">
            Complete missões para ganhar recompensas e desenvolver seu território
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Target className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressMissions.length}</p>
                  <p className="text-sm text-muted-foreground">Em Progresso</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedMissions.length}</p>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Gift className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableMissions.length}</p>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="available">Disponíveis ({availableMissions.length})</TabsTrigger>
            <TabsTrigger value="in_progress">Em Progresso ({inProgressMissions.length})</TabsTrigger>
            <TabsTrigger value="completed">Completadas ({completedMissions.length})</TabsTrigger>
          </TabsList>

          {/* Available Missions */}
          <TabsContent value="available" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableMissions.map(mission => {
                const typeInfo = missionTypeLabels[mission.mission_type] || missionTypeLabels.daily;
                const TypeIcon = typeInfo.icon;

                return (
                  <Card key={mission.id} className="bg-card/50 border-border/50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge className={typeInfo.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                        {mission.duration_hours && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {mission.duration_hours}h
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg">{mission.name}</CardTitle>
                      <CardDescription>{mission.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Objetivos:</p>
                          <ul className="space-y-1">
                            {mission.objectives.map((obj: any, idx: number) => (
                              <li key={idx} className="text-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {obj.type.replace(/_/g, ' ')} ({obj.target})
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Recompensas:</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(mission.rewards).map(([key, value]) => {
                              const Icon = rewardIcons[key] || Gift;
                              return (
                                <Badge key={key} variant="outline" className="gap-1">
                                  <Icon className="h-3 w-3" />
                                  {value as number} {key.replace(/_/g, ' ')}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        className="w-full" 
                        onClick={() => startMission(mission.id)}
                        disabled={startingMission === mission.id}
                      >
                        {startingMission === mission.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Target className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Missão
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}

              {availableMissions.length === 0 && (
                <Card className="col-span-full bg-card/50 border-border/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Nenhuma missão disponível no momento</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* In Progress Missions */}
          <TabsContent value="in_progress" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgressMissions.map(tm => {
                const mission = tm.mission || missions.find(m => m.id === tm.mission_id);
                if (!mission) return null;

                const typeInfo = missionTypeLabels[mission.mission_type] || missionTypeLabels.daily;
                const TypeIcon = typeInfo.icon;
                const timeRemaining = formatTimeRemaining(tm.expires_at);

                return (
                  <Card key={tm.id} className="bg-card/50 border-primary/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge className={typeInfo.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeInfo.label}
                        </Badge>
                        {timeRemaining && (
                          <div className="flex items-center gap-1 text-xs text-amber-400">
                            <Clock className="h-3 w-3" />
                            {timeRemaining}
                          </div>
                        )}
                      </div>
                      <CardTitle className="text-lg">{mission.name}</CardTitle>
                      <CardDescription>{mission.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Progresso:</p>
                          {mission.objectives.map((obj: any, idx: number) => {
                            const current = tm.progress?.[obj.type] || 0;
                            const progress = Math.min((current / obj.target) * 100, 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>{obj.type.replace(/_/g, ' ')}</span>
                                  <span>{current}/{obj.target}</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {inProgressMissions.length === 0 && (
                <Card className="col-span-full bg-card/50 border-border/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Nenhuma missão em progresso</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Completed Missions */}
          <TabsContent value="completed" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedMissions.map(tm => {
                const mission = tm.mission || missions.find(m => m.id === tm.mission_id);
                if (!mission) return null;

                return (
                  <Card key={tm.id} className="bg-green-500/10 border-green-500/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge className="bg-green-500/20 text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Completada
                        </Badge>
                        {tm.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(tm.completed_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{mission.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(mission.rewards).map(([key, value]) => {
                          const Icon = rewardIcons[key] || Gift;
                          return (
                            <Badge key={key} variant="outline" className="gap-1 text-green-400 border-green-400/50">
                              <Icon className="h-3 w-3" />
                              +{value as number}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {completedMissions.length === 0 && (
                <Card className="col-span-full bg-card/50 border-border/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Nenhuma missão completada ainda</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
