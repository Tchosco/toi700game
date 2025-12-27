"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, ShieldAlert, TrendingUp, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function MyTickSummaryPage() {
  const { user } = useAuth();
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: terr } = await supabase
      .from("territories")
      .select("id, name")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!terr) {
      setTerritoryId(null);
      setSummary(null);
      setLoading(false);
      return;
    }

    setTerritoryId(terr.id);

    const { data: tick } = await supabase
      .from("tick_logs")
      .select("*")
      .order("tick_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    // FIX: summary é Json; fazer cast seguro antes de acessar per_state
    const summaryObj = (tick?.summary as any) || null;
    const perState = Array.isArray(summaryObj?.per_state) ? summaryObj.per_state : [];
    const mine = perState.find((s: any) => s.territory_id === terr.id) || null;

    setSummary({ tick_number: tick?.tick_number || 0, snapshot: mine });
    setLoading(false);
  }

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
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Resumo do Tick (Meu Estado)</h1>
            <p className="text-muted-foreground">Produção, consumo, crises e estabilidade do último tick</p>
          </div>
        </div>

        {!territoryId ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Você ainda não possui um Estado.
            </CardContent>
          </Card>
        ) : !summary?.snapshot ? (
          <Card className="glass-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum tick registrado ainda.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5" />
                  Tick #{summary.tick_number}
                </CardTitle>
                <CardDescription>Dados do último processamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Produção</p>
                    <p>Food {summary.snapshot.prod.food} • Energy {summary.snapshot.prod.energy}</p>
                    <p>Minerals {summary.snapshot.prod.minerals} • Tech {summary.snapshot.prod.tech}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Consumo</p>
                    <p>Food {summary.snapshot.cons.food} • Energy {summary.snapshot.cons.energy}</p>
                    <p>Tech {summary.snapshot.cons.tech}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Migração Líquida</p>
                    <p className="font-bold">{summary.snapshot.migration_net ?? 0}</p>
                  </div>
                  <div className="p-3 rounded bg-muted/50">
                    <p className="text-sm text-muted-foreground">Estabilidade</p>
                    <p className="font-bold">{summary.snapshot.stability_after}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-1">Crises</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.snapshot.crises)
                      .filter(([_, v]) => v)
                      .map(([k]) => (
                        <Badge key={k} variant="destructive" className="flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          {k}
                        </Badge>
                      ))}
                    {Object.values(summary.snapshot.crises).every((v: any) => !v) && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Nenhuma
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}