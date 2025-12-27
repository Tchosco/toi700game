import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scale, 
  Globe, 
  Users2, 
  Crown, 
  ChevronDown, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText
} from 'lucide-react';

interface Law {
  id: string;
  name: string;
  legal_level: 'planetary' | 'bloc' | 'national';
  category: string;
  description: string;
  status: string;
  is_constitution: boolean;
  enacted_at: string;
  population_sympathy: number;
  population_repulsion: number;
  territory?: { name: string };
  geopolitical_blocs?: { name: string };
}

interface HierarchyLevel {
  level: 'planetary' | 'bloc' | 'national';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const HIERARCHY_LEVELS: HierarchyLevel[] = [
  {
    level: 'planetary',
    label: 'Leis Planetárias',
    description: 'Vigoram em todo o planeta TOI-700. Têm precedência sobre todas as outras.',
    icon: <Globe className="h-6 w-6" />,
    color: 'text-purple-500',
  },
  {
    level: 'bloc',
    label: 'Leis de Bloco',
    description: 'Aplicam-se a todos os membros de um bloco geopolítico.',
    icon: <Users2 className="h-6 w-6" />,
    color: 'text-blue-500',
  },
  {
    level: 'national',
    label: 'Leis Nacionais',
    description: 'Leis internas de cada território. Devem respeitar as leis superiores.',
    icon: <Crown className="h-6 w-6" />,
    color: 'text-amber-500',
  },
];

export default function LegalHierarchyPage() {
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLaws();
  }, []);

  async function fetchLaws() {
    const { data } = await supabase
      .from('laws')
      .select(`
        *,
        territories:territory_id(name),
        geopolitical_blocs:bloc_id(name)
      `)
      .eq('status', 'enacted')
      .order('legal_level')
      .order('enacted_at', { ascending: false });

    if (data) {
      setLaws(data as unknown as Law[]);
    }
    setLoading(false);
  }

  const planetaryLaws = laws.filter(l => l.legal_level === 'planetary');
  const blocLaws = laws.filter(l => l.legal_level === 'bloc');
  const nationalLaws = laws.filter(l => l.legal_level === 'national');

  const renderLawCard = (law: Law) => {
    const levelInfo = HIERARCHY_LEVELS.find(h => h.level === law.legal_level);
    
    return (
      <Card key={law.id} className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{law.name}</h3>
                {law.is_constitution && (
                  <Badge variant="outline" className="text-purple-500 border-purple-500">
                    Constituição
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{law.description}</p>
            </div>
            <Badge variant="outline">{law.category}</Badge>
          </div>
          
          <div className="flex items-center gap-4 text-sm mt-3">
            <span className="text-green-500">
              Apoio: {law.population_sympathy}%
            </span>
            <span className="text-red-500">
              Oposição: {law.population_repulsion}%
            </span>
            {(law as any).territories && (
              <span className="text-muted-foreground">
                Território: {(law as any).territories?.name}
              </span>
            )}
            {(law as any).geopolitical_blocs && (
              <span className="text-muted-foreground">
                Bloco: {(law as any).geopolitical_blocs?.name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Scale className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Sistema Legal</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Hierarquia Legal de TOI-700
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Toda lei inferior deve respeitar as leis superiores. Conflitos geram penalidades de estabilidade.
          </p>
        </div>

        {/* Hierarchy Diagram */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col">
              {HIERARCHY_LEVELS.map((level, index) => (
                <div key={level.level}>
                  <div className={`p-6 ${index > 0 ? 'border-t' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full bg-muted ${level.color}`}>
                        {level.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg ${level.color}`}>{level.label}</h3>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                      <Badge variant="outline" className="text-lg px-4 py-1">
                        {level.level === 'planetary' ? planetaryLaws.length : 
                         level.level === 'bloc' ? blocLaws.length : nationalLaws.length}
                      </Badge>
                    </div>
                  </div>
                  {index < HIERARCHY_LEVELS.length - 1 && (
                    <div className="flex justify-center py-2 bg-muted/30">
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Laws by Level */}
        <Tabs defaultValue="planetary" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="planetary" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Planetárias ({planetaryLaws.length})
            </TabsTrigger>
            <TabsTrigger value="bloc" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Blocos ({blocLaws.length})
            </TabsTrigger>
            <TabsTrigger value="national" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Nacionais ({nationalLaws.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planetary" className="space-y-4 mt-6">
            {planetaryLaws.length > 0 ? (
              <div className="space-y-4">
                {planetaryLaws.map(renderLawCard)}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma lei planetária em vigor
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Leis planetárias são aprovadas pelo Conselho Planetário
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bloc" className="space-y-4 mt-6">
            {blocLaws.length > 0 ? (
              <div className="space-y-4">
                {blocLaws.map(renderLawCard)}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma lei de bloco em vigor
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Leis de bloco são aprovadas pelos parlamentos de cada bloco
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="national" className="space-y-4 mt-6">
            {nationalLaws.length > 0 ? (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {nationalLaws.map(renderLawCard)}
                </div>
              </ScrollArea>
            ) : (
              <Card className="glass-card">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Crown className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma lei nacional em vigor
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Cada território pode decretar suas próprias leis
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Conflict Rules */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Regras de Conflito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <h4 className="font-medium text-red-500 mb-2">Conflito Detectado</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• A parte conflitante da lei inferior é <strong>anulada</strong></li>
                  <li>• O território sofre <strong>-5% estabilidade</strong></li>
                  <li>• Alerta é emitido ao governante</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <h4 className="font-medium text-green-500 mb-2">Lei Válida</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Nenhum conflito com leis superiores</li>
                  <li>• Entra em vigor imediatamente</li>
                  <li>• Efeitos aplicados ao território</li>
                </ul>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium mb-2">Precedência Legal</h4>
              <p className="text-sm text-muted-foreground">
                Em caso de conflito, sempre prevalece a lei do nível superior:
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm">
                <Badge className="bg-purple-500">Planetária</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-blue-500">Bloco</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge className="bg-amber-500">Nacional</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
