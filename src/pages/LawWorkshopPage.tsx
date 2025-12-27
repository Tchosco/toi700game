import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  FileText, 
  Plus, 
  X, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  Scale,
  DollarSign,
  Users,
  Map,
  Shield,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Puzzle
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Territory {
  id: string;
  name: string;
}

interface LawBlock {
  id: string;
  type: 'economic' | 'social' | 'territorial' | 'military' | 'scientific';
  name: string;
  description: string;
  bonus: string[];
  penalties: string[];
  sympathyModifier: number;
  repulsionModifier: number;
  ideologyAffinity: string;
}

const LAW_BLOCKS: LawBlock[] = [
  // Economic Blocks
  {
    id: 'tax_reduction',
    type: 'economic',
    name: 'Redução de Impostos',
    description: 'Diminui a carga tributária sobre a população',
    bonus: ['Aumento da atividade comercial', 'Maior satisfação popular'],
    penalties: ['Redução de receita estatal'],
    sympathyModifier: 15,
    repulsionModifier: 5,
    ideologyAffinity: 'liberal',
  },
  {
    id: 'tax_increase',
    type: 'economic',
    name: 'Aumento de Impostos',
    description: 'Aumenta a arrecadação estatal',
    bonus: ['Maior receita para o tesouro', 'Mais recursos para investimentos'],
    penalties: ['Insatisfação popular', 'Redução do comércio'],
    sympathyModifier: -10,
    repulsionModifier: 20,
    ideologyAffinity: 'statist',
  },
  {
    id: 'free_trade',
    type: 'economic',
    name: 'Livre Comércio',
    description: 'Remove barreiras comerciais com outros territórios',
    bonus: ['Aumento de importações/exportações', 'Preços mais baixos'],
    penalties: ['Competição com produtores locais'],
    sympathyModifier: 10,
    repulsionModifier: 8,
    ideologyAffinity: 'liberal',
  },
  {
    id: 'protectionism',
    type: 'economic',
    name: 'Protecionismo',
    description: 'Protege a indústria local com tarifas',
    bonus: ['Fortalece produtores nacionais', 'Menos dependência externa'],
    penalties: ['Preços mais altos', 'Menos variedade'],
    sympathyModifier: 8,
    repulsionModifier: 12,
    ideologyAffinity: 'nationalist',
  },
  // Social Blocks
  {
    id: 'public_health',
    type: 'social',
    name: 'Saúde Pública',
    description: 'Investe em serviços de saúde para todos',
    bonus: ['Aumento da expectativa de vida', 'Crescimento populacional'],
    penalties: ['Alto custo de manutenção'],
    sympathyModifier: 20,
    repulsionModifier: 3,
    ideologyAffinity: 'social',
  },
  {
    id: 'education',
    type: 'social',
    name: 'Educação Universal',
    description: 'Garante educação gratuita para todos',
    bonus: ['Aumento de produção tecnológica', 'Mão de obra qualificada'],
    penalties: ['Alto investimento necessário'],
    sympathyModifier: 18,
    repulsionModifier: 2,
    ideologyAffinity: 'progressive',
  },
  {
    id: 'labor_rights',
    type: 'social',
    name: 'Direitos Trabalhistas',
    description: 'Protege os trabalhadores com leis específicas',
    bonus: ['Maior satisfação dos trabalhadores', 'Estabilidade social'],
    penalties: ['Custos trabalhistas maiores', 'Menos flexibilidade'],
    sympathyModifier: 15,
    repulsionModifier: 10,
    ideologyAffinity: 'labor',
  },
  // Territorial Blocks
  {
    id: 'colonization_incentive',
    type: 'territorial',
    name: 'Incentivo à Colonização',
    description: 'Facilita a expansão para novas células',
    bonus: ['Custo de colonização reduzido', 'Mais células disponíveis'],
    penalties: ['Tensões com vizinhos'],
    sympathyModifier: 10,
    repulsionModifier: 15,
    ideologyAffinity: 'expansionist',
  },
  {
    id: 'urban_development',
    type: 'territorial',
    name: 'Desenvolvimento Urbano',
    description: 'Prioriza o crescimento das cidades',
    bonus: ['Maior produção urbana', 'Tecnologia acelerada'],
    penalties: ['Êxodo rural', 'Pressão sobre alimentos'],
    sympathyModifier: 12,
    repulsionModifier: 8,
    ideologyAffinity: 'urban',
  },
  {
    id: 'rural_preservation',
    type: 'territorial',
    name: 'Preservação Rural',
    description: 'Protege e incentiva áreas rurais',
    bonus: ['Produção de alimentos aumentada', 'Equilíbrio populacional'],
    penalties: ['Menos industrialização'],
    sympathyModifier: 14,
    repulsionModifier: 6,
    ideologyAffinity: 'agrarian',
  },
  // Military Blocks
  {
    id: 'military_buildup',
    type: 'military',
    name: 'Rearmamento Militar',
    description: 'Investe pesadamente em forças armadas',
    bonus: ['Maior poder militar', 'Dissuasão de ataques'],
    penalties: ['Alto custo', 'Tensões diplomáticas'],
    sympathyModifier: 8,
    repulsionModifier: 18,
    ideologyAffinity: 'militarist',
  },
  {
    id: 'conscription',
    type: 'military',
    name: 'Serviço Militar Obrigatório',
    description: 'Todo cidadão deve servir nas forças armadas',
    bonus: ['Exército maior', 'Disciplina nacional'],
    penalties: ['Impopular entre jovens', 'Menos mão de obra civil'],
    sympathyModifier: -5,
    repulsionModifier: 25,
    ideologyAffinity: 'authoritarian',
  },
  {
    id: 'pacifism',
    type: 'military',
    name: 'Política Pacifista',
    description: 'Prioriza diplomacia sobre força militar',
    bonus: ['Melhor relações diplomáticas', 'Economia em defesa'],
    penalties: ['Vulnerabilidade militar'],
    sympathyModifier: 15,
    repulsionModifier: 10,
    ideologyAffinity: 'pacifist',
  },
  // Scientific Blocks
  {
    id: 'research_funding',
    type: 'scientific',
    name: 'Financiamento de Pesquisa',
    description: 'Aumenta investimento em ciência e tecnologia',
    bonus: ['Pesquisa acelerada', 'Avanço tecnológico'],
    penalties: ['Alto custo'],
    sympathyModifier: 12,
    repulsionModifier: 5,
    ideologyAffinity: 'technocrat',
  },
  {
    id: 'tech_sharing',
    type: 'scientific',
    name: 'Compartilhamento Tecnológico',
    description: 'Compartilha descobertas com aliados',
    bonus: ['Relações diplomáticas', 'Pesquisa colaborativa'],
    penalties: ['Perde exclusividade tecnológica'],
    sympathyModifier: 10,
    repulsionModifier: 8,
    ideologyAffinity: 'cooperative',
  },
];

