import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Globe2, Crown, Users, Layers, ArrowLeft, MapPin } from "lucide-react";

type ViewMode = "countries" | "blocs" | "regimes";

interface Cell {
  id: string;
  region_id: string | null;
  owner_territory_id: string | null;
  status: string;
  cell_type: string;
  display_name: string | null;
  area_km2: number | null;
  merged_into_cell_id: string | null;
  grid_x: number | null;
  grid_y: number | null;
}
interface Region { id: string; name: string; difficulty: string | null; }
interface Territory { id: string; name: string; government_type: string; owner_id: string; }
interface BlocMember { territory_id: string; bloc_id: string; }
interface Bloc { id: string; name: string; }
interface RegimeProfile { regime: string; display_name: string; color: string; }

// Hand-drawn polygon shapes (1000x600 viewBox) — stylized continents of TOI-700.
// Indexed by region NAME so seeding order doesn't matter.
const REGION_SHAPES: Record<string, { points: string; labelX: number; labelY: number; bbox: [number, number, number, number] }> = {
  "Hemisfério Norte": {
    points: "120,60 280,40 430,70 510,130 470,180 360,200 240,180 140,150",
    labelX: 290, labelY: 120, bbox: [120, 40, 510, 200],
  },
  "Planície Ocidental": {
    points: "60,220 200,210 280,260 250,360 140,380 70,330",
    labelX: 170, labelY: 300, bbox: [60, 210, 280, 380],
  },
  "Zona Equatorial": {
    points: "310,250 540,240 620,300 590,360 420,380 320,340",
    labelX: 470, labelY: 310, bbox: [310, 240, 620, 380],
  },
  "Montanhas Orientais": {
    points: "660,90 850,80 940,160 920,260 780,280 690,220",
    labelX: 800, labelY: 180, bbox: [660, 80, 940, 280],
  },
  "Hemisfério Sul": {
    points: "280,430 520,420 700,440 760,510 600,560 380,560 260,500",
    labelX: 510, labelY: 490, bbox: [260, 420, 760, 560],
  },
  "Arquipélago Central": {
    points: "640,330 720,320 760,360 740,400 670,410 620,380",
    labelX: 690, labelY: 370, bbox: [620, 320, 760, 410],
  },
};

