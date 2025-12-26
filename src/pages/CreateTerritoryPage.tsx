import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Flag, MapPin, Crown, Scroll, Palette, AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

type GovernmentType = Database['public']['Enums']['government_type'];
type TerritoryStyle = Database['public']['Enums']['territory_style'];

interface Region {
  id: string;
  name: string;
  description: string | null;
}

const governmentOptions: { value: GovernmentType; label: string }[] = [
  { value: 'monarchy', label: 'Monarquia' },
  { value: 'republic', label: 'República' },
  { value: 'theocracy', label: 'Teocracia' },
  { value: 'oligarchy', label: 'Oligarquia' },
  { value: 'democracy', label: 'Democracia' },
  { value: 'dictatorship', label: 'Ditadura' },
];

const styleOptions: { value: TerritoryStyle; label: string; description: string }[] = [
  { value: 'cultural', label: 'Cultural', description: 'Foco em artes, tradições e preservação histórica' },
  { value: 'commercial', label: 'Comercial', description: 'Foco em comércio, rotas e economia' },
  { value: 'technological', label: 'Tecnológico', description: 'Foco em inovação, pesquisa e desenvolvimento' },
  { value: 'military', label: 'Militar', description: 'Foco em defesa, estratégia e proteção' },
];

// Validation schema
const territorySchema = z.object({
  name: z.string().trim().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100, 'Nome deve ter no máximo 100 caracteres'),
  regionId: z.string().uuid('Selecione uma região válida'),
  capitalName: z.string().trim().min(3, 'Nome da capital deve ter no mínimo 3 caracteres').max(100, 'Nome da capital deve ter no máximo 100 caracteres'),
  governmentType: z.enum(['monarchy', 'republic', 'theocracy', 'oligarchy', 'democracy', 'dictatorship']),
  style: z.enum(['cultural', 'commercial', 'technological', 'military']),
  lore: z.string().trim().min(50, 'Lore deve ter no mínimo 50 caracteres').max(2000, 'Lore deve ter no máximo 2000 caracteres'),
});

