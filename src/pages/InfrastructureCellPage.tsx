"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function InfrastructureCellPage() {
  const { user } = useAuth();
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [cells, setCells] = useState<any[]>([]);
  const [selectedCell, setSelectedCell] = useState<string>("");
  const [built, setBuilt] = useState<any[]>([]);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user) return;
    const { data: terr } = await supabase.from("territories").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    setTerritoryId(terr?.id || null);

    const { data: t } = await supabase.from("cell_infrastructure_types").select("*");
    setTypes(t || []);

    const { data: myCells } = await supabase
      .from("cells")
      .select("id, region_id, rural_population, urban_population")
      .eq("owner_territory_id", terr?.id || "");
    setCells(myCells || []);
    setSelectedCell(myCells?.[0]?.id || "");

    const { data: b } = await supabase.from("infra_cell").select("*").eq("territory_id", terr?.id || "");
    setBuilt(b || []);
    const { data: q } = await supabase.from("construction_queue").select("*").eq("territory_id", terr?.id || "").eq("level", "cell");
    setQueue(q || []);
  }

  async function startConstruction(key: string) {
    if (!territoryId || !selectedCell) return;
    const type = types.find((x) => x.key === key);
    if (!type) return;

    const ticks = type.build_ticks || 3;
    const { data: rb } = await supabase.from("resource_balances").select("*").eq("territory_id", territoryId).maybeSingle();
    if (!rb || rb.food < type.cost_food || rb.energy < type.cost_energy || rb.minerals < type.cost_minerals) {
      toast.error("Recursos insuficientes no Armazém");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("currency").eq("id", user!.id).maybeSingle();
    if (!profile || profile.currency < type.cost_currency) {
      toast.error("Moeda insuficiente");
      return;
    }

    await supabase.from("resource_balances").update({
      food: rb.food - type.cost_food,
      energy: rb.energy - type.cost_energy,
      minerals: rb.minerals - type.cost_minerals,
      updated_at: new Date().toISOString()
    }).eq("territory_id", territoryId);

    await supabase.from("profiles").update({
      currency: profile.currency - type.cost_currency,
      updated_at: new Date().toISOString()
    }).eq("id", user!.id);

    await supabase.from("construction_queue").insert({
      territory_id: territoryId,
      cell_id: selectedCell,
      level: "cell",
      type_key: key,
      remaining_ticks: ticks,
      status: "in_progress"
    });

    toast.success("Construção iniciada!");
    fetchData();
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Infraestrutura por Célula</h1>
            <p className="text-muted-foreground">Construa infraestruturas locais por célula</p>
          </div>
          <div className="w-[240px]">
            <Select value={selectedCell || "none"} onValueChange={(v) => setSelectedCell(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione célula" />
              </SelectTrigger>
              <SelectContent>
                {cells.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.id.slice(0, 8)}... • Pop {(c.rural_population + c.urban_population).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Tipos Disponíveis</CardTitle>
            <CardDescription>Custos e efeitos resumidos</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((t) => (
              <div key={t.key} className="p-3 rounded border bg-muted/30">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">Efeitos: {JSON.stringify(t.effects)}</p>
                <p className="text-xs mt-2">Custos: food {t.cost_food}, energy {t.cost_energy}, minerals {t.cost_minerals}, currency {t.cost_currency}</p>
                <p className="text-xs">Tempo: {t.build_ticks} ticks</p>
                <Button className="mt-2 w-full" onClick={() => startConstruction(t.key)}>Iniciar Construção</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Fila de Construção</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {queue.map((q) => (
              <div key={q.id} className="p-3 rounded border bg-muted/30 text-sm">
                <p>Célula: {q.cell_id?.slice(0, 8)}...</p>
                <p>Tipo: {q.type_key}</p>
                <p>Status: {q.status}</p>
                <p>Restante: {q.remaining_ticks} ticks</p>
              </div>
            ))}
            {queue.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma construção em progresso.</p>}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {built.map((b) => (
              <div key={b.id} className="p-3 rounded border bg-muted/30 text-sm">
                <p>{b.type_key}</p>
                <p>Cel: {b.cell_id?.slice(0, 8)}...</p>
                <p>Concluída em: {new Date(b.completed_at).toLocaleString('pt-BR')}</p>
              </div>
            ))}
            {built.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma infraestrutura concluída.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}