import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  listing_type: 'sell' | 'buy';
  resource_type: 'food' | 'energy' | 'minerals' | 'tech' | 'token_city' | 'token_land' | 'token_state';
  quantity: number;
  price_per_unit: number;
  territory_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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

    const body: OrderRequest = await req.json();
    const { listing_type, resource_type, quantity, price_per_unit, territory_id } = body;

    console.log(`[create-market-order] User ${user.id} creating ${listing_type} order for ${quantity} ${resource_type} at ${price_per_unit}`);

    // Validate input
    if (!listing_type || !resource_type || quantity <= 0 || price_per_unit <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid order parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get world config for max listings limit
    const { data: worldConfig } = await supabase
      .from('world_config')
      .select('max_listings_per_territory')
      .limit(1)
      .maybeSingle();

    const maxListings = worldConfig?.max_listings_per_territory || 20;

    // Check anti-spam: count user's open listings
    const { count: openListingsCount } = await supabase
      .from('market_listings')
      .select('*', { count: 'exact', head: true })
      .eq('seller_user_id', user.id)
      .in('status', ['open', 'partially_filled']);

    if ((openListingsCount || 0) >= maxListings) {
      return new Response(JSON.stringify({ 
        error: `Limite de ${maxListings} ordens ativas atingido. Cancele ordens existentes primeiro.` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user has resources/tokens/currency for the order
    const isToken = resource_type.startsWith('token_');
    
    if (listing_type === 'sell') {
      // Selling: check if user has the resource/token
      if (isToken) {
        const tokenType = resource_type.replace('token_', '');
        const { data: userTokens } = await supabase
          .from('user_tokens')
          .select('city_tokens, land_tokens, state_tokens')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userTokens) {
          return new Response(JSON.stringify({ error: 'Token balance not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const tokenField = `${tokenType}_tokens` as keyof typeof userTokens;
        const available = Number(userTokens[tokenField]) || 0;
        
        if (available < quantity) {
          return new Response(JSON.stringify({ error: `Tokens insuficientes. Você tem ${available}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Lock the tokens by deducting from balance
        await supabase
          .from('user_tokens')
          .update({ [tokenField]: available - quantity })
          .eq('user_id', user.id);
      } else {
        // Selling resource: check territory resource balance
        if (!territory_id) {
          return new Response(JSON.stringify({ error: 'Territory ID required for resource sales' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: resourceBalance } = await supabase
          .from('resource_balances')
          .select('*')
          .eq('territory_id', territory_id)
          .maybeSingle();

        if (!resourceBalance) {
          return new Response(JSON.stringify({ error: 'Resource balance not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const resourceField = resource_type as keyof typeof resourceBalance;
        const available = Number(resourceBalance[resourceField]) || 0;

        if (available < quantity) {
          return new Response(JSON.stringify({ error: `Recurso insuficiente. Você tem ${available}` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Lock the resources by deducting from balance
        await supabase
          .from('resource_balances')
          .update({ [resourceField]: available - quantity })
          .eq('territory_id', territory_id);
      }
    } else {
      // Buying: check if user has enough currency
      const totalCost = quantity * price_per_unit;
      const { data: wallet } = await supabase
        .from('player_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!wallet || Number(wallet.balance) < totalCost) {
        return new Response(JSON.stringify({ 
          error: `Saldo insuficiente. Necessário: ₮${totalCost.toLocaleString('pt-BR')}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Lock the currency by deducting from balance
      await supabase
        .from('player_wallets')
        .update({ balance: Number(wallet.balance) - totalCost })
        .eq('user_id', user.id);
    }

    // Create the listing
    const { data: newListing, error: listingError } = await supabase
      .from('market_listings')
      .insert({
        seller_user_id: user.id,
        seller_territory_id: territory_id || null,
        listing_type,
        resource_type,
        quantity,
        price_per_unit,
        status: 'open',
        filled_quantity: 0,
      })
      .select()
      .single();

    if (listingError) {
      console.error('[create-market-order] Error creating listing:', listingError);
      return new Response(JSON.stringify({ error: 'Failed to create listing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[create-market-order] Created listing ${newListing.id}`);

    // Use atomic matching function to prevent race conditions
    // This function uses row-level locking (FOR UPDATE SKIP LOCKED) for thread safety
    const { data: matchResult, error: matchError } = await supabase.rpc('match_market_order', {
      p_listing_id: newListing.id,
      p_seller_user_id: user.id,
      p_seller_territory_id: territory_id || null,
      p_listing_type: listing_type,
      p_resource_type: resource_type,
      p_price_per_unit: price_per_unit,
      p_quantity: quantity,
      p_filled_quantity: 0,
    });

    if (matchError) {
      console.error('[create-market-order] Matching error:', matchError);
      // Listing was created, but matching failed - return success with warning
      return new Response(JSON.stringify({ 
        success: true, 
        listing: newListing,
        trades_executed: 0,
        message: 'Ordem criada, mas a correspondência automática falhou. Sua ordem está ativa.',
        warning: matchError.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tradesExecuted = matchResult?.[0]?.trades_executed || 0;

    console.log(`[create-market-order] Matching complete: ${tradesExecuted} trades executed`);

    return new Response(JSON.stringify({ 
      success: true, 
      listing: newListing,
      trades_executed: tradesExecuted,
      message: tradesExecuted > 0 
        ? `Ordem criada e ${tradesExecuted} trade(s) executado(s)!`
        : 'Ordem criada com sucesso!'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[create-market-order] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