export default function CreateTerritoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedStatute, setAcceptedStatute] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    regionId: '',
    capitalName: '',
    governmentType: '' as GovernmentType | '',
    style: '' as TerritoryStyle | '',
    lore: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch regions from database
  useEffect(() => {
    async function fetchRegions() {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, description')
        .order('name');

      if (error) {
        toast({
          title: 'Erro ao carregar regiões',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setRegions(data || []);
      }
      setLoadingRegions(false);
    }

    fetchRegions();
  }, [toast]);

  const validateForm = () => {
    try {
      territorySchema.parse({
        name: formData.name,
        regionId: formData.regionId,
        capitalName: formData.capitalName,
        governmentType: formData.governmentType,
        style: formData.style,
        lore: formData.lore,
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa estar logado para criar um território.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!acceptedStatute) {
      toast({
        title: 'Estatuto não aceito',
        description: 'Você precisa aceitar o Estatuto Planetário para continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: 'Formulário inválido',
        description: 'Por favor, corrija os erros no formulário.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, create the capital city
      const { data: cityData, error: cityError } = await supabase
        .from('cities')
        .insert({
          name: formData.capitalName.trim(),
          region_id: formData.regionId,
          status: 'free',
          is_neutral: false,
        })
        .select()
        .single();

      if (cityError) {
        throw new Error(`Erro ao criar capital: ${cityError.message}`);
      }

      // Then create the territory
      const { error: territoryError } = await supabase
        .from('territories')
        .insert({
          name: formData.name.trim(),
          owner_id: user.id,
          capital_city_id: cityData.id,
          region_id: formData.regionId,
          government_type: formData.governmentType as GovernmentType,
          style: formData.style as TerritoryStyle,
          lore: formData.lore.trim(),
          accepted_statute: true,
          status: 'pending',
          level: 'colony',
        });

      if (territoryError) {
        // Rollback: delete the created city
        await supabase.from('cities').delete().eq('id', cityData.id);
        throw new Error(`Erro ao criar território: ${territoryError.message}`);
      }

      // Update city to be owned by the territory
      await supabase
        .from('cities')
        .update({ status: 'occupied' })
        .eq('id', cityData.id);

      toast({
        title: 'Território enviado para análise!',
        description: 'O Administrador Planetário irá revisar sua solicitação.',
      });

      navigate('/territorios');
    } catch (error) {
      toast({
        title: 'Erro ao criar território',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = 
    formData.name.length >= 3 && 
    formData.regionId && 
    formData.capitalName.length >= 3 && 
    formData.governmentType && 
    formData.style && 
    formData.lore.length >= 50 &&
    acceptedStatute;

  // Show login prompt if not authenticated
  if (!authLoading && !user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto glass-card">
            <CardContent className="pt-6 text-center">
              <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">Autenticação Necessária</h2>
              <p className="text-muted-foreground mb-6">
                Você precisa estar logado para criar um território.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <PlusCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Novo Território</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Criar Território
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Estabeleça sua nação no planeta TOI-700. Após envio, sua solicitação será analisada pelo Administrador Planetário.
          </p>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-primary" />
                  Informações do Território
                </CardTitle>
                <CardDescription>
                  Preencha todos os campos para solicitar a criação do seu território
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Nome do Território
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ex: República de Nova Terra"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-muted/50"
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label htmlFor="region" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Região-Base
                  </Label>
                  <Select
                    value={formData.regionId}
                    onValueChange={(value) => setFormData({ ...formData, regionId: value })}
                    disabled={loadingRegions}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder={loadingRegions ? 'Carregando...' : 'Selecione uma região'} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.regionId && (
                    <p className="text-xs text-destructive">{errors.regionId}</p>
                  )}
                </div>

                {/* Capital */}
                <div className="space-y-2">
                  <Label htmlFor="capital" className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    Nome da Capital
                  </Label>
                  <Input
                    id="capital"
                    placeholder="Ex: Nova Esperança"
                    value={formData.capitalName}
                    onChange={(e) => setFormData({ ...formData, capitalName: e.target.value })}
                    className="bg-muted/50"
                    maxLength={100}
                  />
                  {errors.capitalName && (
                    <p className="text-xs text-destructive">{errors.capitalName}</p>
                  )}
                </div>

                {/* Government Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Tipo de Governo
                  </Label>
                  <Select
                    value={formData.governmentType}
                    onValueChange={(value) => setFormData({ ...formData, governmentType: value as GovernmentType })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Selecione o tipo de governo" />
                    </SelectTrigger>
                    <SelectContent>
                      {governmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.governmentType && (
                    <p className="text-xs text-destructive">{errors.governmentType}</p>
                  )}
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Estilo do Território
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {styleOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, style: option.value })}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          formData.style === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-muted/30 hover:border-muted-foreground/50'
                        }`}
                      >
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  {errors.style && (
                    <p className="text-xs text-destructive">{errors.style}</p>
                  )}
                </div>

                {/* Lore */}
                <div className="space-y-2">
                  <Label htmlFor="lore" className="flex items-center gap-2">
                    <Scroll className="w-4 h-4" />
                    Lore Resumida
                  </Label>
                  <Textarea
                    id="lore"
                    placeholder="Conte a história do seu território, sua fundação, cultura e aspirações..."
                    value={formData.lore}
                    onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                    className="bg-muted/50 min-h-[120px]"
                    maxLength={2000}
                  />
                  <p className={`text-xs ${formData.lore.length >= 50 ? 'text-muted-foreground' : 'text-destructive'}`}>
                    {formData.lore.length}/50 caracteres mínimos
                  </p>
                  {errors.lore && (
                    <p className="text-xs text-destructive">{errors.lore}</p>
                  )}
                </div>

                {/* Statute Acceptance */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-status-pending mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Estatuto Planetário</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ao criar um território, você concorda em seguir as regras do simulador, 
                        respeitar outros jogadores e participar de forma construtiva na comunidade de TOI-700.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="statute"
                      checked={acceptedStatute}
                      onCheckedChange={(checked) => setAcceptedStatute(checked === true)}
                    />
                    <Label htmlFor="statute" className="text-sm cursor-pointer">
                      Li e aceito o Estatuto Planetário
                    </Label>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full glow-primary"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Solicitar Criação
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Status inicial: <span className="text-status-pending font-medium">Em análise</span>
                </p>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </Layout>
  );
}
