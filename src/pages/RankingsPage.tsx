"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RankingRow {
  territory_id: string;
  score_total: number;
  population: number;
  economy: number;
  technology: number;
  stability: number;
  expansion: number;
  efficiency: number;
}

export default function RankingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [myPosition, setMyPosition] = useState<number | null>(null);

  useEffect(() => {
    fetchRankings();
  }, [user]);

  async function fetchRankings() {
    const { data } = await (supabase as any)
      .from("rankings")
      .select("territory_id, score_total, population, economy, technology, stability, expansion, efficiency")
      .order("score_total", { ascending: false })
      .limit(100);

    const list = (data || []) as RankingRow[];
    setRows(list);

    if (user) {
      const { data: myTerr } = await supabase
        .from("territories")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();
      if (myTerr) {
        const pos = list.findIndex((r) => r.territory_id === myTerr.id);
        setMyPosition(pos >= 0 ? pos + 1 : null);
      }
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rankings do Planeta</h1>
            <p className="text-muted-foreground">Atualizados por tick</p>
          </div>
          {myPosition && <Badge>Minha posição: #{myPosition}</Badge>}
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Ranking Geral</CardTitle>
            <CardDescription>Score ponderado por população, economia, tecnologia, estabilidade, expansão e eficiência</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>População</TableHead>
                  <TableHead>Economia</TableHead>
                  <TableHead>Tecnologia</TableHead>
                  <TableHead>Estabilidade</TableHead>
                  <TableHead>Células</TableHead>
                  <TableHead>Eficiência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((r, idx) => (
                  <TableRow key={r.territory_id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-mono">{r.territory_id.slice(0, 8)}...</TableCell>
                    <TableCell>{r.score_total.toFixed(2)}</TableCell>
                    <TableCell>{r.population.toLocaleString()}</TableCell>
                    <TableCell>{Math.round(r.economy)}</TableCell>
                    <TableCell>{r.technology}</TableCell>
                    <TableCell>{Math.round(r.stability)}</TableCell>
                    <TableCell>{r.expansion}</TableCell>
                    <TableCell>{r.efficiency.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Rankings Específicos</CardTitle>
            <CardDescription>Top por métrica</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {[
              { key: "population", label: "Maior População" },
              { key: "economy", label: "Maior Economia" },
              { key: "technology", label: "Maior Tecnologia" },
              { key: "stability", label: "Maior Estabilidade" },
              { key: "expansion", label: "Maior Expansão Territorial" },
              { key: "efficiency", label: "Maior Eficiência" },
            ].map((m) => (
              <div key={m.key} className="p-3 rounded border bg-muted/30">
                <p className="text-sm font-medium">{m.label}</p>
                <div className="mt-2 space-y-1 text-sm">
                  {rows
                    .sort((a: any, b: any) => (b as any)[m.key] - (a as any)[m.key])
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.territory_id} className="flex items-center justify-between">
                        <span className="font-mono">{r.territory_id.slice(0, 8)}...</span>
                        <span>
                          {(r as any)[m.key] instanceof Number || typeof (r as any)[m.key] === "number"
                            ? (r as any)[m.key].toFixed ? (r as any)[m.key].toFixed(2) : (r as any)[m.key]
                            : (r as any)[m.key]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}