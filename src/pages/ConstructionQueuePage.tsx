"use client";

import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ConstructionQueuePage() {
  const { user } = useAuth();
  const [territoryId, setTerritoryId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user) return;
    const { data: terr } = await supabase.from("territories").select("id").eq("owner_id", user.id).limit(1).maybeSingle();
    setTerritoryId(terr?.id || null);

    const { data: q } = await (supabase as any).from("construction_queue").select("*").eq("territory_id", terr?.id || "");
    setQueue(q || []);
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Fila de Construção</h1>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Obras</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {queue.map((q) => (
              <div key={q.id} className="p-3 rounded border bg-muted/30 text-sm">
                <p>Nível: {q.level}</p>
                <p>Tipo: {q.type_key}</p>
                <p>Status: {q.status}</p>
                <p>Ticks restantes: {q.remaining_ticks}</p>
                <p>Início: {new Date(q.started_at).toLocaleString('pt-BR')}</p>
              </div>
            ))}
            {queue.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma obra na fila.</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}