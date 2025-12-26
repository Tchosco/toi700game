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

    const { action, cell_id, price, territory_id } = await req.json();

    if (action === 'list') {
      // List a cell for sale
      if (!cell_id || !price || price <= 0) {
        return new Response(JSON.stringify({ error: 'Cell ID and valid price required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify cell ownership
      const { data: cell, error: cellError } = await supabase
        .from('cells')
        .select('*, territories(owner_id)')
        .eq('id', cell_id)
        .single();

      if (cellError || !cell) {
        return new Response(JSON.stringify({ error: 'Cell not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (cell.status !== 'colonized' || !cell.owner_territory_id) {
        return new Response(JSON.stringify({ error: 'Cell must be colonized to sell' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const territory = cell.territories as any;
      if (territory?.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: 'You do not own this cell' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Cannot sell cells with cities
      if (cell.has_city) {
        return new Response(JSON.stringify({ error: 'Cannot sell cells with cities. Destroy the city first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create market listing for cell sale
      const { data: listing, error: listingError } = await supabase
        .from('market_listings')
        .insert({
          seller_user_id: user.id,
          seller_territory_id: cell.owner_territory_id,
          listing_type: 'sell',
          resource_type: 'token_land', // Use token_land as proxy for cell
          quantity: 1,
          price_per_unit: price,
          status: 'open',
        })
        .select()
        .single();

      if (listingError) {
        console.error('[sell-cell] Listing error:', listingError);
        return new Response(JSON.stringify({ error: 'Failed to create listing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Store cell info in territory_transfers as pending
      await supabase
        .from('territory_transfers')
        .insert({
          cell_id,
          from_territory_id: cell.owner_territory_id,
          transfer_type: 'sale_pending',
          price,
          notes: `Listing ID: ${listing.id}`,
        });

      console.log(`[sell-cell] Cell ${cell_id} listed for sale at ${price}`);

      return new Response(JSON.stringify({ 
        success: true, 
        listing_id: listing.id,
        message: `Célula listada para venda por ₮${price.toLocaleString('pt-BR')}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'buy') {
      // Buy a listed cell using atomic function to prevent race conditions
      if (!cell_id || !territory_id) {
        return new Response(JSON.stringify({ error: 'Cell ID and target territory required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find the pending transfer/listing
      const { data: transfer } = await supabase
        .from('territory_transfers')
        .select('*')
        .eq('cell_id', cell_id)
        .eq('transfer_type', 'sale_pending')
        .maybeSingle();

      if (!transfer) {
        return new Response(JSON.stringify({ error: 'This cell is not for sale' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify buyer owns target territory
      const { data: buyerTerritory } = await supabase
        .from('territories')
        .select('id, owner_id, name')
        .eq('id', territory_id)
        .eq('owner_id', user.id)
        .single();

      if (!buyerTerritory) {
        return new Response(JSON.stringify({ error: 'Invalid target territory' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use atomic purchase function to prevent race conditions
      const { data: purchaseResult, error: purchaseError } = await supabase.rpc('atomic_purchase_cell', {
        p_buyer_user_id: user.id,
        p_buyer_territory_id: territory_id,
        p_cell_id: cell_id,
        p_transfer_id: transfer.id,
        p_price: Number(transfer.price)
      });

      if (purchaseError) {
        console.error('[sell-cell] Atomic purchase error:', purchaseError);
        return new Response(JSON.stringify({ error: 'Purchase failed: ' + purchaseError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!purchaseResult?.success) {
        return new Response(JSON.stringify({ error: purchaseResult?.error || 'Purchase failed' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Close market listing if exists
      const listingMatch = transfer.notes?.match(/Listing ID: (.+)/);
      if (listingMatch) {
        await supabase
          .from('market_listings')
          .update({ status: 'filled', filled_quantity: 1 })
          .eq('id', listingMatch[1]);
      }

      console.log(`[sell-cell] Cell ${cell_id} sold to territory ${territory_id} atomically`);

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Célula adquirida por ₮${Number(transfer.price).toLocaleString('pt-BR')}!` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'cancel') {
      // Cancel a cell listing
      if (!cell_id) {
        return new Response(JSON.stringify({ error: 'Cell ID required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: transfer } = await supabase
        .from('territory_transfers')
        .select('*, cells(owner_territory_id, territories(owner_id))')
        .eq('cell_id', cell_id)
        .eq('transfer_type', 'sale_pending')
        .maybeSingle();

      if (!transfer) {
        return new Response(JSON.stringify({ error: 'No pending sale found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cellData = transfer.cells as any;
      if (cellData?.territories?.owner_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete the transfer record
      await supabase
        .from('territory_transfers')
        .delete()
        .eq('id', transfer.id);

      // Cancel market listing
      const listingMatch = transfer.notes?.match(/Listing ID: (.+)/);
      if (listingMatch) {
        await supabase
          .from('market_listings')
          .update({ status: 'cancelled' })
          .eq('id', listingMatch[1]);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Venda cancelada' 
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
    console.error('[sell-cell] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
