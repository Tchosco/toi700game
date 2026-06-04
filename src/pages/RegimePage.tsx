import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Crown, Landmark, Church, Users, Vote, Shield, History } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Regime = Database["public"]["Enums"]["government_type"];
type RegimeProfile = Database["public"]["Tables"]["regime_profiles"]["Row"];
type RegimeTransition = Database["public"]["Tables"]["regime_transitions"]["Row"];

const ICONS: Record<string, any> = { crown: Crown, landmark: Landmark, church: Church, users: Users, vote: Vote, shield: Shield };

export default function RegimePage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<RegimeProfile[]>([]);
  const [territories, setTerritories] = useState<any[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>("");
  const [targetRegime, setTargetRegime] = useState<Regime | "">("");
  const [method, setMethod] = useState<"reform" | "vote" | "coup">("reform");
  const [rationale, setRationale] = useState("");
  const [history, setHistory] = useState<RegimeTransition[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase.from("regime_profiles").select("*").order("display_name"),
      user
        ? supabase.from("territories").select("id,name,government_type,status").eq("owner_id", user.id).eq("status", "active")
        : Promise.resolve({ data: [] as any[] }),
    ]);
    setProfiles((p ?? []) as RegimeProfile[]);
    setTerritories(t ?? []);
    if (t && t.length && !selectedTerritory) setSelectedTerritory(t[0].id);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    if (!selectedTerritory) { setHistory([]); return; }
    supabase
      .from("regime_transitions")
      .select("*")
      .eq("territory_id", selectedTerritory)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory((data ?? []) as RegimeTransition[]));
  }, [selectedTerritory]);

  const currentTerritory = territories.find(t => t.id === selectedTerritory);
  const currentProfile = useMemo(
    () => profiles.find(p => p.regime === currentTerritory?.government_type),
    [profiles, currentTerritory]
  );

  const submit = async () => {
    if (!selectedTerritory || !targetRegime) {
      toast.error("Selecione país e novo regime");
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc("initiate_regime_change", {
      p_territory_id: selectedTerritory,
      p_to_regime: targetRegime as Regime,
      p_method: method,
      p_rationale: rationale || null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(
      method === "vote"
        ? "Transição pendente — abra uma votação parlamentar"
        : "Regime alterado com sucesso"
    );
    setRationale(""); setTargetRegime("");
    load();
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3"><Crown className="h-9 w-9" /> Regimes Políticos</h1>
        <p className="text-muted-foreground mt-2">
          Cada regime define os títulos das leis nacionais, dos decretos e da liderança, além de modificadores de estabilidade, economia, força militar e influência.
        </p>
      </div>

      {/* Catálogo de regimes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(p => {
          const Icon = ICONS[p.icon] ?? Crown;
          const isCurrent = currentProfile?.regime === p.regime;
          return (
            <Card key={p.id} className={isCurrent ? "border-2 border-primary" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2" style={{ color: p.color }}>
                    <Icon className="h-5 w-5" /> {p.display_name}
                  </span>
                  {isCurrent && <Badge>Atual</Badge>}
                </CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div><strong>Líder:</strong> {p.leader_title}</div>
                <div><strong>Assembleia:</strong> {p.parliament_name}</div>
                <div><strong>Lei nacional:</strong> <span className="font-mono">{p.national_law_label}</span></div>
                <div><strong>Decreto:</strong> <span className="font-mono">{p.decree_label}</span></div>
                <div className="flex gap-2 flex-wrap pt-2 text-xs">
                  <Badge variant="outline">Estab {fmt(p.stability_modifier)}</Badge>
                  <Badge variant="outline">Econ {fmt(p.economic_modifier)}</Badge>
                  <Badge variant="outline">Mil {fmt(p.military_modifier)}</Badge>
                  <Badge variant="outline">Inf {fmt(p.influence_modifier)}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mudança de regime */}
      {user && territories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar mudança de regime</CardTitle>
            <CardDescription>
              Cooldown de 90 dias entre mudanças. Reforma e golpe são imediatos; voto fica pendente para apuração no parlamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">País</label>
                <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {territories.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Novo regime</label>
                <Select value={targetRegime} onValueChange={v => setTargetRegime(v as Regime)}>
                  <SelectTrigger><SelectValue placeholder="Escolher..." /></SelectTrigger>
                  <SelectContent>
                    {profiles
                      .filter(p => p.regime !== currentTerritory?.government_type)
                      .map(p => <SelectItem key={p.regime} value={p.regime}>{p.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Método</label>
                <Select value={method} onValueChange={v => setMethod(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reform">Reforma constitucional</SelectItem>
                    <SelectItem value="vote">Voto parlamentar</SelectItem>
                    <SelectItem value="coup">Golpe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Justificativa (opcional)</label>
              <Textarea value={rationale} onChange={e => setRationale(e.target.value)} placeholder="Por que essa mudança?" rows={3} />
            </div>
            <Button onClick={submit} disabled={loading}>Iniciar transição</Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      {selectedTerritory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Histórico de regimes</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transição registrada.</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between border rounded-md p-3 text-sm">
                    <div>
                      <strong>{h.from_regime}</strong> → <strong>{h.to_regime}</strong>
                      <div className="text-xs text-muted-foreground">
                        {h.method} · {new Date(h.created_at).toLocaleString("pt-BR")}
                        {h.rationale ? ` · ${h.rationale}` : ""}
                      </div>
                    </div>
                    <Badge variant={h.status === "executed" ? "default" : "secondary"}>{h.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function fmt(n: number) { return n > 0 ? `+${n}` : `${n}`; }
