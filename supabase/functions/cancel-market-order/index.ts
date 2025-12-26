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

    // Return locked resources/currency using atomic functions
    if (listing.listing_type === 'sell') {
      // Return tokens or resources to seller
      if (isToken) {
        const tokenType = listing.resource_type.replace('token_', '');
        
        const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund_token', {
          p_user_id: user.id,
          p_token_type: tokenType,
          p_amount: Math.floor(remainingQuantity)
        });

        if (refundError || !refundResult?.success) {
          console.error('[cancel-market-order] Token refund error:', refundError || refundResult?.error);
          return new Response(JSON.stringify({ error: 'Failed to refund tokens' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else if (listing.seller_territory_id) {
        const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund_resource', {
          p_territory_id: listing.seller_territory_id,
          p_resource_type: listing.resource_type,
          p_amount: remainingQuantity
        });

        if (refundError || !refundResult?.success) {
          console.error('[cancel-market-order] Resource refund error:', refundError || refundResult?.error);
          return new Response(JSON.stringify({ error: 'Failed to refund resources' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } else {
      // Return currency to buyer
      const refundAmount = remainingQuantity * Number(listing.price_per_unit);
      
      const { data: refundResult, error: refundError } = await supabase.rpc('atomic_refund_currency', {
        p_user_id: user.id,
        p_amount: refundAmount
      });

      if (refundError || !refundResult?.success) {
        console.error('[cancel-market-order] Currency refund error:', refundError || refundResult?.error);
        return new Response(JSON.stringify({ error: 'Failed to refund currency' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Update listing status
    await supabase
      .from('market_listings')
      .update({ status: 'cancelled' })
      .eq('id', listing_id);

    console.log(`[cancel-market-order] Listing cancelled successfully with atomic refund`);

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
