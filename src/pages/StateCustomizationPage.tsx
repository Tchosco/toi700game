import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Palette, Flag, Settings, Sparkles } from 'lucide-react';

const ADMIN_STYLES = [
  { value: 'centralized', label: 'Centralizado', description: '+10% eficiência, -5% estabilidade', icon: '🏛️' },
  { value: 'technocratic', label: 'Tecnocrático', description: '+15% pesquisa, -10% simpatia popular', icon: '🔬' },
  { value: 'military', label: 'Militar', description: '+20% defesa, -15% economia', icon: '⚔️' },
  { value: 'mercantile', label: 'Mercantil', description: '+15% comércio, -10% produção', icon: '💰' },
];

const VOCATIONS = [
  { value: 'agrarian', label: 'Agrária', description: '+25% alimentos, -10% tecnologia', color: 'bg-green-500' },
  { value: 'mineral', label: 'Mineral', description: '+25% minerais, -10% alimentos', color: 'bg-amber-500' },
  { value: 'urban', label: 'Urbana', description: '+20% moeda, -15% recursos naturais', color: 'bg-blue-500' },
  { value: 'scientific', label: 'Científica', description: '+30% pesquisa, -20% produção base', color: 'bg-purple-500' },
  { value: 'military', label: 'Militar', description: '+25% poder militar, -15% economia', color: 'bg-red-500' },
  { value: 'commercial', label: 'Comercial', description: '+20% comércio, -10% produção', color: 'bg-cyan-500' },
];

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'
];

export default function StateCustomizationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: territory, isLoading } = useQuery({
    queryKey: ['user-territory-customization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    name: '',
    demonym: '',
    motto: '',
    official_color: '#3b82f6',
    admin_style: 'centralized',
    vocation: 'commercial',
    lore: '',
  });

  // Update form when territory loads
  useState(() => {
    if (territory) {
      setFormData({
        name: territory.name || '',
        demonym: (territory as any).demonym || '',
        motto: (territory as any).motto || '',
        official_color: (territory as any).official_color || '#3b82f6',
        admin_style: (territory as any).admin_style || 'centralized',
        vocation: (territory as any).vocation || 'commercial',
        lore: territory.lore || '',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!territory?.id) throw new Error('Nenhum território encontrado');
      const { error } = await supabase
        .from('territories')
        .update({
          name: data.name,
          demonym: data.demonym,
          motto: data.motto,
          official_color: data.official_color,
          admin_style: data.admin_style,
          vocation: data.vocation,
          lore: data.lore,
        } as any)
        .eq('id', territory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Estado atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['user-territory-customization'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!territory) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Crown className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Nenhum território ativo</h2>
              <p className="text-muted-foreground">Você precisa de um território ativo para customizar.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-glow">Customização do Estado</h1>
          <p className="text-muted-foreground mt-1">Defina a identidade e vocação do seu país</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Identity */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                Identidade Nacional
              </CardTitle>
              <CardDescription>Nome, símbolos e história do seu país</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do País</Label>
                <Input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Reino de..."
                />
              </div>
              <div>
                <Label>Gentílico</Label>
                <Input 
                  value={formData.demonym}
                  onChange={(e) => setFormData({ ...formData, demonym: e.target.value })}
                  placeholder="Ex: Brasileiro, Português..."
                />
              </div>
              <div>
                <Label>Lema Nacional</Label>
                <Input 
                  value={formData.motto}
                  onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                  placeholder="Ex: Ordem e Progresso"
                />
              </div>
              <div>
                <Label>Cor Oficial</Label>
                <div className="flex gap-2 mt-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.official_color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, official_color: color })}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Label>História / Lore</Label>
                <Textarea 
                  value={formData.lore}
                  onChange={(e) => setFormData({ ...formData, lore: e.target.value })}
                  placeholder="Conte a história do seu país..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Administration */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Administração
              </CardTitle>
              <CardDescription>Estilo de governo e vocação econômica</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Estilo Administrativo</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ADMIN_STYLES.map(style => (
                    <button
                      key={style.value}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.admin_style === style.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border/50 hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, admin_style: style.value })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{style.icon}</span>
                        <span className="font-medium">{style.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Vocação Principal</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {VOCATIONS.map(voc => (
                    <button
                      key={voc.value}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        formData.vocation === voc.value 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border/50 hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, vocation: voc.value })}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${voc.color}`} />
                        <span className="font-medium">{voc.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{voc.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            size="lg"
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Sparkles className="h-4 w-4 mr-2" />
            Salvar Customização
          </Button>
        </div>
      </div>
    </Layout>
  );
}
