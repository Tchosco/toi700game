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
import { 
  FlaskConical, Loader2, CheckCircle2, Lock, AlertCircle, Play, 
  Swords, Coins, Atom, Palette, Building, Wheat, Pickaxe, Zap,
  Megaphone, Shield, Route, Dna, Cog, Tv, Handshake, Landmark, 
  Target, Crown, Globe, Cpu
} from 'lucide-react';

interface Technology {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  research_cost: number;
  prerequisites: string[];
  effects: any;
  icon: string;
}

interface TerritoryTech {
  technology_id: string;
  researched_at: string;
}

interface ResearchQueue {
  id: string;
  technology_id: string;
  progress: number;
  queue_position: number;
}

const categoryInfo: Record<string, { label: string; icon: any; color: string }> = {
  military: { label: 'Militar', icon: Swords, color: 'bg-red-500/20 text-red-400' },
  economy: { label: 'Economia', icon: Coins, color: 'bg-amber-500/20 text-amber-400' },
  science: { label: 'Ciência', icon: Atom, color: 'bg-blue-500/20 text-blue-400' },
  culture: { label: 'Cultura', icon: Palette, color: 'bg-purple-500/20 text-purple-400' },
  infrastructure: { label: 'Infraestrutura', icon: Building, color: 'bg-green-500/20 text-green-400' },
};

const iconMap: Record<string, any> = {
  wheat: Wheat, pickaxe: Pickaxe, zap: Zap, megaphone: Megaphone, shield: Shield,
  road: Route, dna: Dna, cog: Cog, tv: Tv, swords: Swords, building: Building,
  handshake: Handshake, atom: Atom, cpu: Cpu, landmark: Landmark, target: Target,
  crown: Crown, globe: Globe, flask: FlaskConical,
};

