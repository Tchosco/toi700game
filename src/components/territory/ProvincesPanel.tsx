"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, MapPin, Tag } from "lucide-react";

interface Province {
  id: string;
  name: string;
  color: string | null;
  capital_cell_id: string | null;
}

interface Props {
  territoryId: string;
  ownerId: string;
  currentDisplayName?: string | null;
  currentName: string;
}

export function ProvincesPanel({ territoryId, ownerId, currentDisplayName, currentName }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = !!user && user.id === ownerId;

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [nickname, setNickname] = useState(currentDisplayName ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [cellCounts, setCellCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("provinces" as any)
      .select("id,name,color,capital_cell_id")
      .eq("territory_id", territoryId)
      .order("created_at");
    setProvinces((data ?? []) as any);

    const { data: cells } = await supabase
      .from("cells")
      .select("province_id")
      .eq("owner_territory_id", territoryId);
    const counts: Record<string, number> = {};
    (cells ?? []).forEach((c: any) => {
      if (c.province_id) counts[c.province_id] = (counts[c.province_id] ?? 0) + 1;
    });
    setCellCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    load();
    setNickname(currentDisplayName ?? "");
  }, [territoryId, currentDisplayName]);

  const handleSaveNickname = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("rename_territory", {
      p_territory_id: territoryId,
      p_nickname: nickname.trim(),
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Apelido salvo" });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("create_province", {
      p_territory_id: territoryId,
      p_name: newName.trim(),
      p_color: null,
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewName("");
    toast({ title: "Província criada" });
    load();
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("rename_province", {
      p_province_id: id,
      p_name: editName.trim(),
    });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setEditingId(null);
    setEditName("");
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta província? As células voltam a não ter província.")) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("delete_province", { p_province_id: id });
    setBusy(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Província removida" });
    load();
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Administração do País
        </CardTitle>
        <CardDescription>
          {isOwner
            ? "Renomeie seu país livremente e organize suas células em províncias."
            : "Apenas o dono pode editar."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Nickname */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4" /> Apelido do país
          </label>
          <p className="text-xs text-muted-foreground">Nome oficial: <span className="font-mono">{currentName}</span></p>
          <div className="flex gap-2">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={80}
              placeholder="Ex: A Pátria"
              disabled={!isOwner || busy}
            />
            <Button onClick={handleSaveNickname} disabled={!isOwner || busy || !nickname.trim()}>
              Salvar
            </Button>
          </div>
        </div>

        <div className="border-t border-border/40 pt-4 space-y-3">
          <h3 className="font-medium">Províncias ({provinces.length})</h3>

          {isOwner && (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da nova província"
                maxLength={80}
                disabled={busy}
              />
              <Button onClick={handleCreate} disabled={busy || !newName.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Criar
              </Button>
            </div>
          )}

          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : provinces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma província criada.</p>
          ) : (
            <ul className="space-y-2">
              {provinces.map((p) => (
                <li key={p.id} className="flex items-center gap-2 p-2 rounded border border-border/40 bg-muted/20">
                  {editingId === p.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={80}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleRename(p.id)} disabled={busy}>OK</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{p.name}</span>
                      <Badge variant="outline">{cellCounts[p.id] ?? 0} células</Badge>
                      {isOwner && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
