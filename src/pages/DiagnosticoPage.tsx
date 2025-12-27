import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Server, Bug, Database } from 'lucide-react';

export default function DiagnosticoPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [errorDetail, setErrorDetail] = useState<string>('');
  const [cellsCount, setCellsCount] = useState<number | null>(null);
  const [regionsCount, setRegionsCount] = useState<number | null>(null);

  const envUrl =
    (import.meta as any).env?.VITE_SUPABASE_URL ||
    (import.meta as any).env?.SUPABASE_URL ||
    '';
  const envAnon =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (import.meta as any).env?.SUPABASE_ANON_KEY ||
    '';

  const testConnection = async () => {
    setLoading(true);
    setResult('');
    setErrorDetail('');
    setCellsCount(null);
    setRegionsCount(null);

    // Consulta a planet_config (como pedido). Se a tabela não existir, um erro detalhado será exibido.
    const { data, error } = await (supabase as any)
      .from('planet_config')
      .select('*')
      .limit(1);

    if (error) {
      const details = [
        `message: ${error.message || 'unknown'}`,
        error.code ? `code: ${error.code}` : null,
        error.details ? `details: ${error.details}` : null,
        error.hint ? `hint: ${error.hint}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      setErrorDetail(details);
    } else {
      setResult(JSON.stringify(data, null, 2));
    }

    // ADD: counts for cells and regions
    const { count: cCount } = await (supabase as any)
      .from('cells')
      .select('id', { count: 'exact', head: true });

    const { count: rCount } = await (supabase as any)
      .from('regions')
      .select('id', { count: 'exact', head: true });

    setCellsCount(typeof cCount === 'number' ? cCount : null);
    setRegionsCount(typeof rCount === 'number' ? rCount : null);

    setLoading(false);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Server className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Diagnóstico Supabase</h1>
            <p className="text-muted-foreground">
              Verifique a conexão e variáveis de ambiente do Supabase
            </p>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Variáveis de Ambiente
            </CardTitle>
            <CardDescription>URL e chave anon usadas pelo cliente</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SUPABASE_URL / VITE_SUPABASE_URL</Label>
              <Input value={envUrl} readOnly className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY</Label>
              <Input
                value={envAnon ? `${envAnon.slice(0, 6)}•••${envAnon.slice(-4)}` : ''}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Teste de Conexão</CardTitle>
            <CardDescription>
              Executa: select * from planet_config limit 1
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={testConnection}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Testando...
                </>
              ) : (
                'Testar conexão'
              )}
            </Button>

            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Cells (total)</p>
                <p className="font-bold">{cellsCount ?? '...'}</p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">Regions (total)</p>
                <p className="font-bold">{regionsCount ?? '...'}</p>
              </div>
            </div>

            {result && (
              <div className="p-3 rounded border bg-muted/30">
                <p className="text-sm font-medium mb-2">Resultado</p>
                <pre className="text-xs whitespace-pre-wrap">{result}</pre>
              </div>
            )}

            {errorDetail && (
              <div className="p-3 rounded border bg-red-500/10">
                <p className="flex items-center gap-2 text-sm font-medium text-red-600 mb-2">
                  <Bug className="h-4 w-4" />
                  Erro
                </p>
                <pre className="text-xs whitespace-pre-wrap text-red-700">
                  {errorDetail}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}