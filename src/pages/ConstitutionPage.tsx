import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Scale, Shield, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Law {
  id: string;
  name: string;
  legal_level: string;
  category: string;
  description: string;
  full_text: string;
  status: string;
  is_constitution: boolean;
  enacted_at: string;
  population_sympathy: number;
  population_repulsion: number;
  positive_effects: string[];
  negative_effects: string[];
}

export default function ConstitutionPage() {
  const [constitution, setConstitution] = useState<Law | null>(null);
  const [planetaryLaws, setPlanetaryLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLaws();
  }, []);

  const fetchLaws = async () => {
    setLoading(true);
    try {
      // Fetch planetary constitution
      const { data: constData } = await supabase
        .from('laws')
        .select('*')
        .eq('legal_level', 'planetary')
        .eq('is_constitution', true)
        .eq('status', 'enacted')
        .maybeSingle();

      if (constData) {
        setConstitution(constData as Law);
      }

      // Fetch other planetary laws
      const { data: lawsData } = await supabase
        .from('laws')
        .select('*')
        .eq('legal_level', 'planetary')
        .eq('is_constitution', false)
        .eq('status', 'enacted')
        .order('enacted_at', { ascending: false });

      if (lawsData) {
        setPlanetaryLaws(lawsData as Law[]);
      }
    } catch (error) {
      console.error('Error fetching laws:', error);
    } finally {
      setLoading(false);
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Constituição Planetária</h1>
            <p className="text-muted-foreground">Lei fundamental de TOI-700</p>
          </div>
        </div>

        <Tabs defaultValue="constitution" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="constitution">Constituição</TabsTrigger>
            <TabsTrigger value="laws">Leis Planetárias ({planetaryLaws.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="constitution" className="space-y-4">
            {constitution ? (
              <Card className="border-primary/20">
                <CardHeader className="bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Scale className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle>{constitution.name}</CardTitle>
                        <CardDescription>{constitution.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-amber-500">
                      Lei Suprema
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                      {constitution.full_text}
                    </div>
                  </ScrollArea>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Promulgada em: {new Date(constitution.enacted_at).toLocaleDateString('pt-BR')}</span>
                    <div className="flex gap-4">
                      <span className="text-green-500">Apoio: {constitution.population_sympathy}%</span>
                      <span className="text-red-500">Oposição: {constitution.population_repulsion}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma constituição promulgada</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Hierarquia Legal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="font-medium">Constituição Planetária</p>
                      <p className="text-sm text-muted-foreground">Lei suprema, inviolável por qualquer outra norma</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="font-medium">Leis Planetárias</p>
                      <p className="text-sm text-muted-foreground">Aprovadas pelo Parlamento Planetário</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="font-medium">Cartas de Bloco</p>
                      <p className="text-sm text-muted-foreground">Constituições dos blocos geopolíticos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold">4</div>
                    <div>
                      <p className="font-medium">Leis de Bloco</p>
                      <p className="text-sm text-muted-foreground">Válidas apenas para membros do bloco</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">5</div>
                    <div>
                      <p className="font-medium">Decretos Nacionais</p>
                      <p className="text-sm text-muted-foreground">Leis do Estado, por decreto real</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="laws" className="space-y-4">
            {planetaryLaws.length > 0 ? (
              planetaryLaws.map((law) => (
                <Card key={law.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{law.name}</CardTitle>
                        <CardDescription>{law.description}</CardDescription>
                      </div>
                      <Badge>{law.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-green-500 mb-2">Efeitos Positivos</p>
                        <ul className="text-sm space-y-1">
                          {(law.positive_effects || []).map((effect, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500">+</span>
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-500 mb-2">Efeitos Negativos</p>
                        <ul className="text-sm space-y-1">
                          {(law.negative_effects || []).map((effect, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-red-500">-</span>
                              {effect}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Promulgada: {new Date(law.enacted_at).toLocaleDateString('pt-BR')}</span>
                      <div className="flex gap-4">
                        <span className="text-green-500">Apoio: {law.population_sympathy}%</span>
                        <span className="text-red-500">Oposição: {law.population_repulsion}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Scale className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma lei planetária promulgada</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
