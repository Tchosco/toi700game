import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Lock, CheckCircle2, Star, Loader2, Flag, Map, Building, Users, Coins, Handshake, Gavel, FlaskConical, Swords, Bird, Globe, ShoppingCart } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  requirements: any;
  is_secret: boolean;
}

interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

const iconMap: Record<string, any> = {
  trophy: Trophy,
  flag: Flag,
  map: Map,
  globe: Globe,
  building: Building,
  flask: FlaskConical,
  dove: Bird,
  users: Users,
  coins: Coins,
  handshake: Handshake,
  gavel: Gavel,
  swords: Swords,
  'shopping-cart': ShoppingCart,
};

const categoryLabels: Record<string, string> = {
  territory: 'Território',
  population: 'População',
  economy: 'Economia',
  diplomacy: 'Diplomacia',
  politics: 'Política',
  science: 'Ciência',
  military: 'Militar',
  general: 'Geral',
};

export default function AchievementsPage() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchAchievements();
  }, [user]);

  async function fetchAchievements() {
    setLoading(true);
    
    const { data: achievementsData } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true })
      .order('points', { ascending: true });
    
    if (achievementsData) {
      setAchievements(achievementsData);
    }

    if (user) {
      const { data: userAchData } = await supabase
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id);
      
      if (userAchData) {
        setUserAchievements(userAchData);
      }
    }

    setLoading(false);
  }

  const isUnlocked = (achievementId: string) => 
    userAchievements.some(ua => ua.achievement_id === achievementId);

  const getUnlockedDate = (achievementId: string) => {
    const ua = userAchievements.find(ua => ua.achievement_id === achievementId);
    return ua ? new Date(ua.unlocked_at).toLocaleDateString('pt-BR') : null;
  };

  const categories = ['all', ...new Set(achievements.map(a => a.category))];
  
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const earnedPoints = achievements
    .filter(a => isUnlocked(a.id))
    .reduce((sum, a) => sum + a.points, 0);

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              Conquistas
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete objetivos para desbloquear conquistas e ganhar pontos
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{unlockedCount}/{totalCount}</p>
                    <p className="text-sm text-muted-foreground">Conquistas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-accent/20">
                    <Star className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{earnedPoints}</p>
                    <p className="text-sm text-muted-foreground">Pontos Totais</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{Math.round((unlockedCount / totalCount) * 100)}%</span>
                  </div>
                  <Progress value={(unlockedCount / totalCount) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">Todas</TabsTrigger>
            {categories.filter(c => c !== 'all').map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements.map(achievement => {
                const unlocked = isUnlocked(achievement.id);
                const unlockedDate = getUnlockedDate(achievement.id);
                const IconComponent = iconMap[achievement.icon] || Trophy;

                return (
                  <Card 
                    key={achievement.id}
                    className={`transition-all ${
                      unlocked 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-card/50 border-border/50 opacity-75'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-full ${unlocked ? 'bg-primary/30' : 'bg-muted'}`}>
                          <IconComponent className={`h-6 w-6 ${unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={unlocked ? "default" : "outline"} className="text-xs">
                            {achievement.points} pts
                          </Badge>
                          {unlocked ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-lg">{achievement.name}</CardTitle>
                      <CardDescription>{achievement.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline">{categoryLabels[achievement.category] || achievement.category}</Badge>
                        {unlocked && unlockedDate && (
                          <span>Desbloqueado em {unlockedDate}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
