import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Globe, Crown, Map, Store, Gavel, Users, Activity } from "lucide-react";

export default function Index() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [myTerritory, setMyTerritory] = useState<{ id: string; name: string; stability: number; total_rural_population: number; total_urban_population: number; cells_owned_count: number } | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [lastTick, setLastTick] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    // Try planet_config first (DEV schema), fallback to world_config
    let planet = null;
    try {
      const { data: pc } = await (supabase as any)
        .from("planet_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      planet = pc || null;
    } catch {
      planet = null;
    }

    if (!planet) {
      const { data: wc } = await supabase.from("world_config").select("*").limit(1).maybeSingle();
      planet = wc || null;
    }
    setConfig(planet);

    const { data: log } = await supabase.from("tick_logs").select("*").order("tick_number", { ascending: false }).limit(1).maybeSingle();
    setLastTick(log || null);

    const { data: ev } = await supabase.from("event_logs").select("*").order("created_at", { ascending: false }).limit(10);
    setEvents(ev || []);

    if (user) {
      const { data: t } = await supabase.from("territories").select("id, name, stability, total_rural_population, total_urban_population").eq("owner_id", user.id).limit(1).maybeSingle();
      if (t) {
        const { count: cellsCount } = await supabase
          .from("cells")
          .select("id", { count: "exact", head: true })
          .eq("owner_territory_id", t.id);
        setMyTerritory({
          id: t.id,
          name: t.name,
          stability: t.stability,
          total_rural_population: t.total_rural_population,
          total_urban_population: t.total_urban_population,
          cells_owned_count: cellsCount || 0,
        });
      } else {
        setMyTerritory(null);
      }
    }
  }

  async function handleFundarEstado() {
    const { data, error } = await supabase.functions.invoke("bootstrap-first-territory", {});
    if (!error && data?.success) {
      navigate(`/territorio/${data.data.territory_id}`);
    }
  }

  async function handleResetPlanet() {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.access_token) {
      toast.error("Precisa estar autenticado para resetar o planeta.");
      return;
    }
    const { data, error } = await supabase.functions.invoke("reset-planet-dev", {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
      body: {},
    });
    if (error || !data?.success) {
      toast.error(error?.message || data?.error || "Falha ao resetar planeta");
      return;
    }
    toast.success(data?.message || "Planeta resetado com sucesso");
    fetchData();
  }

  const density =
    config?.land_area_km2 && config?.total_population
      ? config.total_population / config.land_area_km2
      : config?.total_planet_land_km2 && config?.total_planet_population
      ? config.total_planet_population / config.total_planet_land_km2
      : null;

  const areaTotal =
    config?.planet_area_total_km2 ?? config?.total_planet_land_km2 ?? null;
  const landArea =
    config?.land_area_km2 ?? config?.total_planet_land_km2 ?? null;
  const landRatio =
    config?.land_ratio ?? config?.proportion_dry_area ?? null;
  const cellsTotal =
    config?.total_cells_land ?? config?.total_cells_land ?? null;
  const totalPopulation =
    config?.total_population ?? config?.total_planet_population ?? null;
  const tickInterval = config?.tick_interval_hours ?? config?.tick_interval_hours ?? 24;
  const tickNumber = config?.tick_number ?? lastTick?.tick_number ?? 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold">TOI-700 Governance Sim</h1>
          <p className="text-muted-foreground">
            Governança planetária em células — economia real com estoque, leis modulares e diplomacia multiplayer
          </p>
        </div>

        {/* Admin Dev Button */}
        {isAdmin && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleResetPlanet}>
              Reset Planet (Dev)
            </Button>
          </div>
        )}

        {/* Main cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                {myTerritory ? "Meu Estado" : "Criar meu Estado"}
              </CardTitle>
              <CardDescription>
                {myTerritory ? "Acesse seu painel de governança" : "Você é um monarca absolutista. Seu primeiro território é aprovado automaticamente."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myTerritory ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Nome</span><span className="font-medium">{myTerritory.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Estabilidade</span><span className="font-medium">{myTerritory.stability}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>População</span>
                    <span className="font-medium">
                      {(myTerritory.total_rural_population + myTerritory.total_urban_population).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Células</span><span className="font-medium">{myTerritory.cells_owned_count}</span>
                  </div>
                  <Button className="w-full mt-2" onClick={() => navigate(`/territorio/${myTerritory.id}`)}>Abrir Painel do Estado</Button>
                </>
              ) : (
                <Button className="w-full" onClick={handleFundarEstado}>Fundar Estado</Button>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Mapa do Planeta
              </CardTitle>
              <CardDescription>Explore regiões, setores e células</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/mapa-dinamico">
                <Button className="w-full">Explorar Mapa</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Mercado Planetário
              </CardTitle>
              <CardDescription>Comércio de recursos entre Estados</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/mercado">
                <Button className="w-full">Abrir Mercado</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                Oficina de Leis
              </CardTitle>
              <CardDescription>Crie e edite leis modulares</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/leis/criar">
                <Button className="w-full">Criar/Editar Leis</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Conselhos & Diplomacia
              </CardTitle>
              <CardDescription>Debata e negocie no conselho planetário</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/conselho-planetario">
                <Button className="w-full">Ir para Conselho Planetário</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Planet Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Status do Planeta
            </CardTitle>
            <CardDescription>Parâmetros atualizados do PlanetConfig</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Área total</p>
              <p className="font-bold">{areaTotal?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Área seca</p>
              <p className="font-bold">{landArea?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">% seca</p>
              <p className="font-bold">
                {landRatio !== null && landRatio !== undefined ? `${(landRatio * 100).toFixed(1)}%` : '...'}
              </p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Células</p>
              <p className="font-bold">{cellsTotal?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">População</p>
              <p className="font-bold">{totalPopulation?.toLocaleString() ?? '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Densidade média</p>
              <p className="font-bold">{density ? `${density.toFixed(1)} hab/km²` : '...'}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Tick atual</p>
              <p className="font-bold">{tickNumber}</p>
            </div>
            <div className="p-3 rounded bg-muted/50">
              <p className="text-xs text-muted-foreground">Última atualização</p>
              <p className="font-bold">{lastTick ? new Date(lastTick.completed_at || lastTick.started_at).toLocaleString('pt-BR') : '...'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tick feed */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Últimos eventos do planeta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length > 0 ? events.map((e) => (
              <div key={e.id} className="p-2 rounded border bg-muted/30 text-sm flex items-center justify-between">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground">{e.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">Nenhum evento registrado ainda.</p>
            )}
          </CardContent>
        </Card>

        {/* Onboarding */}
        {!myTerritory && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Primeiros passos</CardTitle>
              <CardDescription>Seu caminho para governar seu Estado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>1. Fundar Estado (auto)</p>
              <p>2. Ver sua primeira célula no mapa</p>
              <p>3. Ajustar prioridades e entrar no mercado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}