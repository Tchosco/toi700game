import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe2, Crown, Users, Layers } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = "countries" | "blocs" | "regimes";

interface Cell { id: string; region_id: string | null; owner_territory_id: string | null; status: string; cell_type: string; }
interface Region { id: string; name: string; difficulty: string | null; }
interface Territory { id: string; name: string; government_type: string; owner_id: string; status: string; }
interface BlocMember { territory_id: string; bloc_id: string; status: string; }
interface Bloc { id: string; name: string; }
interface RegimeProfile { regime: string; display_name: string; color: string; }

// Stable colour from id
function hashColor(id: string | null | undefined, fallback = "hsl(var(--muted))") {
  if (!id) return fallback;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

export default function PoliticalMapPage() {
  const [mode, setMode] = useState<ViewMode>("countries");
  const [cells, setCells] = useState<Cell[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [members, setMembers] = useState<BlocMember[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [profiles, setProfiles] = useState<RegimeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, r, t, m, b, p] = await Promise.all([
        supabase.from("cells").select("id,region_id,owner_territory_id,status,cell_type"),
        supabase.from("regions").select("id,name,difficulty").eq("is_visible", true),
        supabase.from("territories").select("id,name,government_type,owner_id,status").eq("status", "active"),
        supabase.from("bloc_memberships").select("territory_id,bloc_id,status").eq("status", "active"),
        supabase.from("geopolitical_blocs").select("id,name"),
        supabase.from("regime_profiles").select("regime,display_name,color"),
      ]);
      setCells((c.data ?? []) as Cell[]);
      setRegions((r.data ?? []) as Region[]);
      setTerritories((t.data ?? []) as Territory[]);
      setMembers((m.data ?? []) as BlocMember[]);
      setBlocs((b.data ?? []) as Bloc[]);
      setProfiles((p.data ?? []) as RegimeProfile[]);
      setLoading(false);
    })();
  }, []);

  const territoryById = useMemo(() => new Map(territories.map(t => [t.id, t])), [territories]);
  const blocById = useMemo(() => new Map(blocs.map(b => [b.id, b])), [blocs]);
  const memberByTerritory = useMemo(() => new Map(members.map(m => [m.territory_id, m.bloc_id])), [members]);
  const profileByRegime = useMemo(() => new Map(profiles.map(p => [p.regime, p])), [profiles]);

  const cellsByRegion = useMemo(() => {
    const map = new Map<string, Cell[]>();
    for (const c of cells) {
      const key = c.region_id ?? "no-region";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [cells]);

  const colorFor = (cell: Cell): { color: string; label: string } => {
    if (!cell.owner_territory_id) return { color: "hsl(var(--muted))", label: "Não colonizado" };
    const t = territoryById.get(cell.owner_territory_id);
    if (!t) return { color: "hsl(var(--muted))", label: "Desconhecido" };
    if (mode === "countries") return { color: hashColor(t.id), label: t.name };
    if (mode === "blocs") {
      const bId = memberByTerritory.get(t.id);
      if (!bId) return { color: "hsl(var(--muted-foreground) / 0.4)", label: `${t.name} (sem bloco)` };
      return { color: hashColor(bId), label: blocById.get(bId)?.name ?? "Bloco" };
    }
    const rp = profileByRegime.get(t.government_type);
    return { color: rp?.color ?? "hsl(var(--muted))", label: rp?.display_name ?? t.government_type };
  };

  // Build legend entries
  const legend = useMemo(() => {
    const seen = new Map<string, { color: string; label: string; count: number }>();
    for (const cell of cells) {
      const { color, label } = colorFor(cell);
      const k = `${color}|${label}`;
      const prev = seen.get(k);
      if (prev) prev.count++;
      else seen.set(k, { color, label, count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => b.count - a.count);
  }, [cells, mode, territoryById, memberByTerritory, blocById, profileByRegime]);

  return (
    <TooltipProvider>
      <div className="container max-w-7xl py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3"><Globe2 className="h-9 w-9" /> Mapa Político Planetário</h1>
          <p className="text-muted-foreground mt-2">
            TOI-700 dividida em {regions.length} regiões e {cells.length} células. Alterne entre visualização por país, bloco geopolítico ou regime.
          </p>
        </div>

        <Tabs value={mode} onValueChange={v => setMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="countries"><Crown className="h-4 w-4 mr-1" /> Países</TabsTrigger>
            <TabsTrigger value="blocs"><Layers className="h-4 w-4 mr-1" /> Blocos</TabsTrigger>
            <TabsTrigger value="regimes"><Users className="h-4 w-4 mr-1" /> Regimes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Map */}
          <Card>
            <CardHeader>
              <CardTitle>Regiões</CardTitle>
              <CardDescription>Cada quadrado é uma célula territorial. Passe o mouse para detalhes.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {regions.map(r => {
                    const list = cellsByRegion.get(r.id) ?? [];
                    return (
                      <div key={r.id} className="border rounded-lg p-3 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-sm">{r.name}</strong>
                          <Badge variant="outline" className="text-xs">{list.length} células</Badge>
                        </div>
                        <div className="grid grid-cols-12 gap-0.5">
                          {list.map(cell => {
                            const { color, label } = colorFor(cell);
                            return (
                              <Tooltip key={cell.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="aspect-square rounded-sm border border-border/40 hover:ring-2 hover:ring-primary transition"
                                    style={{ backgroundColor: color }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <div className="font-semibold">{label}</div>
                                    <div className="text-muted-foreground">{cell.cell_type} · {cell.status}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                          {list.length === 0 && (
                            <span className="col-span-12 text-xs text-muted-foreground">Sem células ativadas</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(cellsByRegion.get("no-region")?.length ?? 0) > 0 && (
                    <div className="border rounded-lg p-3 bg-card">
                      <strong className="text-sm">Sem região atribuída</strong>
                      <div className="grid grid-cols-12 gap-0.5 mt-2">
                        {cellsByRegion.get("no-region")!.map(cell => {
                          const { color, label } = colorFor(cell);
                          return (
                            <Tooltip key={cell.id}>
                              <TooltipTrigger asChild>
                                <div className="aspect-square rounded-sm border border-border/40" style={{ backgroundColor: color }} />
                              </TooltipTrigger>
                              <TooltipContent><span className="text-xs">{label}</span></TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card className="h-fit sticky top-4">
            <CardHeader>
              <CardTitle>Legenda</CardTitle>
              <CardDescription>
                {mode === "countries" && "Cor por país"}
                {mode === "blocs" && "Cor por bloco geopolítico"}
                {mode === "regimes" && "Cor por regime político"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-auto">
              {legend.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-4 w-4 rounded-sm shrink-0 border" style={{ backgroundColor: l.color }} />
                    <span className="truncate">{l.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{l.count}</Badge>
                </div>
              ))}
              {legend.length === 0 && <p className="text-xs text-muted-foreground">Sem dados.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
