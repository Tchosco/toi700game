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

    const { listing_id } = await req.json();

    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'Listing ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the listing
    const { data: listing, error: listingError } = await supabase
      .from('market_listings')
      .select('*')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ownership
    if (listing.seller_user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized to cancel this listing' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if cancellable
    if (listing.status === 'filled' || listing.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Cannot cancel this listing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const remainingQuantity = Number(listing.quantity) - Number(listing.filled_quantity);
    const isToken = listing.resource_type.startsWith('token_');

    console.log(`[cancel-market-order] Cancelling listing ${listing_id}, returning ${remainingQuantity} ${listing.resource_type}`);

    // Return locked resources/currency
    if (listing.listing_type === 'sell') {
      // Return tokens or resources to seller
      if (isToken) {
        const tokenType = listing.resource_type.replace('token_', '');
        const tokenField = `${tokenType}_tokens`;
        
        const { data: userTokens } = await supabase
          .from('user_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        await supabase
          .from('user_tokens')
          .update({ [tokenField]: Number(userTokens[tokenField]) + remainingQuantity })
          .eq('user_id', user.id);
      } else if (listing.seller_territory_id) {
        const { data: resourceBalance } = await supabase
          .from('resource_balances')
          .select('*')
          .eq('territory_id', listing.seller_territory_id)
          .single();

        await supabase
          .from('resource_balances')
          .update({ 
            [listing.resource_type]: Number(resourceBalance[listing.resource_type]) + remainingQuantity 
          })
          .eq('territory_id', listing.seller_territory_id);
      }
    } else {
      // Return currency to buyer
      const refundAmount = remainingQuantity * Number(listing.price_per_unit);
      
      const { data: wallet } = await supabase
        .from('player_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await supabase
          .from('player_wallets')
          .update({ balance: Number(wallet.balance) + refundAmount })
          .eq('user_id', user.id);
      }
    }

    // Update listing status
    await supabase
      .from('market_listings')
      .update({ status: 'cancelled' })
      .eq('id', listing_id);

    console.log(`[cancel-market-order] Listing cancelled successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Ordem cancelada com sucesso!',
      returned_quantity: remainingQuantity
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[cancel-market-order] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
