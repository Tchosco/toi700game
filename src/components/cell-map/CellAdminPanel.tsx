"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, Combine, Split } from "lucide-react";

interface Province { id: string; name: string; }
interface NeighborCell {
  id: string;
  display_name: string | null;
  area_km2: number;
  province_id: string | null;
}

interface Props {
  cellId: string;
  ownerTerritoryId: string;
  currentProvinceId: string | null;
  currentDisplayName: string | null;
  currentAreaKm2: number;
  regionId: string | null;
  mergedIntoCellId: string | null;
  isOwner: boolean;
  onChanged?: () => void;
}

export function CellAdminPanel({
  cellId, ownerTerritoryId, currentProvinceId, currentDisplayName,
  currentAreaKm2, regionId, mergedIntoCellId, isOwner, onChanged,
}: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(currentDisplayName ?? "");
  const [provinceId, setProvinceId] = useState<string>(currentProvinceId ?? "__none__");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [neighbors, setNeighbors] = useState<NeighborCell[]>([]);
  const [mergeTarget, setMergeTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(currentDisplayName ?? "");
    setProvinceId(currentProvinceId ?? "__none__");
  }, [currentDisplayName, currentProvinceId]);

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      const { data: provs } = await supabase
        .from("provinces" as any)
        .select("id,name")
        .eq("territory_id", ownerTerritoryId)
        .order("name");
      setProvinces((provs ?? []) as any);

      if (regionId) {
        const { data: nbrs } = await supabase
          .from("cells")
          .select("id, display_name, area_km2, province_id")
          .eq("owner_territory_id", ownerTerritoryId)
          .eq("region_id", regionId)
          .is("merged_into_cell_id", null)
          .neq("id", cellId);
        setNeighbors((nbrs ?? []) as any);
      }
    })();
  }, [isOwner, ownerTerritoryId, regionId, cellId]);

  const handleRename = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("rename_cell", {
      p_cell_id: cellId,
      p_name: name.trim(),
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Cidade renomeada" });
    onChanged?.();
  };

  const handleAssignProvince = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("assign_cell_to_province", {
      p_cell_id: cellId,
      p_province_id: provinceId === "__none__" ? null : provinceId,
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Província atualizada" });
    onChanged?.();
  };

  const handleMerge = async () => {
    if (!mergeTarget) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("merge_cells", {
      p_master_cell_id: cellId,
      p_absorbed_cell_id: mergeTarget,
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Células mescladas" });
    setMergeTarget("");
    onChanged?.();
  };

  const handleUnmerge = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("unmerge_cell", { p_absorbed_cell_id: cellId });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Mescla desfeita" });
    onChanged?.();
  };

  // Eligible neighbors: same province as this cell
  const eligibleNeighbors = neighbors.filter(n =>
    (n.province_id ?? null) === (currentProvinceId ?? null) &&
    (currentAreaKm2 + n.area_km2) <= 5000
  );

  if (mergedIntoCellId) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" /> Célula Mesclada
          </CardTitle>
          <CardDescription>Esta célula foi absorvida por outra.</CardDescription>
        </CardHeader>
        <CardContent>
          {isOwner && (
            <Button onClick={handleUnmerge} disabled={busy} variant="outline">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Desfazer mescla
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" /> Administração da Célula
        </CardTitle>
        <CardDescription>
          {isOwner ? "Renomeie a cidade, organize por província e agrupe células limítrofes." : "Apenas o dono pode editar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rename */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome da cidade</label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={!isOwner || busy} placeholder="Ex: Porto Novo" />
            <Button onClick={handleRename} disabled={!isOwner || busy || !name.trim()}>Salvar</Button>
          </div>
        </div>

        {/* Province */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Província</label>
          <div className="flex gap-2">
            <Select value={provinceId} onValueChange={setProvinceId} disabled={!isOwner || busy}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sem província" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem província</SelectItem>
                {provinces.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignProvince} disabled={!isOwner || busy}>Aplicar</Button>
          </div>
          {provinces.length === 0 && isOwner && (
            <p className="text-xs text-muted-foreground">Crie províncias na página do país.</p>
          )}
        </div>

        {/* Merge */}
        <div className="space-y-2 pt-4 border-t border-border/40">
          <label className="text-sm font-medium flex items-center gap-2">
            <Combine className="h-4 w-4" /> Agrupar com célula vizinha
          </label>
          <p className="text-xs text-muted-foreground">
            Apenas células do seu país, na mesma região e mesma província. Área combinada máxima: 5.000 km².
          </p>
          <div className="flex gap-2">
            <Select value={mergeTarget} onValueChange={setMergeTarget} disabled={!isOwner || busy}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={eligibleNeighbors.length === 0 ? "Nenhuma elegível" : "Escolha a célula"} />
              </SelectTrigger>
              <SelectContent>
                {eligibleNeighbors.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    {(n.display_name ?? `Célula ${n.id.slice(0, 6)}`)} — {n.area_km2.toLocaleString()} km²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleMerge} disabled={!isOwner || busy || !mergeTarget}>Mesclar</Button>
          </div>
          <div className="flex gap-2 items-center text-xs text-muted-foreground">
            <Badge variant="outline">Atual: {currentAreaKm2.toLocaleString()} km²</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
