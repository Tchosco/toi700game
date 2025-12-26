import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, war_id, target_territory_id, target_cells, title, description } = await req.json();

    if (action === 'declare') {
      // Declare war
      if (!target_territory_id || !target_cells?.length) {
        return new Response(JSON.stringify({ error: 'Target territory and cells required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get attacker territory
      const { data: attackerTerritory } = await supabase
        .from('territories')
        .select('*')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!attackerTerritory) {
        return new Response(JSON.stringify({ error: 'You need an active territory to declare war' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get defender territory
      const { data: defenderTerritory } = await supabase
        .from('territories')
        .select('*')
        .eq('id', target_territory_id)
        .single();

      if (!defenderTerritory) {
        return new Response(JSON.stringify({ error: 'Target territory not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (defenderTerritory.is_neutral) {
        return new Response(JSON.stringify({ error: 'Cannot declare war on neutral territories' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify target cells belong to defender
      const { data: cells } = await supabase
        .from('cells')
        .select('id, owner_territory_id')
        .in('id', target_cells);

      for (const cell of cells || []) {
        if (cell.owner_territory_id !== target_territory_id) {
          return new Response(JSON.stringify({ error: 'Invalid target cells' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check no active war between these territories
      const { data: existingWar } = await supabase
        .from('wars')
        .select('id')
        .or(`attacker_id.eq.${attackerTerritory.id},defender_id.eq.${attackerTerritory.id}`)
        .in('status', ['declared', 'active'])
        .limit(1)
        .maybeSingle();

      if (existingWar) {
        return new Response(JSON.stringify({ error: 'You already have an active war' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // War declaration cost (stability penalty)
      const stabilityCost = 10;
      await supabase
        .from('territories')
        .update({ stability: Math.max(0, attackerTerritory.stability - stabilityCost) })
        .eq('id', attackerTerritory.id);

      // Create war
      const { data: war, error: warError } = await supabase
        .from('wars')
        .insert({
          attacker_id: attackerTerritory.id,
          defender_id: target_territory_id,
          target_cells,
          title: title || `Guerra por Território`,
          description: description || `${attackerTerritory.name} declarou guerra contra ${defenderTerritory.name}`,
          status: 'declared',
          max_cycles: 10,
        })
        .select()
        .single();

      if (warError) {
        console.error('[declare-war] Error:', warError);
        return new Response(JSON.stringify({ error: 'Failed to declare war' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Log event
      await supabase
        .from('event_logs')
        .insert({
          territory_id: attackerTerritory.id,
          event_type: 'war_declared',
          title: 'Guerra Declarada',
          description: `${attackerTerritory.name} declarou guerra contra ${defenderTerritory.name} por ${target_cells.length} célula(s).`,
          effects: { war_id: war.id, target_cells },
        });

      console.log(`[declare-war] War ${war.id} declared`);

      return new Response(JSON.stringify({ 
        success: true, 
        war_id: war.id,
        message: `Guerra declarada contra ${defenderTerritory.name}!` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'surrender') {
      if (!war_id) {
        return new Response(JSON.stringify({ error: 'War ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: war } = await supabase
        .from('wars')
        .select('*, attacker:territories!wars_attacker_id_fkey(*), defender:territories!wars_defender_id_fkey(*)')
        .eq('id', war_id)
        .single();

      if (!war) {
        return new Response(JSON.stringify({ error: 'War not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const attacker = war.attacker as any;
      const defender = war.defender as any;

      // Verify user is a participant
      const isAttacker = attacker.owner_id === user.id;
      const isDefender = defender.owner_id === user.id;

      if (!isAttacker && !isDefender) {
        return new Response(JSON.stringify({ error: 'Not a war participant' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Surrendering side loses all target cells
      const winnerId = isAttacker ? war.defender_id : war.attacker_id;
      const loserId = isAttacker ? war.attacker_id : war.defender_id;

      // Transfer cells to winner
      const targetCells = war.target_cells as string[] || [];
      for (const cellId of targetCells) {
        await supabase
          .from('cells')
          .update({ owner_territory_id: winnerId })
          .eq('id', cellId);

        await supabase
          .from('territory_transfers')
          .insert({
            cell_id: cellId,
            from_territory_id: loserId,
            to_territory_id: winnerId,
            war_id: war_id,
            transfer_type: 'war_surrender',
          });
      }

      // Heavy stability penalty for loser
      await supabase
        .from('territories')
        .update({ stability: Math.max(0, (isAttacker ? attacker : defender).stability - 25) })
        .eq('id', loserId);

      // End war
      await supabase
        .from('wars')
        .update({
          status: 'ended',
          winner_id: winnerId,
          ended_at: new Date().toISOString(),
        })
        .eq('id', war_id);

      console.log(`[declare-war] War ${war_id} ended by surrender`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Você se rendeu. Todas as células em disputa foram perdidas.',
        cells_lost: targetCells.length
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[declare-war] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
