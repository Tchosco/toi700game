import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColonizeRequest {
  cell_id: string;
  territory_id: string;
  use_token: boolean; // true = use token_land, false = use currency
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const body: ColonizeRequest = await req.json();
    const { cell_id, territory_id, use_token } = body;

    console.log(`[colonize-cell] User ${user.id} attempting to colonize cell ${cell_id} for territory ${territory_id}`);

    // Validate input
    if (!cell_id || !territory_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'cell_id e territory_id são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Check if territory belongs to user
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territory_id)
      .eq('owner_id', user.id)
      .single();

    if (territoryError || !territory) {
      return new Response(
        JSON.stringify({ success: false, error: 'Território não encontrado ou não pertence a você' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 2. Check if cell is available for colonization
    const { data: cell, error: cellError } = await supabase
      .from('cells')
      .select('*, regions(*)')
      .eq('id', cell_id)
      .single();

    if (cellError || !cell) {
      return new Response(
        JSON.stringify({ success: false, error: 'Célula não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (cell.status !== 'explored') {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula não está disponível para colonização (status: ' + cell.status + ')' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (cell.owner_territory_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta célula já pertence a outro território' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Calculate colonization cost
    const baseCost = cell.colonization_cost || 100;
    const tokenLandPrice = 500; // Price in currency for 1 token_land equivalent

    // 4. Use atomic functions for payment to prevent race conditions
    if (use_token) {
      // Use atomic token deduction
      const { data: deductResult, error: deductError } = await supabase.rpc('atomic_deduct_token', {
        p_user_id: user.id,
        p_token_type: 'land',
        p_amount: 1
      });

      if (deductError) {
        console.error('[colonize-cell] Token deduction error:', deductError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao deduzir token: ' + deductError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      if (!deductResult?.success) {
        return new Response(
          JSON.stringify({ success: false, error: deductResult?.error || 'Você não possui tokens de terra suficientes' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Log token transaction
      await supabase.from('token_transactions').insert({
        user_id: user.id,
        token_type: 'land',
        amount: -1,
        reason: `Colonização de célula na região ${(cell.regions as { name: string })?.name || 'desconhecida'}`,
      });

    } else {
      // Use currency - need base cost + token equivalent
      const totalCost = baseCost + tokenLandPrice;

      // Use atomic currency deduction from profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (profileError || !profile || profile.currency < totalCost) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Moeda insuficiente. Custo: ${totalCost} (base: ${baseCost} + token: ${tokenLandPrice})` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Deduct currency atomically using UPDATE with condition
      const { data: updatedProfile, error: deductError } = await supabase
        .from('profiles')
        .update({ 
          currency: profile.currency - totalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .gte('currency', totalCost) // Only update if still has enough
        .select()
        .single();

      if (deductError || !updatedProfile) {
        console.error('[colonize-cell] Currency deduction failed:', deductError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao deduzir moeda - saldo pode ter sido alterado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Log currency transaction
      await supabase.from('currency_transactions').insert({
        user_id: user.id,
        amount: -totalCost,
        transaction_type: 'expense',
        category: 'colonization',
        description: `Colonização de célula na região ${(cell.regions as { name: string })?.name || 'desconhecida'}`,
        related_territory_id: territory_id,
      });
    }

    // 5. Colonize the cell
    const { error: colonizeError } = await supabase
      .from('cells')
      .update({
        status: 'colonized',
        owner_territory_id: territory_id,
        colonized_by: user.id,
        colonized_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', cell_id)
      .eq('status', 'explored') // Only if still explored (prevent race)
      .is('owner_territory_id', null); // Only if still unowned

    if (colonizeError) {
      console.error('[colonize-cell] Error colonizing cell:', colonizeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao colonizar célula - pode já ter sido colonizada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 6. Log the event
    await supabase.from('event_logs').insert({
      territory_id: territory_id,
      event_type: 'colonization',
      title: 'Nova Célula Colonizada',
      description: `${territory.name} colonizou uma célula na região ${(cell.regions as { name: string })?.name || 'desconhecida'}.`,
      effects: { cell_id, area_km2: cell.area_km2, is_urban_eligible: cell.is_urban_eligible },
    });

    console.log(`[colonize-cell] Cell ${cell_id} successfully colonized by territory ${territory_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Célula colonizada com sucesso!',
        cell: {
          id: cell_id,
          is_urban_eligible: cell.is_urban_eligible,
          area_km2: cell.area_km2,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[colonize-cell] Colonization error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
