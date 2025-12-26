import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from './AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Swords, FileText, Handshake, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface War {
  id: string;
  title: string;
  status: string;
  attacker_id: string;
  defender_id: string;
  attacker_war_score: number;
  defender_war_score: number;
  cycles_elapsed: number;
  max_cycles: number;
  declared_at: string;
  ended_at: string | null;
  winner_id: string | null;
}

interface Treaty {
  id: string;
  treaty_type: string;
  title: string;
  territory_a_id: string;
  territory_b_id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Territory {
  id: string;
  name: string;
}

interface DiplomaticRelation {
  id: string;
  territory_a_id: string;
  territory_b_id: string;
  status: string;
  relation_score: number;
}

export default function AdminDiplomacy() {
  const [wars, setWars] = useState<War[]>([]);
  const [treaties, setTreaties] = useState<Treaty[]>([]);
  const [relations, setRelations] = useState<DiplomaticRelation[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [warsRes, treatiesRes, relationsRes, territoriesRes] = await Promise.all([
        supabase.from('wars').select('*').order('declared_at', { ascending: false }),
        supabase.from('treaties').select('*').order('created_at', { ascending: false }),
        supabase.from('diplomatic_relations').select('*').order('relation_score', { ascending: false }),
        supabase.from('territories').select('id, name')
      ]);

      if (warsRes.data) setWars(warsRes.data);
      if (treatiesRes.data) setTreaties(treatiesRes.data);
      if (relationsRes.data) setRelations(relationsRes.data);
      if (territoriesRes.data) setTerritories(territoriesRes.data);
    } catch (error) {
      console.error('Error fetching diplomacy data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getTerritoryName = (id: string) => territories.find(t => t.id === id)?.name || 'Desconhecido';

  const warStatusColors: Record<string, string> = {
    declared: 'bg-status-warning/20 text-status-warning',
    active: 'bg-destructive/20 text-destructive',
    ceasefire: 'bg-blue-500/20 text-blue-400',
    ended: 'bg-muted text-muted-foreground'
  };

  const treatyStatusColors: Record<string, string> = {
    proposed: 'bg-status-warning/20 text-status-warning',
    active: 'bg-status-success/20 text-status-success',
    rejected: 'bg-destructive/20 text-destructive',
    expired: 'bg-muted text-muted-foreground',
    violated: 'bg-destructive/20 text-destructive'
  };

  const treatyTypeLabels: Record<string, string> = {
    peace: 'Paz',
    trade: 'Comércio',
    alliance: 'Aliança',
    non_aggression: 'Não-Agressão',
    research: 'Pesquisa',
    territorial: 'Territorial'
  };

  const diplomaticStatusLabels: Record<string, string> = {
    peace: 'Paz',
    tension: 'Tensão',
    cold_war: 'Guerra Fria',
    war: 'Guerra',
    alliance: 'Aliança',
    trade_partner: 'Parceiro Comercial'
  };

  const diplomaticStatusColors: Record<string, string> = {
    peace: 'bg-muted text-muted-foreground',
    tension: 'bg-status-warning/20 text-status-warning',
    cold_war: 'bg-blue-500/20 text-blue-400',
    war: 'bg-destructive/20 text-destructive',
    alliance: 'bg-status-success/20 text-status-success',
    trade_partner: 'bg-primary/20 text-primary'
  };

  const stats = {
    activeWars: wars.filter(w => w.status === 'active' || w.status === 'declared').length,
    activeTreaties: treaties.filter(t => t.status === 'active').length,
    totalRelations: relations.length,
    atWar: relations.filter(r => r.status === 'war').length
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display text-glow">Diplomacia & Conflitos</h1>
          <p className="text-muted-foreground mt-1">
            Guerras, tratados e relações diplomáticas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card border-destructive/30">
            <CardHeader className="pb-2">
              <CardDescription>Guerras Ativas</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.activeWars}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card border-status-success/30">
            <CardHeader className="pb-2">
              <CardDescription>Tratados Ativos</CardDescription>
              <CardTitle className="text-2xl text-status-success">{stats.activeTreaties}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Relações Diplomáticas</CardDescription>
              <CardTitle className="text-2xl">{stats.totalRelations}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardDescription>Territórios em Guerra</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.atWar * 2}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="wars" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wars" className="gap-2">
              <Swords className="w-4 h-4" />
              Guerras
            </TabsTrigger>
            <TabsTrigger value="treaties" className="gap-2">
              <FileText className="w-4 h-4" />
              Tratados
            </TabsTrigger>
            <TabsTrigger value="relations" className="gap-2">
              <Handshake className="w-4 h-4" />
              Relações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wars">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Guerras</CardTitle>
                <CardDescription>
                  Conflitos ativos e histórico de guerras
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conflito</TableHead>
                      <TableHead>Atacante</TableHead>
                      <TableHead>Defensor</TableHead>
                      <TableHead>Placar</TableHead>
                      <TableHead>Ciclos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wars.map((war) => (
                      <TableRow key={war.id}>
                        <TableCell className="font-medium">{war.title}</TableCell>
                        <TableCell>{getTerritoryName(war.attacker_id)}</TableCell>
                        <TableCell>{getTerritoryName(war.defender_id)}</TableCell>
                        <TableCell className="font-mono">
                          <span className="text-destructive">{war.attacker_war_score}</span>
                          {' × '}
                          <span className="text-blue-400">{war.defender_war_score}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {war.cycles_elapsed}/{war.max_cycles}
                        </TableCell>
                        <TableCell>
                          <Badge className={warStatusColors[war.status] || 'bg-muted'}>
                            {war.status === 'declared' && 'Declarada'}
                            {war.status === 'active' && 'Ativa'}
                            {war.status === 'ceasefire' && 'Cessar-Fogo'}
                            {war.status === 'ended' && 'Encerrada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(war.declared_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {wars.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhuma guerra registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treaties">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Tratados</CardTitle>
                <CardDescription>
                  Acordos entre territórios
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Partes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Validade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treaties.map((treaty) => (
                      <TableRow key={treaty.id}>
                        <TableCell className="font-medium">{treaty.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {treatyTypeLabels[treaty.treaty_type] || treaty.treaty_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            {getTerritoryName(treaty.territory_a_id)}
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            {getTerritoryName(treaty.territory_b_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={treatyStatusColors[treaty.status] || 'bg-muted'}>
                            {treaty.status === 'proposed' && 'Proposto'}
                            {treaty.status === 'active' && 'Ativo'}
                            {treaty.status === 'rejected' && 'Rejeitado'}
                            {treaty.status === 'expired' && 'Expirado'}
                            {treaty.status === 'violated' && 'Violado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {treaty.expires_at 
                            ? format(new Date(treaty.expires_at), 'dd/MM/yy', { locale: ptBR })
                            : 'Permanente'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {treaties.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum tratado registrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="relations">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Relações Diplomáticas</CardTitle>
                <CardDescription>
                  Status das relações entre territórios
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Território A</TableHead>
                      <TableHead>Território B</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pontuação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.map((relation) => (
                      <TableRow key={relation.id}>
                        <TableCell className="font-medium">
                          {getTerritoryName(relation.territory_a_id)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {getTerritoryName(relation.territory_b_id)}
                        </TableCell>
                        <TableCell>
                          <Badge className={diplomaticStatusColors[relation.status] || 'bg-muted'}>
                            {diplomaticStatusLabels[relation.status] || relation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={relation.relation_score > 0 ? 'text-status-success' : relation.relation_score < 0 ? 'text-destructive' : 'text-muted-foreground'}>
                            {relation.relation_score > 0 ? '+' : ''}{relation.relation_score}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    {relations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhuma relação diplomática registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}