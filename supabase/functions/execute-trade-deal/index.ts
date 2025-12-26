import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeSide {
  currency?: number;
  cells?: string[];
  tokens?: { city?: number; land?: number; state?: number };
  resources?: { food?: number; energy?: number; minerals?: number; tech?: number };
}

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

    const { action, deal_id, to_territory_id, offer, request } = await req.json();

    if (action === 'create') {
      // Create a new trade deal
      if (!to_territory_id || !offer || !request) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get sender's territory
      const { data: fromTerritory } = await supabase
        .from('territories')
        .select('id, owner_id, name')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (!fromTerritory) {
        return new Response(JSON.stringify({ error: 'You need an active territory to trade' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get target territory
      const { data: toTerritory } = await supabase
        .from('territories')
        .select('id, owner_id, name')
        .eq('id', to_territory_id)
        .single();

      if (!toTerritory || !toTerritory.owner_id) {
        return new Response(JSON.stringify({ error: 'Target territory not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate offered cells belong to user
      const offerData = offer as TradeSide;
      if (offerData.cells?.length) {
        const { data: cells } = await supabase
          .from('cells')
          .select('id, owner_territory_id')
          .in('id', offerData.cells);

        for (const cell of cells || []) {
          if (cell.owner_territory_id !== fromTerritory.id) {
            return new Response(JSON.stringify({ error: 'You can only offer cells you own' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      const { data: deal, error: dealError } = await supabase
        .from('trade_deals')
        .insert({
          from_user_id: user.id,
          from_territory_id: fromTerritory.id,
          to_user_id: toTerritory.owner_id,
          to_territory_id,
          offer,
          request,
          status: 'proposed',
        })
        .select()
        .single();

      if (dealError) {
        console.error('[execute-trade-deal] Create error:', dealError);
        return new Response(JSON.stringify({ error: 'Failed to create trade deal' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[execute-trade-deal] Trade deal ${deal.id} created`);

      return new Response(JSON.stringify({ 
        success: true, 
        deal_id: deal.id,
        message: 'Proposta de troca enviada!' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'accept') {
      // Accept and execute trade deal
      if (!deal_id) {
        return new Response(JSON.stringify({ error: 'Deal ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: deal, error: dealError } = await supabase
        .from('trade_deals')
        .select('*')
        .eq('id', deal_id)
        .single();

      if (dealError || !deal) {
        return new Response(JSON.stringify({ error: 'Trade deal not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (deal.to_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Only the recipient can accept' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (deal.status !== 'proposed') {
        return new Response(JSON.stringify({ error: 'Deal is no longer pending' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const offerData = deal.offer as TradeSide;
      const requestData = deal.request as TradeSide;

      // Execute atomic trade
      console.log('[execute-trade-deal] Executing trade...');

      // Transfer currency
      if (offerData.currency) {
        await transferCurrency(supabase, deal.from_user_id, deal.to_user_id, offerData.currency);
      }
      if (requestData.currency) {
        await transferCurrency(supabase, deal.to_user_id, deal.from_user_id, requestData.currency);
      }

      // Transfer tokens
      if (offerData.tokens) {
        await transferTokens(supabase, deal.from_user_id, deal.to_user_id, offerData.tokens);
      }
      if (requestData.tokens) {
        await transferTokens(supabase, deal.to_user_id, deal.from_user_id, requestData.tokens);
      }

      // Transfer resources
      if (offerData.resources) {
        await transferResources(supabase, deal.from_territory_id, deal.to_territory_id, offerData.resources);
      }
      if (requestData.resources) {
        await transferResources(supabase, deal.to_territory_id, deal.from_territory_id, requestData.resources);
      }

      // Transfer cells
      if (offerData.cells?.length) {
        for (const cellId of offerData.cells) {
          await supabase
            .from('cells')
            .update({ owner_territory_id: deal.to_territory_id })
            .eq('id', cellId);

          await supabase
            .from('territory_transfers')
            .insert({
              cell_id: cellId,
              from_territory_id: deal.from_territory_id,
              to_territory_id: deal.to_territory_id,
              transfer_type: 'trade',
              notes: `Trade Deal: ${deal_id}`,
            });
        }
      }
      if (requestData.cells?.length) {
        for (const cellId of requestData.cells) {
          await supabase
            .from('cells')
            .update({ owner_territory_id: deal.from_territory_id })
            .eq('id', cellId);

          await supabase
            .from('territory_transfers')
            .insert({
              cell_id: cellId,
              from_territory_id: deal.to_territory_id,
              to_territory_id: deal.from_territory_id,
              transfer_type: 'trade',
              notes: `Trade Deal: ${deal_id}`,
            });
        }
      }

      // Update deal status
      await supabase
        .from('trade_deals')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', deal_id);

      console.log(`[execute-trade-deal] Trade deal ${deal_id} completed`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Troca realizada com sucesso!' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'reject' || action === 'cancel') {
      if (!deal_id) {
        return new Response(JSON.stringify({ error: 'Deal ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: deal } = await supabase
        .from('trade_deals')
        .select('*')
        .eq('id', deal_id)
        .single();

      if (!deal) {
        return new Response(JSON.stringify({ error: 'Deal not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (deal.from_user_id !== user.id && deal.to_user_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newStatus = action === 'reject' ? 'rejected' : 'cancelled';
      await supabase
        .from('trade_deals')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', deal_id);

      return new Response(JSON.stringify({ 
        success: true, 
        message: action === 'reject' ? 'Proposta rejeitada' : 'Proposta cancelada' 
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
    console.error('[execute-trade-deal] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function transferCurrency(supabase: any, fromUserId: string, toUserId: string, amount: number) {
  const { data: fromWallet } = await supabase.from('player_wallets').select('balance').eq('user_id', fromUserId).single();
  const { data: toWallet } = await supabase.from('player_wallets').select('balance').eq('user_id', toUserId).single();

  if (fromWallet && toWallet) {
    await supabase.from('player_wallets').update({ balance: Number(fromWallet.balance) - amount }).eq('user_id', fromUserId);
    await supabase.from('player_wallets').update({ balance: Number(toWallet.balance) + amount }).eq('user_id', toUserId);
  }
}

async function transferTokens(supabase: any, fromUserId: string, toUserId: string, tokens: { city?: number; land?: number; state?: number }) {
  const { data: fromTokens } = await supabase.from('user_tokens').select('*').eq('user_id', fromUserId).single();
  const { data: toTokens } = await supabase.from('user_tokens').select('*').eq('user_id', toUserId).single();

  if (fromTokens && toTokens) {
    if (tokens.city) {
      await supabase.from('user_tokens').update({ city_tokens: fromTokens.city_tokens - tokens.city }).eq('user_id', fromUserId);
      await supabase.from('user_tokens').update({ city_tokens: toTokens.city_tokens + tokens.city }).eq('user_id', toUserId);
    }
    if (tokens.land) {
      await supabase.from('user_tokens').update({ land_tokens: fromTokens.land_tokens - tokens.land }).eq('user_id', fromUserId);
      await supabase.from('user_tokens').update({ land_tokens: toTokens.land_tokens + tokens.land }).eq('user_id', toUserId);
    }
    if (tokens.state) {
      await supabase.from('user_tokens').update({ state_tokens: fromTokens.state_tokens - tokens.state }).eq('user_id', fromUserId);
      await supabase.from('user_tokens').update({ state_tokens: toTokens.state_tokens + tokens.state }).eq('user_id', toUserId);
    }
  }
}

async function transferResources(supabase: any, fromTerritoryId: string, toTerritoryId: string, resources: { food?: number; energy?: number; minerals?: number; tech?: number }) {
  const { data: fromRes } = await supabase.from('resource_balances').select('*').eq('territory_id', fromTerritoryId).single();
  const { data: toRes } = await supabase.from('resource_balances').select('*').eq('territory_id', toTerritoryId).single();

  if (fromRes && toRes) {
    const updates: any = {};
    const toUpdates: any = {};

    if (resources.food) {
      updates.food = Math.max(0, fromRes.food - resources.food);
      toUpdates.food = toRes.food + resources.food;
    }
    if (resources.energy) {
      updates.energy = Math.max(0, fromRes.energy - resources.energy);
      toUpdates.energy = toRes.energy + resources.energy;
    }
    if (resources.minerals) {
      updates.minerals = Math.max(0, fromRes.minerals - resources.minerals);
      toUpdates.minerals = toRes.minerals + resources.minerals;
    }
    if (resources.tech) {
      updates.tech = Math.max(0, fromRes.tech - resources.tech);
      toUpdates.tech = toRes.tech + resources.tech;
    }

    if (Object.keys(updates).length) {
      await supabase.from('resource_balances').update(updates).eq('territory_id', fromTerritoryId);
      await supabase.from('resource_balances').update(toUpdates).eq('territory_id', toTerritoryId);
    }
  }
}
