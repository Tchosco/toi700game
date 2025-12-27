"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MapPin, TreePine, Building2, Zap, Pickaxe, Wheat, FlaskConical, Factory, ShoppingCart } from "lucide-react";

const RURAL_FOCUSES = [
  { value: "agricultural", label: "Agrícola", icon: Wheat, description: "+30% alimentos", color: "text-green-500" },
  { value: "mineral", label: "Mineral", icon: Pickaxe, description: "+30% minerais", color: "text-amber-500" },
  { value: "energy", label: "Energética", icon: Zap, description: "+30% energia", color: "text-yellow-500" },
];

const URBAN_FOCUSES = [
  { value: "industrial", label: "Industrial", icon: Factory, description: "+30% produção", color: "text-orange-500" },
  { value: "commercial", label: "Comercial", icon: ShoppingCart, description: "+30% moeda", color: "text-cyan-500" },
  { value: "scientific", label: "Científico", icon: FlaskConical, description: "+30% pesquisa", color: "text-purple-500" },
];

export default function CellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cell, isLoading } = useQuery({
    queryKey: ["cell-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cells")
        .select(`
          *,
          regions(name, difficulty),
          territories:owner_territory_id(id, name, owner_id)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: cities } = useQuery({
    queryKey: ["cell-cities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cities")
        .select("*")
        .eq("cell_id", id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const changeFocusMutation = useMutation({
    mutationFn: async ({ focus, type }: { focus: string; type: "rural" | "urban" }) => {
      const updateData = type === "rural"
        ? { rural_focus: focus, focus_changed_at: new Date().toISOString(), focus_penalty_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
        : { urban_focus: focus, focus_changed_at: new Date().toISOString(), focus_penalty_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };

      const { error } = await supabase
        .from("cells")
        .update(updateData as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Foco alterado!", description: "Penalidade temporária de estabilidade aplicada por 24h." });
      queryClient.invalidateQueries({ queryKey: ["cell-detail", id] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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

  if (!cell) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Célula não encontrada</h2>
              <Link to="/mapa"><Button variant="outline">Voltar ao Mapa</Button></Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isOwner = cell.territories && (cell.territories as any).owner_id === user?.id;
  const hasPenalty = cell.focus_penalty_until && new Date(cell.focus_penalty_until) > new Date();
  const isUrban = cell.cell_type === "urban";
  const focuses = isUrban ? URBAN_FOCUSES : RURAL_FOCUSES;
  const currentFocus = isUrban ? (cell as any).urban_focus : (cell as any).rural_focus;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Link to="/mapa" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Mapa
        </Link>

        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isUrban ? 'bg-primary/20' : 'bg-green-500/20'}`}>
            {isUrban ? <Building2 className="w-8 h-8 text-primary" /> : <TreePine className="w-8 h-8 text-green-500" />}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Célula {isUrban ? 'Urbana' : 'Rural'}</h1>
            <p className="text-muted-foreground font-mono text-sm">{cell.id.slice(0, 12)}...</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Info */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge>{cell.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <Badge variant="outline">{cell.cell_type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Área</span>
                <span>{cell.area_km2.toLocaleString()} km²</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Região</span>
                <span>{(cell.regions as any)?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dono</span>
                <span className="text-primary">{(cell.territories as any)?.name || 'Neutro'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pop. Rural</span>
                <span>{cell.rural_population?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pop. Urbana</span>
                <span>{cell.urban_population?.toLocaleString() || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="h-5 w-5" />
                Recursos da Célula
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wheat className="h-4 w-4 text-green-500" /> Alimentos
                </span>
                <span className="font-mono">{(cell as any).resource_food || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="h-4 w-4 text-yellow-500" /> Energia
                </span>
                <span className="font-mono">{(cell as any).resource_energy || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Pickaxe className="h-4 w-4 text-amber-500" /> Minerais
                </span>
                <span className="font-mono">{(cell as any).resource_minerals || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <FlaskConical className="h-4 w-4 text-purple-500" /> Tecnologia
                </span>
                <span className="font-mono">{(cell as any).resource_tech || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4 text-blue-500" /> Influência
                </span>
                <span className="font-mono">{(cell as any).resource_influence || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cities */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Cidades ({cities?.length || 0})
              </CardTitle>
              <CardDescription>
                {isUrban ? 'Células urbanas têm até 3 cidades' : 'Células rurais têm 1 cidade pequena'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cities && cities.length > 0 ? (
                <div className="space-y-2">
                  {cities.map(city => (
                    <div key={city.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                      <p className="font-medium">{city.name}</p>
                      <p className="text-sm text-muted-foreground">Pop: {city.urban_population?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma cidade fundada</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Focus Card - Full Width */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Foco Produtivo</CardTitle>
            <CardDescription>
              {isOwner ? 'Alterar o foco custa estabilidade temporária' : 'Apenas o dono pode alterar'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPenalty && (
              <Badge variant="destructive" className="mb-4">
                Penalidade ativa até {new Date(cell.focus_penalty_until!).toLocaleString('pt-BR')}
              </Badge>
            )}
            <div className="grid md:grid-cols-3 gap-3">
              {focuses.map(focus => {
                const Icon = focus.icon;
                const isActive = currentFocus === focus.value;
                return (
                  <button
                    key={focus.value}
                    disabled={!isOwner || changeFocusMutation.isPending}
                    onClick={() => changeFocusMutation.mutate({ focus: focus.value, type: isUrban ? 'urban' : 'rural' })}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border/50 hover:border-primary/50'
                    } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${focus.color}`} />
                      <div>
                        <p className="font-medium">{focus.label}</p>
                        <p className="text-xs text-muted-foreground">{focus.description}</p>
                      </div>
                      {isActive && <Badge className="ml-auto">Ativo</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}