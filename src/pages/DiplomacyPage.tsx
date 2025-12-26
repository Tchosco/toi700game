import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Swords, Handshake, ShoppingBag, Plus, AlertTriangle } from 'lucide-react';

export default function DiplomacyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wars, setWars] = useState<any[]>([]);
  const [tradeDeals, setTradeDeals] = useState<any[]>([]);
  const [cellsForSale, setCellsForSale] = useState<any[]>([]);
  const [myTerritory, setMyTerritory] = useState<any>(null);
  const [otherTerritories, setOtherTerritories] = useState<any[]>([]);
  const [myResources, setMyResources] = useState<any[]>([]);
  const [myCells, setMyCells] = useState<any[]>([]);
  
  // War declaration form state
  const [warDialogOpen, setWarDialogOpen] = useState(false);
  const [selectedTargetTerritory, setSelectedTargetTerritory] = useState<string>('');
  const [targetCells, setTargetCells] = useState<any[]>([]);
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [warTitle, setWarTitle] = useState('');
  const [declaring, setDeclaring] = useState(false);

  // Trade deal form state
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeTargetTerritory, setTradeTargetTerritory] = useState<string>('');
  const [proposing, setProposing] = useState(false);
  const [offer, setOffer] = useState({ currency: 0, food: 0, energy: 0, minerals: 0, tech: 0, cells: [] as string[] });
  const [request, setRequest] = useState({ currency: 0, food: 0, energy: 0, minerals: 0, tech: 0, cells: [] as string[] });
  const [tradeTargetCells, setTradeTargetCells] = useState<any[]>([]);

  useEffect(() => { fetchData(); }, [user]);

  useEffect(() => {
    if (selectedTargetTerritory) {
      fetchTargetCells(selectedTargetTerritory);
    } else {
      setTargetCells([]);
      setSelectedCells([]);
    }
  }, [selectedTargetTerritory]);

  async function fetchData() {
    setLoading(true);
    try {
      const [warsRes, dealsRes, salesRes, territoriesRes] = await Promise.all([
        supabase.from('wars').select('*, attacker:territories!wars_attacker_id_fkey(name), defender:territories!wars_defender_id_fkey(name)').in('status', ['declared', 'active']).order('created_at', { ascending: false }),
        supabase.from('trade_deals').select('*, from_territory:territories!trade_deals_from_territory_id_fkey(name), to_territory:territories!trade_deals_to_territory_id_fkey(name)').eq('status', 'proposed').order('created_at', { ascending: false }),
        supabase.from('territory_transfers').select('*, cells(id, region_id), from_territory:territories!territory_transfers_from_territory_id_fkey(name)').eq('transfer_type', 'sale_pending'),
        supabase.from('territories').select('id, name, owner_id, is_neutral').eq('status', 'active').eq('is_neutral', false),
      ]);

      if (warsRes.data) setWars(warsRes.data);
      if (dealsRes.data) setTradeDeals(dealsRes.data);
      if (salesRes.data) setCellsForSale(salesRes.data);

      if (user) {
        const { data: territory } = await supabase.from('territories').select('*').eq('owner_id', user.id).eq('status', 'active').limit(1).maybeSingle();
        setMyTerritory(territory);
        
        if (territoriesRes.data && territory) {
          setOtherTerritories(territoriesRes.data.filter(t => t.id !== territory.id));
          
          // Fetch my resources
          const { data: resources } = await supabase.from('territory_resources').select('*').eq('territory_id', territory.id);
          setMyResources(resources || []);
          
          // Fetch my cells
          const { data: cells } = await supabase.from('cells').select('id, cell_type, is_urban_eligible, region_id, regions(name)').eq('owner_territory_id', territory.id).eq('status', 'colonized');
          setMyCells(cells || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTradeTargetCells(territoryId: string) {
    const { data } = await supabase
      .from('cells')
      .select('id, cell_type, is_urban_eligible, region_id, regions(name)')
      .eq('owner_territory_id', territoryId)
      .eq('status', 'colonized');
    setTradeTargetCells(data || []);
  }

  useEffect(() => {
    if (tradeTargetTerritory) {
      fetchTradeTargetCells(tradeTargetTerritory);
    } else {
      setTradeTargetCells([]);
      setRequest(r => ({ ...r, cells: [] }));
    }
  }, [tradeTargetTerritory]);

  async function fetchTargetCells(territoryId: string) {
    const { data } = await supabase
      .from('cells')
      .select('id, cell_type, is_urban_eligible, region_id, regions(name)')
      .eq('owner_territory_id', territoryId)
      .eq('status', 'colonized');
    setTargetCells(data || []);
  }

  function toggleCellSelection(cellId: string) {
    setSelectedCells(prev => 
      prev.includes(cellId) 
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  }

  function selectAllCells() {
    if (selectedCells.length === targetCells.length) {
      setSelectedCells([]);
    } else {
      setSelectedCells(targetCells.map(c => c.id));
    }
  }

  async function handleDeclareWar() {
    if (!selectedTargetTerritory || selectedCells.length === 0) {
      toast({ title: 'Erro', description: 'Selecione um território e pelo menos uma célula.', variant: 'destructive' });
      return;
    }

    setDeclaring(true);
    try {
      const res = await supabase.functions.invoke('declare-war', {
        body: {
          action: 'declare',
          target_territory_id: selectedTargetTerritory,
          target_cells: selectedCells,
          title: warTitle || undefined,
        }
      });

      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message);
      }

      toast({ title: 'Guerra Declarada!', description: res.data.message });
      setWarDialogOpen(false);
      setSelectedTargetTerritory('');
      setSelectedCells([]);
      setWarTitle('');
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setDeclaring(false);
    }
  }

  async function handleProposeTrade() {
    if (!tradeTargetTerritory) {
      toast({ title: 'Erro', description: 'Selecione um território destinatário.', variant: 'destructive' });
      return;
    }

    const hasOffer = offer.currency > 0 || offer.food > 0 || offer.energy > 0 || offer.minerals > 0 || offer.tech > 0 || offer.cells.length > 0;
    const hasRequest = request.currency > 0 || request.food > 0 || request.energy > 0 || request.minerals > 0 || request.tech > 0 || request.cells.length > 0;

    if (!hasOffer && !hasRequest) {
      toast({ title: 'Erro', description: 'A proposta deve incluir uma oferta ou um pedido.', variant: 'destructive' });
      return;
    }

    setProposing(true);
    try {
      const targetTerritory = otherTerritories.find(t => t.id === tradeTargetTerritory);
      
      const { error } = await supabase.from('trade_deals').insert({
        from_territory_id: myTerritory.id,
        to_territory_id: tradeTargetTerritory,
        from_user_id: user!.id,
        to_user_id: targetTerritory.owner_id,
        offer,
        request,
        status: 'proposed',
      });

      if (error) throw error;

      toast({ title: 'Proposta Enviada!', description: `Proposta de troca enviada para ${targetTerritory.name}.` });
      setTradeDialogOpen(false);
      resetTradeForm();
      fetchData();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setProposing(false);
    }
  }

  function resetTradeForm() {
    setTradeTargetTerritory('');
    setOffer({ currency: 0, food: 0, energy: 0, minerals: 0, tech: 0, cells: [] });
    setRequest({ currency: 0, food: 0, energy: 0, minerals: 0, tech: 0, cells: [] });
  }

  function formatDealSummary(deal: { currency?: number; food?: number; energy?: number; minerals?: number; tech?: number; cells?: string[] }) {
    const parts: string[] = [];
    if (deal.currency && deal.currency > 0) parts.push(`₮${deal.currency}`);
    if (deal.food && deal.food > 0) parts.push(`🌾${deal.food}`);
    if (deal.energy && deal.energy > 0) parts.push(`⚡${deal.energy}`);
    if (deal.minerals && deal.minerals > 0) parts.push(`🪨${deal.minerals}`);
    if (deal.tech && deal.tech > 0) parts.push(`🔬${deal.tech}`);
    if (deal.cells && deal.cells.length > 0) parts.push(`📍${deal.cells.length} células`);
    return parts.length > 0 ? parts.join(', ') : 'Nada';
  }

  function toggleOfferCell(cellId: string) {
    setOffer(o => ({
      ...o,
      cells: o.cells.includes(cellId) ? o.cells.filter(c => c !== cellId) : [...o.cells, cellId]
    }));
  }

  function toggleRequestCell(cellId: string) {
    setRequest(r => ({
      ...r,
      cells: r.cells.includes(cellId) ? r.cells.filter(c => c !== cellId) : [...r.cells, cellId]
    }));
  }

  async function handleAcceptDeal(dealId: string) {
    try {
      const res = await supabase.functions.invoke('execute-trade-deal', { body: { action: 'accept', deal_id: dealId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Sucesso!', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  async function handleRejectDeal(dealId: string) {
    try {
      const res = await supabase.functions.invoke('execute-trade-deal', { body: { action: 'reject', deal_id: dealId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Rejeitado', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  async function handleSurrender(warId: string) {
    if (!confirm('Tem certeza? Você perderá todas as células em disputa.')) return;
    try {
      const res = await supabase.functions.invoke('declare-war', { body: { action: 'surrender', war_id: warId } });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast({ title: 'Rendição', description: res.data.message });
      fetchData();
    } catch (e: any) { toast({ title: 'Erro', description: e.message, variant: 'destructive' }); }
  }

  if (loading) return <Layout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display text-glow">Diplomacia & Guerra</h1>
          <p className="text-muted-foreground">Gerencie relações, trocas e conflitos</p>
        </div>

        <Tabs defaultValue="wars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="wars"><Swords className="w-4 h-4 mr-2" />Guerras</TabsTrigger>
            <TabsTrigger value="trades"><Handshake className="w-4 h-4 mr-2" />Trocas</TabsTrigger>
            <TabsTrigger value="sales"><ShoppingBag className="w-4 h-4 mr-2" />Vendas</TabsTrigger>
          </TabsList>

          <TabsContent value="wars">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" />Guerras Ativas</CardTitle>
                  <CardDescription>Conflitos são resolvidos por turnos. A cada tick, poder militar é calculado.</CardDescription>
                </div>
                {myTerritory && (
                  <Dialog open={warDialogOpen} onOpenChange={setWarDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive"><Plus className="w-4 h-4 mr-2" />Declarar Guerra</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Swords className="text-destructive" />Declarar Guerra</DialogTitle>
                        <DialogDescription>Escolha um território alvo e as células que deseja conquistar. Declarar guerra custa 10 de estabilidade.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Título da Guerra (opcional)</Label>
                          <Input 
                            value={warTitle} 
                            onChange={(e) => setWarTitle(e.target.value)} 
                            placeholder="Ex: Guerra pela Fronteira Norte"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Território Alvo</Label>
                          <Select value={selectedTargetTerritory} onValueChange={setSelectedTargetTerritory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um território" />
                            </SelectTrigger>
                            <SelectContent>
                              {otherTerritories.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedTargetTerritory && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Células Alvo ({selectedCells.length} selecionadas)</Label>
                              <Button variant="ghost" size="sm" onClick={selectAllCells}>
                                {selectedCells.length === targetCells.length ? 'Desmarcar' : 'Selecionar'} Todas
                              </Button>
                            </div>
                            {targetCells.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Este território não possui células colonizadas.</p>
                            ) : (
                              <ScrollArea className="h-48 rounded-md border p-2">
                                <div className="space-y-2">
                                  {targetCells.map(cell => (
                                    <div key={cell.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50">
                                      <Checkbox 
                                        id={cell.id} 
                                        checked={selectedCells.includes(cell.id)}
                                        onCheckedChange={() => toggleCellSelection(cell.id)}
                                      />
                                      <label htmlFor={cell.id} className="flex-1 cursor-pointer text-sm">
                                        <span className="font-mono">{cell.id.slice(0, 8)}...</span>
                                        <span className="ml-2 text-muted-foreground">
                                          {cell.cell_type === 'urban' ? '🏙️' : '🌾'} 
                                          {cell.is_urban_eligible && '⭐'}
                                        </span>
                                        {cell.regions?.name && (
                                          <Badge variant="outline" className="ml-2 text-xs">{cell.regions.name}</Badge>
                                        )}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setWarDialogOpen(false)}>Cancelar</Button>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeclareWar} 
                          disabled={declaring || selectedCells.length === 0}
                        >
                          {declaring && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Declarar Guerra
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Atacante</TableHead><TableHead>Defensor</TableHead><TableHead>Células</TableHead><TableHead>Ciclos</TableHead><TableHead>Placar</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {wars.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma guerra ativa</TableCell></TableRow> :
                      wars.map((war) => {
                        const isParticipant = myTerritory && (war.attacker_id === myTerritory.id || war.defender_id === myTerritory.id);
                        return (
                          <TableRow key={war.id}>
                            <TableCell className="font-medium">{war.attacker?.name}</TableCell>
                            <TableCell>{war.defender?.name}</TableCell>
                            <TableCell>{(war.target_cells as string[])?.length || 0}</TableCell>
                            <TableCell>{war.cycles_elapsed}/{war.max_cycles}</TableCell>
                            <TableCell><span className="text-green-400">{war.attacker_war_score}</span> / <span className="text-red-400">{war.defender_war_score}</span></TableCell>
                            <TableCell>{isParticipant && <Button size="sm" variant="destructive" onClick={() => handleSurrender(war.id)}>Render-se</Button>}</TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Handshake className="text-primary" />Propostas de Troca</CardTitle>
                  <CardDescription>Negocie recursos, moeda e células com outros territórios.</CardDescription>
                </div>
                {myTerritory && (
                  <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="w-4 h-4 mr-2" />Propor Troca</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Handshake className="text-primary" />Nova Proposta de Troca</DialogTitle>
                        <DialogDescription>Selecione o que você oferece e o que deseja em troca.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label>Território Destinatário</Label>
                          <Select value={tradeTargetTerritory} onValueChange={setTradeTargetTerritory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um território" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {otherTerritories.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Offer Section */}
                          <div className="space-y-4 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                            <h4 className="font-semibold text-green-400 flex items-center gap-2">🎁 Sua Oferta</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Moeda (₮)</Label>
                                <Input type="number" min={0} value={offer.currency || ''} onChange={e => setOffer(o => ({ ...o, currency: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🌾 Food</Label>
                                <Input type="number" min={0} value={offer.food || ''} onChange={e => setOffer(o => ({ ...o, food: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">⚡ Energy</Label>
                                <Input type="number" min={0} value={offer.energy || ''} onChange={e => setOffer(o => ({ ...o, energy: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🪨 Minerals</Label>
                                <Input type="number" min={0} value={offer.minerals || ''} onChange={e => setOffer(o => ({ ...o, minerals: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🔬 Tech</Label>
                                <Input type="number" min={0} value={offer.tech || ''} onChange={e => setOffer(o => ({ ...o, tech: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                            </div>
                            {myCells.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs">Células ({offer.cells.length} selecionadas)</Label>
                                <ScrollArea className="h-24 rounded-md border p-2">
                                  <div className="space-y-1">
                                    {myCells.map(cell => (
                                      <div key={cell.id} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50">
                                        <Checkbox 
                                          id={`offer-${cell.id}`} 
                                          checked={offer.cells.includes(cell.id)}
                                          onCheckedChange={() => toggleOfferCell(cell.id)}
                                        />
                                        <label htmlFor={`offer-${cell.id}`} className="flex-1 cursor-pointer text-xs">
                                          <span className="font-mono">{cell.id.slice(0, 6)}...</span>
                                          <span className="ml-1">{cell.cell_type === 'urban' ? '🏙️' : '🌾'}</span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </div>

                          {/* Request Section */}
                          <div className="space-y-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                            <h4 className="font-semibold text-amber-400 flex items-center gap-2">📥 Seu Pedido</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Moeda (₮)</Label>
                                <Input type="number" min={0} value={request.currency || ''} onChange={e => setRequest(r => ({ ...r, currency: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🌾 Food</Label>
                                <Input type="number" min={0} value={request.food || ''} onChange={e => setRequest(r => ({ ...r, food: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">⚡ Energy</Label>
                                <Input type="number" min={0} value={request.energy || ''} onChange={e => setRequest(r => ({ ...r, energy: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🪨 Minerals</Label>
                                <Input type="number" min={0} value={request.minerals || ''} onChange={e => setRequest(r => ({ ...r, minerals: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">🔬 Tech</Label>
                                <Input type="number" min={0} value={request.tech || ''} onChange={e => setRequest(r => ({ ...r, tech: Number(e.target.value) || 0 }))} placeholder="0" />
                              </div>
                            </div>
                            {tradeTargetTerritory && tradeTargetCells.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs">Células ({request.cells.length} selecionadas)</Label>
                                <ScrollArea className="h-24 rounded-md border p-2">
                                  <div className="space-y-1">
                                    {tradeTargetCells.map(cell => (
                                      <div key={cell.id} className="flex items-center space-x-2 p-1 rounded hover:bg-muted/50">
                                        <Checkbox 
                                          id={`request-${cell.id}`} 
                                          checked={request.cells.includes(cell.id)}
                                          onCheckedChange={() => toggleRequestCell(cell.id)}
                                        />
                                        <label htmlFor={`request-${cell.id}`} className="flex-1 cursor-pointer text-xs">
                                          <span className="font-mono">{cell.id.slice(0, 6)}...</span>
                                          <span className="ml-1">{cell.cell_type === 'urban' ? '🏙️' : '🌾'}</span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setTradeDialogOpen(false); resetTradeForm(); }}>Cancelar</Button>
                        <Button onClick={handleProposeTrade} disabled={proposing || !tradeTargetTerritory}>
                          {proposing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Enviar Proposta
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Oferta</TableHead><TableHead>Pedido</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tradeDeals.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma proposta pendente</TableCell></TableRow> :
                      tradeDeals.map((deal) => {
                        const isRecipient = deal.to_user_id === user?.id;
                        const offerSummary = formatDealSummary(deal.offer as any);
                        const requestSummary = formatDealSummary(deal.request as any);
                        return (
                          <TableRow key={deal.id}>
                            <TableCell>{deal.from_territory?.name}</TableCell>
                            <TableCell>{deal.to_territory?.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{offerSummary}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{requestSummary}</TableCell>
                            <TableCell className="space-x-2">
                              {isRecipient && <>
                                <Button size="sm" onClick={() => handleAcceptDeal(deal.id)}>Aceitar</Button>
                                <Button size="sm" variant="outline" onClick={() => handleRejectDeal(deal.id)}>Rejeitar</Button>
                              </>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card className="glass-card">
              <CardHeader><CardTitle>Células à Venda</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Vendedor</TableHead><TableHead>Célula</TableHead><TableHead>Preço</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cellsForSale.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma célula à venda</TableCell></TableRow> :
                      cellsForSale.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.from_territory?.name}</TableCell>
                          <TableCell className="font-mono text-xs">{sale.cell_id?.slice(0, 8)}...</TableCell>
                          <TableCell className="text-primary font-bold">₮{Number(sale.price).toLocaleString('pt-BR')}</TableCell>
                          <TableCell><Badge variant="outline">À venda</Badge></TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