export default function TechTreePage() {
  const { user } = useAuth();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [territoryTechs, setTerritoryTechs] = useState<TerritoryTech[]>([]);
  const [researchQueue, setResearchQueue] = useState<ResearchQueue[]>([]);
  const [territory, setTerritory] = useState<any>(null);
  const [territoryResearch, setTerritoryResearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

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

      // Get territory research points
      const { data: researchData } = await supabase
        .from('territory_research')
        .select('*')
        .eq('territory_id', territoryData.id)
        .single();

      if (researchData) {
        setTerritoryResearch(researchData);
      }

      // Get researched technologies
      const { data: techData } = await supabase
        .from('territory_technologies')
        .select('technology_id, researched_at')
        .eq('territory_id', territoryData.id);

      if (techData) {
        setTerritoryTechs(techData);
      }

      // Get research queue
      const { data: queueData } = await supabase
        .from('territory_research_queue')
        .select('*')
        .eq('territory_id', territoryData.id)
        .order('queue_position');

      if (queueData) {
        setResearchQueue(queueData);
      }
    }

    // Get all technologies
    const { data: allTechs } = await supabase
      .from('technologies')
      .select('*')
      .order('tier')
      .order('category');

    if (allTechs) {
      setTechnologies(allTechs);
    }

    setLoading(false);
  }

  const isResearched = (techId: string) => 
    territoryTechs.some(tt => tt.technology_id === techId);

  const isInQueue = (techId: string) => 
    researchQueue.some(rq => rq.technology_id === techId);

  const canResearch = (tech: Technology) => {
    if (isResearched(tech.id)) return false;
    if (isInQueue(tech.id)) return false;
    // Check prerequisites
    if (tech.prerequisites && tech.prerequisites.length > 0) {
      return tech.prerequisites.every(prereq => isResearched(prereq));
    }
    return true;
  };

  async function startResearch(techId: string) {
    if (!territory) return;

    setResearching(techId);

    const { data, error } = await supabase
      .from('territory_research_queue')
      .insert({
        territory_id: territory.id,
        technology_id: techId,
        progress: 0,
        queue_position: researchQueue.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao iniciar pesquisa');
    } else {
      toast.success('Pesquisa adicionada à fila!');
      setResearchQueue([...researchQueue, data]);
    }

    setResearching(null);
  }

  const categories = ['all', ...Object.keys(categoryInfo)];
  const filteredTechs = selectedCategory === 'all' 
    ? technologies 
    : technologies.filter(t => t.category === selectedCategory);

  const techsByTier = filteredTechs.reduce((acc, tech) => {
    if (!acc[tech.tier]) acc[tech.tier] = [];
    acc[tech.tier].push(tech);
    return acc;
  }, {} as Record<number, Technology[]>);

  const researchedCount = territoryTechs.length;
  const totalCount = technologies.length;

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
            <p className="text-lg font-medium">Faça login para ver tecnologias</p>
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
            <p className="text-lg font-medium">Crie um território para pesquisar tecnologias</p>
          </CardContent>
        </Card>
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
              <FlaskConical className="h-8 w-8 text-primary" />
              Árvore Tecnológica
            </h1>
            <p className="text-muted-foreground mt-1">
              Pesquise novas tecnologias para fortalecer seu território
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <FlaskConical className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{researchedCount}/{totalCount}</p>
                    <p className="text-sm text-muted-foreground">Tecnologias</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-500/20">
                    <Atom className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{territoryResearch?.research_points || 0}</p>
                    <p className="text-sm text-muted-foreground">Pontos de Pesquisa</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>{Math.round((researchedCount / totalCount) * 100)}%</span>
                  </div>
                  <Progress value={(researchedCount / totalCount) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Research Queue */}
          {researchQueue.length > 0 && (
            <Card className="bg-primary/10 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Fila de Pesquisa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {researchQueue.map((rq, idx) => {
                    const tech = technologies.find(t => t.id === rq.technology_id);
                    if (!tech) return null;
                    const catInfo = categoryInfo[tech.category];
                    return (
                      <Badge key={rq.id} variant="outline" className="gap-2 py-1.5">
                        {idx === 0 && <Loader2 className="h-3 w-3 animate-spin" />}
                        <span className={catInfo?.color}>{tech.name}</span>
                        <span className="text-muted-foreground">
                          {rq.progress}/{tech.research_cost}
                        </span>
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">Todas</TabsTrigger>
            {Object.entries(categoryInfo).map(([key, info]) => {
              const Icon = info.icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-1">
                  <Icon className="h-4 w-4" />
                  {info.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-4 space-y-6">
            {Object.entries(techsByTier).sort(([a], [b]) => Number(a) - Number(b)).map(([tier, techs]) => (
              <div key={tier}>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">Tier {tier}</Badge>
                  <span className="text-muted-foreground text-sm">
                    {tier === '1' ? 'Básico' : tier === '2' ? 'Intermediário' : 'Avançado'}
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {techs.map(tech => {
                    const researched = isResearched(tech.id);
                    const inQueue = isInQueue(tech.id);
                    const canStart = canResearch(tech);
                    const catInfo = categoryInfo[tech.category];
                    const CatIcon = catInfo?.icon || FlaskConical;
                    const TechIcon = iconMap[tech.icon] || FlaskConical;

                    return (
                      <Card 
                        key={tech.id}
                        className={`transition-all ${
                          researched 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : inQueue
                              ? 'bg-primary/10 border-primary/30'
                              : canStart
                                ? 'bg-card/50 border-border/50 hover:border-primary/50'
                                : 'bg-card/30 border-border/30 opacity-60'
                        }`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className={`p-2 rounded-lg ${catInfo?.color || 'bg-muted'}`}>
                              <TechIcon className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {tech.research_cost} pts
                              </Badge>
                              {researched ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : inQueue ? (
                                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                              ) : !canStart ? (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              ) : null}
                            </div>
                          </div>
                          <CardTitle className="text-base">{tech.name}</CardTitle>
                          <CardDescription className="text-xs">{tech.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Efeitos:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(tech.effects).map(([key, value]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key.replace(/_/g, ' ')}: {(value as number) > 0 ? '+' : ''}{((value as number) * 100).toFixed(0)}%
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                        {!researched && !inQueue && (
                          <CardFooter>
                            <Button 
                              size="sm" 
                              className="w-full"
                              disabled={!canStart || researching === tech.id}
                              onClick={() => startResearch(tech.id)}
                            >
                              {researching === tech.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <FlaskConical className="h-4 w-4 mr-2" />
                              )}
                              Pesquisar
                            </Button>
                          </CardFooter>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
