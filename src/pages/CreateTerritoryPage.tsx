import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Flag, MapPin, Crown, Scroll, Palette, AlertCircle } from 'lucide-react';
import { regions, GovernmentType, TerritoryStyle } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

const governmentTypes: GovernmentType[] = [
  'Monarquia Absoluta',
  'Monarquia Constitucional',
  'República Presidencialista',
  'República Parlamentarista',
  'Teocracia',
  'Oligarquia',
  'Ditadura',
];

const territoryStyles: TerritoryStyle[] = [
  'Cultural',
  'Comercial',
  'Tecnológico',
  'Militar',
];

const styleDescriptions: Record<TerritoryStyle, string> = {
  'Cultural': 'Foco em artes, tradições e preservação histórica',
  'Comercial': 'Foco em comércio, rotas e economia',
  'Tecnológico': 'Foco em inovação, pesquisa e desenvolvimento',
  'Militar': 'Foco em defesa, estratégia e proteção',
};

export default function CreateTerritoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedStatute, setAcceptedStatute] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    region: '',
    capital: '',
    governmentType: '',
    style: '',
    lore: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedStatute) {
      toast({
        title: 'Estatuto não aceito',
        description: 'Você precisa aceitar o Estatuto Planetário para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast({
      title: 'Território enviado para análise!',
      description: 'O Administrador Planetário irá revisar sua solicitação.',
    });

    setIsSubmitting(false);
    navigate('/territorios');
  };

  const isFormValid = 
    formData.name && 
    formData.region && 
    formData.capital && 
    formData.governmentType && 
    formData.style && 
    formData.lore.length >= 50 &&
    acceptedStatute;

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
                  />
                </div>

                {/* Region */}
                <div className="space-y-2">
                  <Label htmlFor="region" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Região-Base
                  </Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => setFormData({ ...formData, region: value })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Selecione uma região" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>

                {/* Government Type */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Tipo de Governo
                  </Label>
                  <Select
                    value={formData.governmentType}
                    onValueChange={(value) => setFormData({ ...formData, governmentType: value })}
                  >
                    <SelectTrigger className="bg-muted/50">
                      <SelectValue placeholder="Selecione o tipo de governo" />
                    </SelectTrigger>
                    <SelectContent>
                      {governmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Estilo do Território
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {territoryStyles.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setFormData({ ...formData, style })}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          formData.style === style
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-muted/30 hover:border-muted-foreground/50'
                        }`}
                      >
                        <p className="font-medium text-sm">{style}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {styleDescriptions[style]}
                        </p>
                      </button>
                    ))}
                  </div>
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 50 caracteres • {formData.lore.length}/50
                  </p>
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
                    'Enviando...'
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