const BLOCK_TYPE_INFO = {
  economic: { icon: <DollarSign className="h-4 w-4" />, color: 'text-amber-500', label: 'Econômico' },
  social: { icon: <Users className="h-4 w-4" />, color: 'text-green-500', label: 'Social' },
  territorial: { icon: <Map className="h-4 w-4" />, color: 'text-blue-500', label: 'Territorial' },
  military: { icon: <Shield className="h-4 w-4" />, color: 'text-red-500', label: 'Militar' },
  scientific: { icon: <Sparkles className="h-4 w-4" />, color: 'text-purple-500', label: 'Científico' },
};

export default function LawWorkshopPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<LawBlock[]>([]);
  const [activeBlockType, setActiveBlockType] = useState<string>('economic');

  useEffect(() => {
    fetchTerritories();
  }, [user]);

  async function fetchTerritories() {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('territories')
      .select('id, name')
      .eq('owner_id', user.id)
      .eq('status', 'active');

    if (data && data.length > 0) {
      setTerritories(data);
      setSelectedTerritory(data[0].id);
    }
    setLoading(false);
  }

  const addBlock = (block: LawBlock) => {
    if (selectedBlocks.find(b => b.id === block.id)) {
      toast.error('Este bloco já foi adicionado');
      return;
    }
    if (selectedBlocks.length >= 5) {
      toast.error('Máximo de 5 blocos por lei');
      return;
    }
    setSelectedBlocks([...selectedBlocks, block]);
  };

  const removeBlock = (blockId: string) => {
    setSelectedBlocks(selectedBlocks.filter(b => b.id !== blockId));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalSympathy = 50;
    let totalRepulsion = 50;
    const allBonuses: string[] = [];
    const allPenalties: string[] = [];
    let economicImpact = 0;
    let socialImpact = 0;
    let territorialImpact = 0;
    let militaryImpact = 0;

    selectedBlocks.forEach(block => {
      totalSympathy += block.sympathyModifier;
      totalRepulsion += block.repulsionModifier;
      allBonuses.push(...block.bonus);
      allPenalties.push(...block.penalties);

      switch (block.type) {
        case 'economic':
          economicImpact += 20;
          break;
        case 'social':
          socialImpact += 20;
          break;
        case 'territorial':
          territorialImpact += 20;
          break;
        case 'military':
          militaryImpact += 20;
          break;
      }
    });

    // Excessive blocks increase repulsion
    if (selectedBlocks.length > 3) {
      totalRepulsion += (selectedBlocks.length - 3) * 10;
    }

    return {
      sympathy: Math.max(5, Math.min(95, totalSympathy)),
      repulsion: Math.max(5, Math.min(95, totalRepulsion)),
      bonuses: allBonuses,
      penalties: allPenalties,
      economicImpact,
      socialImpact,
      territorialImpact,
      militaryImpact,
    };
  };

  const totals = calculateTotals();

  const handleCreateLaw = async () => {
    if (!name) {
      toast.error('Digite um nome para a lei');
      return;
    }
    if (selectedBlocks.length === 0) {
      toast.error('Adicione pelo menos um bloco');
      return;
    }
    if (totals.bonuses.length === 0 || totals.penalties.length === 0) {
      toast.error('A lei precisa ter bônus e penalidades');
      return;
    }

    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('create-law', {
        body: {
          name,
          legal_level: 'national',
          category: selectedBlocks[0]?.type || 'economia',
          description,
          territory_id: selectedTerritory,
          positive_effects: totals.bonuses,
          negative_effects: totals.penalties,
          economic_impact: totals.economicImpact,
          social_impact: totals.socialImpact,
          territorial_impact: totals.territorialImpact,
          military_impact: totals.militaryImpact,
          enact_immediately: true,
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      toast.success('Lei promulgada com sucesso!');
      navigate('/leis');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar lei');
    } finally {
      setCreating(false);
    }
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

  if (!user || territories.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Puzzle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {!user ? 'Faça login para criar leis' : 'Você precisa de um território'}
              </p>
              <Link to={user ? '/criar-territorio' : '/auth'}>
                <Button>{user ? 'Criar Território' : 'Entrar'}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Puzzle className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Oficina de Leis</h1>
              <p className="text-muted-foreground">Monte sua lei combinando blocos</p>
            </div>
          </div>

          <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione território" />
            </SelectTrigger>
            <SelectContent>
              {territories.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Block Palette */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5" />
                  Blocos Disponíveis
                </CardTitle>
                <CardDescription>
                  Clique em um bloco para adicionar à sua lei
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeBlockType} onValueChange={setActiveBlockType}>
                  <TabsList className="grid grid-cols-5 w-full">
                    {Object.entries(BLOCK_TYPE_INFO).map(([type, info]) => (
                      <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                        <span className={info.color}>{info.icon}</span>
                        <span className="hidden sm:inline">{info.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.keys(BLOCK_TYPE_INFO).map((type) => (
                    <TabsContent key={type} value={type} className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {LAW_BLOCKS.filter(b => b.type === type).map((block) => {
                          const isSelected = selectedBlocks.find(b => b.id === block.id);
                          const info = BLOCK_TYPE_INFO[block.type];
                          
                          return (
                            <Card 
                              key={block.id}
                              className={`cursor-pointer transition-all hover:border-primary ${
                                isSelected ? 'border-primary bg-primary/5' : ''
                              }`}
                              onClick={() => !isSelected && addBlock(block)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className={`flex items-center gap-2 ${info.color}`}>
                                    {info.icon}
                                    <span className="font-medium">{block.name}</span>
                                  </div>
                                  {isSelected && <Badge variant="secondary">Adicionado</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{block.description}</p>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-green-500 flex items-center gap-1">
                                    <ThumbsUp className="h-3 w-3" />
                                    +{block.sympathyModifier}%
                                  </span>
                                  <span className="text-red-500 flex items-center gap-1">
                                    <ThumbsDown className="h-3 w-3" />
                                    +{block.repulsionModifier}%
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Law Preview */}
          <div className="space-y-4">
            <Card className="glass-card sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sua Lei
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Lei</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Lei de Desenvolvimento Econômico"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Resumo da lei..."
                    className="h-20"
                  />
                </div>

                {/* Selected Blocks */}
                <div className="space-y-2">
                  <Label>Blocos Selecionados ({selectedBlocks.length}/5)</Label>
                  <ScrollArea className="h-[120px]">
                    {selectedBlocks.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">
                        Selecione blocos à esquerda
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedBlocks.map((block) => {
                          const info = BLOCK_TYPE_INFO[block.type];
                          return (
                            <div
                              key={block.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                            >
                              <div className={`flex items-center gap-2 ${info.color}`}>
                                {info.icon}
                                <span className="text-sm">{block.name}</span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => removeBlock(block.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-500 flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        Simpatia
                      </span>
                      <span>{totals.sympathy}%</span>
                    </div>
                    <Progress value={totals.sympathy} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-500 flex items-center gap-1">
                        <ThumbsDown className="h-4 w-4" />
                        Repulsa
                      </span>
                      <span>{totals.repulsion}%</span>
                    </div>
                    <Progress value={totals.repulsion} className="h-2 [&>div]:bg-red-500" />
                  </div>
                </div>

                {/* Effects Preview */}
                {selectedBlocks.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label className="text-green-500">Bônus</Label>
                      <ul className="text-sm space-y-1 mt-1">
                        {totals.bonuses.slice(0, 5).map((bonus, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-green-500">+</span>
                            <span className="text-muted-foreground">{bonus}</span>
                          </li>
                        ))}
                        {totals.bonuses.length > 5 && (
                          <li className="text-muted-foreground">
                            +{totals.bonuses.length - 5} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <Label className="text-red-500">Penalidades</Label>
                      <ul className="text-sm space-y-1 mt-1">
                        {totals.penalties.slice(0, 5).map((penalty, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-red-500">-</span>
                            <span className="text-muted-foreground">{penalty}</span>
                          </li>
                        ))}
                        {totals.penalties.length > 5 && (
                          <li className="text-muted-foreground">
                            +{totals.penalties.length - 5} mais...
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {selectedBlocks.length > 3 && (
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Leis com muitos blocos geram mais repulsa popular (+{(selectedBlocks.length - 3) * 10}%)
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCreateLaw}
                  disabled={creating || selectedBlocks.length === 0 || !name}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="h-4 w-4 mr-2" />
                  )}
                  Promulgar Lei
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
