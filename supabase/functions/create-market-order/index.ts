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

    // Try to match orders
    const matchResult = await matchOrders(supabase, newListing);

    return new Response(JSON.stringify({ 
      success: true, 
      listing: newListing,
      trades_executed: matchResult.tradesExecuted,
      message: matchResult.tradesExecuted > 0 
        ? `Ordem criada e ${matchResult.tradesExecuted} trade(s) executado(s)!`
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

async function matchOrders(supabase: any, newListing: any) {
  const { listing_type, resource_type, price_per_unit, quantity, id: listingId, seller_user_id, seller_territory_id } = newListing;
  
  let tradesExecuted = 0;
  let remainingQuantity = quantity - (newListing.filled_quantity || 0);

  // Find matching orders
  // If we're selling, look for buy orders at >= our price
  // If we're buying, look for sell orders at <= our price
  const oppositeType = listing_type === 'sell' ? 'buy' : 'sell';
  const priceCondition = listing_type === 'sell' ? 'gte' : 'lte';

  let query = supabase
    .from('market_listings')
    .select('*')
    .eq('resource_type', resource_type)
    .eq('listing_type', oppositeType)
    .in('status', ['open', 'partially_filled'])
    .neq('seller_user_id', seller_user_id); // Can't trade with yourself

  if (priceCondition === 'gte') {
    query = query.gte('price_per_unit', price_per_unit);
  } else {
    query = query.lte('price_per_unit', price_per_unit);
  }

  // Order by best price first
  query = query.order('price_per_unit', { ascending: listing_type === 'buy' });

  const { data: matchingOrders, error } = await query;

  if (error || !matchingOrders?.length) {
    console.log('[matchOrders] No matching orders found');
    return { tradesExecuted: 0 };
  }

  console.log(`[matchOrders] Found ${matchingOrders.length} matching orders`);

  for (const matchOrder of matchingOrders) {
    if (remainingQuantity <= 0) break;

    const matchRemaining = Number(matchOrder.quantity) - Number(matchOrder.filled_quantity);
    const tradeQuantity = Math.min(remainingQuantity, matchRemaining);
    const tradePrice = matchOrder.price_per_unit; // Use the older order's price

    if (tradeQuantity <= 0) continue;

    // Determine buyer and seller
    const isSelling = listing_type === 'sell';
    const buyerUserId = isSelling ? matchOrder.seller_user_id : seller_user_id;
    const buyerTerritoryId = isSelling ? matchOrder.seller_territory_id : seller_territory_id;
    const sellerUserId = isSelling ? seller_user_id : matchOrder.seller_user_id;
    const sellerTerritoryId = isSelling ? seller_territory_id : matchOrder.seller_territory_id;

    const totalPrice = tradeQuantity * tradePrice;

    console.log(`[matchOrders] Executing trade: ${tradeQuantity} ${resource_type} at ${tradePrice} each`);

    try {
      // Transfer currency to seller (seller already locked their goods)
      // The buyer already locked their currency when creating the buy order
      // So we just transfer from the locked amount
      const { data: sellerWallet } = await supabase
        .from('player_wallets')
        .select('balance')
        .eq('user_id', sellerUserId)
        .single();

      await supabase
        .from('player_wallets')
        .update({ 
          balance: Number(sellerWallet.balance) + totalPrice,
          total_earned: (sellerWallet.total_earned || 0) + totalPrice
        })
        .eq('user_id', sellerUserId);

      // Transfer resource/token to buyer
      const isToken = resource_type.startsWith('token_');
      
      if (isToken) {
        const tokenType = resource_type.replace('token_', '');
        const tokenField = `${tokenType}_tokens`;
        
        const { data: buyerTokens } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('user_id', buyerUserId)
          .single();

        await supabase
          .from('user_tokens')
          .update({ [tokenField]: Number(buyerTokens[tokenField]) + tradeQuantity })
          .eq('user_id', buyerUserId);
      } else if (buyerTerritoryId) {
        const { data: buyerResources } = await supabase
          .from('resource_balances')
          .select('*')
          .eq('territory_id', buyerTerritoryId)
          .maybeSingle();

        if (buyerResources) {
          await supabase
            .from('resource_balances')
            .update({ [resource_type]: Number(buyerResources[resource_type]) + tradeQuantity })
            .eq('territory_id', buyerTerritoryId);
        }
      }

      // Update both listings
      const newFilledQuantity = Number(newListing.filled_quantity || 0) + tradeQuantity;
      const newStatus = newFilledQuantity >= quantity ? 'filled' : 'partially_filled';
      
      await supabase
        .from('market_listings')
        .update({ 
          filled_quantity: newFilledQuantity,
          status: newStatus
        })
        .eq('id', listingId);

      const matchFilledQuantity = Number(matchOrder.filled_quantity) + tradeQuantity;
      const matchStatus = matchFilledQuantity >= matchOrder.quantity ? 'filled' : 'partially_filled';
      
      await supabase
        .from('market_listings')
        .update({
          filled_quantity: matchFilledQuantity,
          status: matchStatus
        })
        .eq('id', matchOrder.id);

      // Record trade history
      await supabase
        .from('trade_history')
        .insert({
          listing_id: listingId,
          buyer_user_id: buyerUserId,
          buyer_territory_id: buyerTerritoryId,
          seller_user_id: sellerUserId,
          seller_territory_id: sellerTerritoryId,
          resource_type,
          quantity: tradeQuantity,
          price_per_unit: tradePrice,
          total_price: totalPrice,
        });

      remainingQuantity -= tradeQuantity;
      tradesExecuted++;

      // Refund excess currency if buy order price was higher than matched sell price
      if (!isSelling && tradePrice < price_per_unit) {
        const refund = (price_per_unit - tradePrice) * tradeQuantity;
        const { data: buyerWallet } = await supabase
          .from('player_wallets')
          .select('balance')
          .eq('user_id', buyerUserId)
          .single();

        await supabase
          .from('player_wallets')
          .update({ balance: Number(buyerWallet.balance) + refund })
          .eq('user_id', buyerUserId);
      }

      console.log(`[matchOrders] Trade executed successfully`);
    } catch (tradeError) {
      console.error('[matchOrders] Trade execution error:', tradeError);
    }
  }

  return { tradesExecuted };
}
