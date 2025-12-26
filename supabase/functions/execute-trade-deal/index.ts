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
      // Accept and execute trade deal with atomic operations
      if (!deal_id) {
        return new Response(JSON.stringify({ error: 'Deal ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Lock deal status to prevent concurrent acceptance
      // First update status to 'processing' only if still 'proposed'
      const { data: lockedDeal, error: lockError } = await supabase
        .from('trade_deals')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', deal_id)
        .eq('status', 'proposed')
        .select()
        .single();

      if (lockError || !lockedDeal) {
        return new Response(JSON.stringify({ error: 'Trade deal not available or already being processed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (lockedDeal.to_user_id !== user.id) {
        // Revert status
        await supabase
          .from('trade_deals')
          .update({ status: 'proposed' })
          .eq('id', deal_id);
        
        return new Response(JSON.stringify({ error: 'Only the recipient can accept' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const offerData = lockedDeal.offer as TradeSide;
      const requestData = lockedDeal.request as TradeSide;

      console.log('[execute-trade-deal] Executing atomic trade...');

      try {
        // Transfer currency using atomic function
        if (offerData.currency && offerData.currency > 0) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_currency', {
            p_from_user_id: lockedDeal.from_user_id,
            p_to_user_id: lockedDeal.to_user_id,
            p_amount: offerData.currency
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Currency transfer failed (offer)');
          }
        }
        
        if (requestData.currency && requestData.currency > 0) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_currency', {
            p_from_user_id: lockedDeal.to_user_id,
            p_to_user_id: lockedDeal.from_user_id,
            p_amount: requestData.currency
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Currency transfer failed (request)');
          }
        }

        // Transfer tokens using atomic function
        if (offerData.tokens) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_tokens', {
            p_from_user_id: lockedDeal.from_user_id,
            p_to_user_id: lockedDeal.to_user_id,
            p_city_tokens: offerData.tokens.city || 0,
            p_land_tokens: offerData.tokens.land || 0,
            p_state_tokens: offerData.tokens.state || 0
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Token transfer failed (offer)');
          }
        }
        
        if (requestData.tokens) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_tokens', {
            p_from_user_id: lockedDeal.to_user_id,
            p_to_user_id: lockedDeal.from_user_id,
            p_city_tokens: requestData.tokens.city || 0,
            p_land_tokens: requestData.tokens.land || 0,
            p_state_tokens: requestData.tokens.state || 0
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Token transfer failed (request)');
          }
        }

        // Transfer resources using atomic function
        if (offerData.resources) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_resources', {
            p_from_territory_id: lockedDeal.from_territory_id,
            p_to_territory_id: lockedDeal.to_territory_id,
            p_food: offerData.resources.food || 0,
            p_energy: offerData.resources.energy || 0,
            p_minerals: offerData.resources.minerals || 0,
            p_tech: offerData.resources.tech || 0
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Resource transfer failed (offer)');
          }
        }
        
        if (requestData.resources) {
          const { data: result, error } = await supabase.rpc('atomic_transfer_resources', {
            p_from_territory_id: lockedDeal.to_territory_id,
            p_to_territory_id: lockedDeal.from_territory_id,
            p_food: requestData.resources.food || 0,
            p_energy: requestData.resources.energy || 0,
            p_minerals: requestData.resources.minerals || 0,
            p_tech: requestData.resources.tech || 0
          });
          
          if (error || !result?.success) {
            throw new Error(result?.error || error?.message || 'Resource transfer failed (request)');
          }
        }

        // Transfer cells (these are ownership changes, less prone to race conditions)
        if (offerData.cells?.length) {
          for (const cellId of offerData.cells) {
            await supabase
              .from('cells')
              .update({ owner_territory_id: lockedDeal.to_territory_id })
              .eq('id', cellId);

            await supabase
              .from('territory_transfers')
              .insert({
                cell_id: cellId,
                from_territory_id: lockedDeal.from_territory_id,
                to_territory_id: lockedDeal.to_territory_id,
                transfer_type: 'trade',
                notes: `Trade Deal: ${deal_id}`,
              });
          }
        }
        
        if (requestData.cells?.length) {
          for (const cellId of requestData.cells) {
            await supabase
              .from('cells')
              .update({ owner_territory_id: lockedDeal.from_territory_id })
              .eq('id', cellId);

            await supabase
              .from('territory_transfers')
              .insert({
                cell_id: cellId,
                from_territory_id: lockedDeal.to_territory_id,
                to_territory_id: lockedDeal.from_territory_id,
                transfer_type: 'trade',
                notes: `Trade Deal: ${deal_id}`,
              });
          }
        }

        // Mark deal as completed
        await supabase
          .from('trade_deals')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', deal_id);

        console.log(`[execute-trade-deal] Trade deal ${deal_id} completed successfully`);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Troca realizada com sucesso!' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (tradeError: any) {
        // Revert to proposed status on failure
        await supabase
          .from('trade_deals')
          .update({ status: 'proposed' })
          .eq('id', deal_id);
        
        console.error('[execute-trade-deal] Trade execution failed:', tradeError);
        
        return new Response(JSON.stringify({ 
          error: tradeError.message || 'Trade execution failed' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
