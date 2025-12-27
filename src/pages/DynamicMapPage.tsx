import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Map } from 'lucide-react';

export default function DynamicMapPage() {
  const [cellsCount, setCellsCount] = useState<number | null>(null);

  useEffect(() => {
    fetchCount();
  }, []);

  async function fetchCount() {
    const { data, count } = await supabase
      .from('cells')
      .select('id', { count: 'exact', head: true });
    setCellsCount(count ?? null);
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Map className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Mapa Dinâmico</h1>
            <p className="text-muted-foreground">Células geradas e mantidas de forma determinística</p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total de células (terra):</p>
            <p className="text-2xl font-bold">{cellsCount !== null ? cellsCount.toLocaleString() : '...'}</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}