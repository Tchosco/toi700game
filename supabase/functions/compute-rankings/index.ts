import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Admin-only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ success: false, error: 'Sessão inválida' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!role) return new Response(JSON.stringify({ success: false, error: 'Acesso negado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });

    const { data: lastTick } = await supabase.from('tick_logs').select('*').order('tick_number', { ascending: false }).limit(1).maybeSingle();
    const tickNumber = lastTick?.tick_number || 0;
    const perState = lastTick?.summary?.per_state || [];

    const { data: territories } = await supabase
      .from('territories')
      .select('id, stability, total_rural_population, total_urban_population, cells_owned_count');

    // Tech level proxy: territory_research.research_rate or tech count
    const { data: techs } = await supabase.from('territory_technologies').select('territory_id');
    const techCountByTerritory = new Map<string, number>();
    for (const t of techs || []) {
      techCountByTerritory.set(t.territory_id, (techCountByTerritory.get(t.territory_id) || 0) + 1);
    }

    // Build rankings
    for (const t of territories || []) {
      const pop = (t.total_rural_population || 0) + (t.total_urban_population || 0);
      const snap = perState.find((s: any) => s.territory_id === t.id) || { prod: { food: 0, energy: 0, minerals: 0, tech: 0 }, cons: { food: 0, energy: 0, tech: 0 } };
      const productionNet = (snap.prod.food + snap.prod.energy + snap.prod.minerals + snap.prod.tech) - (snap.cons.food + snap.cons.energy + snap.cons.tech);
      const tech = techCountByTerritory.get(t.id) || 0;
      const stability = t.stability || 50;
      const expansion = t.cells_owned_count || 0;
      const efficiency = pop > 0 ? productionNet / pop : 0;

      // Weighted score
      const score = 
        (pop / 1_000_000) * 0.25 +         // population scaled
        (productionNet / 1000) * 0.25 +    // economy
        (tech) * 0.2 +                      // tech count
        (stability / 100) * 0.15 +          // stability normalized
        (expansion / 100) * 0.1 +           // expansion
        (efficiency * 10) * 0.05;           // efficiency scaled

      await supabase.from('rankings').insert({
        territory_id: t.id,
        score_total: score,
        population: pop,
        economy: productionNet,
        technology: tech,
        stability,
        expansion,
        efficiency,
        tick_number: tickNumber
      });
    }

    return new Response(JSON.stringify({ success: true, tick_number: tickNumber }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: msg }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});