function hashColor(id: string | null | undefined, fallback = "hsl(var(--muted))") {
  if (!id) return fallback;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 50%)`;
}

// Position cell using true grid coords inside the region's bbox
function pointForCell(cell: Cell, bbox: [number, number, number, number], side: number) {
  const [x1, y1, x2, y2] = bbox;
  const padX = 12;
  const padY = 12;
  const innerW = Math.max(1, x2 - x1 - padX * 2);
  const innerH = Math.max(1, y2 - y1 - padY * 2);
  const gx = cell.grid_x ?? 0;
  const gy = cell.grid_y ?? 0;
  const stepX = innerW / Math.max(1, side);
  const stepY = innerH / Math.max(1, side);
  return {
    x: x1 + padX + stepX * (gx + 0.5),
    y: y1 + padY + stepY * (gy + 0.5),
  };
}

export default function InteractiveMapPage() {
  const [mode, setMode] = useState<ViewMode>("countries");
  const [regions, setRegions] = useState<Region[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [members, setMembers] = useState<BlocMember[]>([]);
  const [blocs, setBlocs] = useState<Bloc[]>([]);
  const [profiles, setProfiles] = useState<RegimeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [r, c, t, m, b, p] = await Promise.all([
        supabase.from("regions").select("id,name,difficulty").eq("is_visible", true),
        supabase.from("cells").select("id,region_id,owner_territory_id,status,cell_type,display_name,area_km2,merged_into_cell_id,grid_x,grid_y"),
        supabase.from("territories").select("id,name,government_type,owner_id").eq("status", "active"),
        supabase.from("bloc_memberships").select("territory_id,bloc_id").eq("status", "active"),
        supabase.from("geopolitical_blocs").select("id,name"),
        supabase.from("regime_profiles").select("regime,display_name,color"),
      ]);
      setRegions((r.data ?? []) as Region[]);
      setCells((c.data ?? []) as Cell[]);
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
      if (c.merged_into_cell_id) continue; // hide absorbed cells
      const key = c.region_id ?? "no-region";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [cells]);

  const colorForCell = (cell: Cell): { color: string; label: string } => {
    if (!cell.owner_territory_id) return { color: "hsl(var(--muted-foreground) / 0.35)", label: "Não colonizado" };
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

  // Dominant owner per region (for region fill)
  const regionFill = (regionId: string): string => {
    const list = cellsByRegion.get(regionId) ?? [];
    const counts = new Map<string, { color: string; n: number }>();
    for (const c of list) {
      const { color } = colorForCell(c);
      const prev = counts.get(color);
      if (prev) prev.n++; else counts.set(color, { color, n: 1 });
    }
    let best: { color: string; n: number } | null = null;
    counts.forEach(v => { if (!best || v.n > best.n) best = v; });
    return best?.color ?? "hsl(var(--muted) / 0.4)";
  };

  const legend = useMemo(() => {
    const seen = new Map<string, { color: string; label: string; count: number }>();
    for (const cell of cells) {
      if (cell.merged_into_cell_id) continue;
      const { color, label } = colorForCell(cell);
      const k = `${color}|${label}`;
      const prev = seen.get(k);
      if (prev) prev.count++; else seen.set(k, { color, label, count: 1 });
    }
    return Array.from(seen.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  }, [cells, mode, territoryById, memberByTerritory, blocById, profileByRegime]);

  const selectedRegionObj = regions.find(r => r.id === selectedRegion) ?? null;
  const selectedShape = selectedRegionObj ? REGION_SHAPES[selectedRegionObj.name] : null;
  const selectedCells = selectedRegion ? (cellsByRegion.get(selectedRegion) ?? []) : [];

  return (
    <TooltipProvider>
      <div className="container max-w-7xl py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Globe2 className="h-9 w-9" /> Mapa Interativo de TOI-700
          </h1>
          <p className="text-muted-foreground mt-2">
            {regions.length} regiões continentais · {cells.filter(c => !c.merged_into_cell_id).length} células ativas. Clique numa região para explorar suas células.
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
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {selectedRegionObj ? selectedRegionObj.name : "Visão Planetária"}
                </CardTitle>
                <CardDescription>
                  {selectedRegionObj
                    ? `${selectedCells.length} células. Clique numa célula para abrir.`
                    : "Passe o mouse para destacar uma região, clique para explorar."}
                </CardDescription>
              </div>
              {selectedRegion && (
                <Button variant="outline" size="sm" onClick={() => setSelectedRegion(null)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando TOI-700...</p>
              ) : (
                <svg viewBox="0 0 1000 600" className="w-full h-auto rounded-md" style={{ background: "linear-gradient(180deg, hsl(210 60% 18%), hsl(210 65% 10%))" }}>
                  {/* ocean stars */}
                  {Array.from({ length: 60 }).map((_, i) => {
                    const x = (i * 53) % 1000;
                    const y = (i * 97) % 600;
                    return <circle key={i} cx={x} cy={y} r={0.6} fill="hsl(0 0% 100% / 0.35)" />;
                  })}

                  {/* Regions */}
                  {regions.map(r => {
                    const shape = REGION_SHAPES[r.name];
                    if (!shape) return null;
                    const isSelected = selectedRegion === r.id;
                    const isHovered = hoveredRegion === r.id;
                    const fill = regionFill(r.id);
                    if (selectedRegion && !isSelected) {
                      // Dim non-selected regions
                      return (
                        <polygon
                          key={r.id}
                          points={shape.points}
                          fill={fill}
                          opacity={0.18}
                          stroke="hsl(0 0% 100% / 0.2)"
                          strokeWidth={1}
                        />
                      );
                    }
                    return (
                      <g key={r.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <polygon
                              points={shape.points}
                              fill={fill}
                              opacity={isSelected ? 0.9 : isHovered ? 0.85 : 0.7}
                              stroke={isSelected || isHovered ? "hsl(var(--primary))" : "hsl(0 0% 100% / 0.5)"}
                              strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                              style={{ cursor: "pointer", transition: "all 0.2s" }}
                              onMouseEnter={() => setHoveredRegion(r.id)}
                              onMouseLeave={() => setHoveredRegion(null)}
                              onClick={() => setSelectedRegion(r.id)}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-semibold">{r.name}</div>
                              <div className="text-muted-foreground">
                                {cellsByRegion.get(r.id)?.length ?? 0} células · dificuldade {r.difficulty ?? "?"}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                        <text
                          x={shape.labelX}
                          y={shape.labelY}
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                          fill="hsl(0 0% 100% / 0.9)"
                          fontSize={isSelected ? 16 : 12}
                          fontWeight={600}
                          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                        >
                          {r.name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Cells (only when a region is selected) */}
                  {selectedShape && selectedCells.map(cell => {
                    const { x, y } = pointForCell(cell.id, selectedShape.bbox);
                    const { color, label } = colorForCell(cell);
                    const radius = cell.area_km2 ? Math.max(3, Math.min(7, Math.sqrt(cell.area_km2) / 12)) : 4;
                    return (
                      <Tooltip key={cell.id}>
                        <TooltipTrigger asChild>
                          <Link to={`/celulas/${cell.id}`}>
                            <circle
                              cx={x}
                              cy={y}
                              r={radius}
                              fill={color}
                              stroke="hsl(0 0% 100% / 0.8)"
                              strokeWidth={1}
                              style={{ cursor: "pointer", transition: "all 0.15s" }}
                              className="hover:r-[10]"
                              onMouseEnter={(e) => (e.currentTarget.setAttribute("r", String(radius + 3)))}
                              onMouseLeave={(e) => (e.currentTarget.setAttribute("r", String(radius)))}
                            />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div className="font-semibold">{cell.display_name ?? "Célula sem nome"}</div>
                            <div className="text-muted-foreground">{label}</div>
                            <div className="text-muted-foreground">
                              {cell.cell_type} · {cell.area_km2 ?? "?"} km²
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </svg>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Legenda
                </CardTitle>
                <CardDescription className="text-xs">
                  {mode === "countries" && "Cor por país"}
                  {mode === "blocs" && "Cor por bloco geopolítico"}
                  {mode === "regimes" && "Cor por regime político"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[420px] overflow-auto">
                {legend.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-3 w-3 rounded-sm flex-shrink-0 border border-border/40" style={{ backgroundColor: l.color }} />
                      <span className="truncate">{l.label}</span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">{l.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {selectedRegionObj && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedRegionObj.name}</CardTitle>
                  <CardDescription>Dificuldade: {selectedRegionObj.difficulty ?? "—"}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div>Total de células: <strong>{selectedCells.length}</strong></div>
                  <div>Colonizadas: <strong>{selectedCells.filter(c => c.owner_territory_id).length}</strong></div>
                  <div>Livres: <strong>{selectedCells.filter(c => !c.owner_territory_id).length}</strong></div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
