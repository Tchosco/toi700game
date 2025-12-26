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
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, FileText, Plus, X, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Territory {
  id: string;
  name: string;
}

interface LawTemplate {
  id: string;
  name: string;
  legal_level: string;
  category: string;
  description: string;
  full_text: string;
  positive_effects: string[];
  negative_effects: string[];
  economic_impact: number;
  social_impact: number;
  territorial_impact: number;
  military_impact: number;
  base_sympathy: number;
  base_repulsion: number;
}

const CATEGORIES = [
  'economia',
  'social',
  'militar',
  'territorial',
  'diplomacia',
  'cultura',
  'tecnologia',
  'justiça',
  'administração'
];

export default function CreateLawPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTerritories, setMyTerritories] = useState<Territory[]>([]);
  const [templates, setTemplates] = useState<LawTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Form state
  const [selectedTerritory, setSelectedTerritory] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [fullText, setFullText] = useState('');
  const [positiveEffects, setPositiveEffects] = useState<string[]>([]);
  const [negativeEffects, setNegativeEffects] = useState<string[]>([]);
  const [newPositiveEffect, setNewPositiveEffect] = useState('');
  const [newNegativeEffect, setNewNegativeEffect] = useState('');
  const [economicImpact, setEconomicImpact] = useState(0);
  const [socialImpact, setSocialImpact] = useState(0);
  const [territorialImpact, setTerritorialImpact] = useState(0);
  const [militaryImpact, setMilitaryImpact] = useState(0);

  // Preview
  const [previewSympathy, setPreviewSympathy] = useState<number | null>(null);
  const [previewRepulsion, setPreviewRepulsion] = useState<number | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch territories
      const { data: territoriesData } = await supabase
        .from('territories')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active');

      if (territoriesData) {
        setMyTerritories(territoriesData);
        if (territoriesData.length > 0) {
          setSelectedTerritory(territoriesData[0].id);
        }
      }

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('law_templates')
        .select('*')
        .eq('legal_level', 'national')
        .order('category');

      if (templatesData) {
        setTemplates(templatesData as LawTemplate[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPositiveEffect = () => {
    if (newPositiveEffect.trim()) {
      setPositiveEffects([...positiveEffects, newPositiveEffect.trim()]);
      setNewPositiveEffect('');
    }
  };

  const addNegativeEffect = () => {
    if (newNegativeEffect.trim()) {
      setNegativeEffects([...negativeEffects, newNegativeEffect.trim()]);
      setNewNegativeEffect('');
    }
  };

  const removePositiveEffect = (index: number) => {
    setPositiveEffects(positiveEffects.filter((_, i) => i !== index));
  };

  const removeNegativeEffect = (index: number) => {
    setNegativeEffects(negativeEffects.filter((_, i) => i !== index));
  };

  const applyTemplate = (template: LawTemplate) => {
    setName(template.name);
    setCategory(template.category);
    setDescription(template.description);
    setFullText(template.full_text || '');
    setPositiveEffects(template.positive_effects || []);
    setNegativeEffects(template.negative_effects || []);
    setEconomicImpact(template.economic_impact);
    setSocialImpact(template.social_impact);
    setTerritorialImpact(template.territorial_impact);
    setMilitaryImpact(template.military_impact);
    toast.success('Modelo aplicado!');
  };

  const handleCreateLaw = async () => {
    if (!name || !category || !selectedTerritory) {
      toast.error('Preencha nome, categoria e selecione um território');
      return;
    }

    if (positiveEffects.length === 0 && negativeEffects.length === 0) {
      toast.error('Adicione pelo menos um efeito positivo ou negativo');
      return;
    }

    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('create-law', {
        body: {
          name,
          legal_level: 'national',
          category,
          description,
          full_text: fullText,
          territory_id: selectedTerritory,
          positive_effects: positiveEffects,
          negative_effects: negativeEffects,
          economic_impact: economicImpact,
          social_impact: socialImpact,
          territorial_impact: territorialImpact,
          military_impact: militaryImpact,
          enact_immediately: true
        },
        headers: {
          Authorization: `Bearer ${session?.session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        if (response.data.conflicts) {
          setConflicts(response.data.conflicts);
        }
        throw new Error(response.data.error);
      }

      setPreviewSympathy(response.data.sympathy);
      setPreviewRepulsion(response.data.repulsion);

      toast.success('Decreto promulgado com sucesso!');
      navigate('/leis');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar decreto');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user || myTerritories.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Crown className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {!user ? 'Faça login para criar decretos' : 'Você precisa de um território'}
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
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Criar Decreto Real</h1>
            <p className="text-muted-foreground">Promulgue uma nova lei para seu território</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Território</Label>
                    <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {myTerritories.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome do Decreto</Label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Lei de Incentivo à Produção Agrícola"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Resumo do decreto..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Texto Completo (opcional)</Label>
                  <Textarea 
                    value={fullText}
                    onChange={(e) => setFullText(e.target.value)}
                    placeholder="Artigos e disposições..."
                    className="min-h-[150px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Efeitos</CardTitle>
                <CardDescription>Defina os efeitos positivos e negativos da lei</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Positive Effects */}
                  <div className="space-y-2">
                    <Label className="text-green-500">Efeitos Positivos</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={newPositiveEffect}
                        onChange={(e) => setNewPositiveEffect(e.target.value)}
                        placeholder="Adicionar efeito..."
                        onKeyDown={(e) => e.key === 'Enter' && addPositiveEffect()}
                      />
                      <Button size="icon" onClick={addPositiveEffect} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-1">
                        {positiveEffects.map((effect, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-green-500/10 rounded text-sm">
                            <span>{effect}</span>
                            <Button size="icon" variant="ghost" onClick={() => removePositiveEffect(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Negative Effects */}
                  <div className="space-y-2">
                    <Label className="text-red-500">Efeitos Negativos</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={newNegativeEffect}
                        onChange={(e) => setNewNegativeEffect(e.target.value)}
                        placeholder="Adicionar efeito..."
                        onKeyDown={(e) => e.key === 'Enter' && addNegativeEffect()}
                      />
                      <Button size="icon" onClick={addNegativeEffect} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[120px]">
                      <div className="space-y-1">
                        {negativeEffects.map((effect, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-red-500/10 rounded text-sm">
                            <span>{effect}</span>
                            <Button size="icon" variant="ghost" onClick={() => removeNegativeEffect(i)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impactos</CardTitle>
                <CardDescription>Ajuste os impactos da lei (-100 a +100)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Impacto Econômico</Label>
                    <span className={economicImpact >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {economicImpact >= 0 ? '+' : ''}{economicImpact}
                    </span>
                  </div>
                  <Slider 
                    value={[economicImpact]} 
                    onValueChange={([v]) => setEconomicImpact(v)}
                    min={-100}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Impacto Social</Label>
                    <span className={socialImpact >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {socialImpact >= 0 ? '+' : ''}{socialImpact}
                    </span>
                  </div>
                  <Slider 
                    value={[socialImpact]} 
                    onValueChange={([v]) => setSocialImpact(v)}
                    min={-100}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Impacto Territorial</Label>
                    <span className={territorialImpact >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {territorialImpact >= 0 ? '+' : ''}{territorialImpact}
                    </span>
                  </div>
                  <Slider 
                    value={[territorialImpact]} 
                    onValueChange={([v]) => setTerritorialImpact(v)}
                    min={-100}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Impacto Militar</Label>
                    <span className={militaryImpact >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {militaryImpact >= 0 ? '+' : ''}{militaryImpact}
                    </span>
                  </div>
                  <Slider 
                    value={[militaryImpact]} 
                    onValueChange={([v]) => setMilitaryImpact(v)}
                    min={-100}
                    max={100}
                  />
                </div>
              </CardContent>
            </Card>

            {conflicts.length > 0 && (
              <Card className="border-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                    Conflitos Legais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {conflicts.map((conflict, i) => (
                      <li key={i} className="text-sm p-2 bg-red-500/10 rounded">
                        <strong>{conflict.law_name}:</strong> {conflict.reason}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={handleCreateLaw} 
              disabled={creating}
              size="lg"
              className="w-full"
            >
              {creating ? 'Promulgando...' : 'Promulgar Decreto'}
            </Button>
          </div>

          {/* Templates */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Modelos de Lei
                </CardTitle>
                <CardDescription>Aplique um modelo pré-definido</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3 pr-4">
                    {templates.map((template) => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => applyTemplate(template)}
                      >
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="py-2">
                          <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{template.category}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              {template.base_sympathy}% apoio
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {templates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nenhum modelo disponível
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
