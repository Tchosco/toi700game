import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoteInput {
  vote_id: string;
  territory_id: string;
  choice: 'yes' | 'no' | 'abstain';
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const input: VoteInput = await req.json();
    console.log("Casting vote:", input);

    // Validate required fields
    if (!input.vote_id || !input.territory_id || !input.choice) {
      throw new Error("vote_id, territory_id e choice são obrigatórios");
    }

    // Check territory ownership
    const { data: territory } = await supabase
      .from('territories')
      .select('id, owner_id, name, status')
      .eq('id', input.territory_id)
      .single();

    if (!territory) {
      throw new Error("Território não encontrado");
    }

    if (territory.owner_id !== user.id) {
      throw new Error("Você não possui este território");
    }

    if (territory.status !== 'active') {
      throw new Error("Apenas territórios ativos podem votar");
    }

    // Get the vote
    const { data: vote, error: voteError } = await supabase
      .from('parliamentary_votes')
      .select('*')
      .eq('id', input.vote_id)
      .single();

    if (voteError || !vote) {
      throw new Error("Votação não encontrada");
    }

    // Check if voting is still open
    if (vote.status !== 'open') {
      throw new Error("Esta votação não está mais aberta");
    }

    const now = new Date();
    if (new Date(vote.voting_ends_at) < now) {
      throw new Error("O período de votação encerrou");
    }

    // Check if it's a bloc vote and territory is a member
    if (vote.legal_level === 'bloc' && vote.bloc_id) {
      const { data: membership } = await supabase
        .from('bloc_memberships')
        .select('id')
        .eq('bloc_id', vote.bloc_id)
        .eq('territory_id', input.territory_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership) {
        throw new Error("Seu território não é membro deste bloco");
      }
    }

    // Check if already voted
    const { data: existingVote } = await supabase
      .from('vote_records')
      .select('id')
      .eq('vote_id', input.vote_id)
      .eq('territory_id', input.territory_id)
      .maybeSingle();

    if (existingVote) {
      throw new Error("Este território já votou nesta matéria");
    }

    // Record the vote
    const { error: recordError } = await supabase
      .from('vote_records')
      .insert({
        vote_id: input.vote_id,
        territory_id: input.territory_id,
        voter_id: user.id,
        choice: input.choice,
        reason: input.reason
      });

    if (recordError) {
      console.error("Error recording vote:", recordError);
      throw new Error(`Erro ao registrar voto: ${recordError.message}`);
    }

    // Update vote counts
    const updateField = input.choice === 'yes' ? 'votes_yes' 
      : input.choice === 'no' ? 'votes_no' 
      : 'votes_abstain';

    const { error: updateError } = await supabase
      .from('parliamentary_votes')
      .update({ [updateField]: vote[updateField] + 1 })
      .eq('id', input.vote_id);

    if (updateError) {
      console.error("Error updating vote count:", updateError);
    }

    // Check if voting should be concluded
    const totalVotes = vote.votes_yes + vote.votes_no + vote.votes_abstain + 1;
    const quorum = Math.ceil(vote.total_eligible * 0.5); // 50% quorum

    if (totalVotes >= vote.total_eligible) {
      // All eligible have voted - close the vote
      await concludeVote(supabase, vote, totalVotes);
    }

    console.log("Vote cast successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Voto "${input.choice}" registrado com sucesso`,
        vote_counts: {
          yes: vote.votes_yes + (input.choice === 'yes' ? 1 : 0),
          no: vote.votes_no + (input.choice === 'no' ? 1 : 0),
          abstain: vote.votes_abstain + (input.choice === 'abstain' ? 1 : 0)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in cast-vote:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

async function concludeVote(supabase: any, vote: any, totalVotes: number) {
  const yesVotes = vote.votes_yes;
  const noVotes = vote.votes_no;
  
  // Determine result based on vote type
  let requiredMajority = 0.5; // Simple majority
  
  if (vote.vote_type === 'constitution') {
    requiredMajority = 2/3; // 2/3 for constitutional changes
  } else if (vote.vote_type === 'bloc_creation' || vote.vote_type === 'era_change') {
    requiredMajority = 0.6; // 60% for major decisions
  }

  const passed = yesVotes / (yesVotes + noVotes) >= requiredMajority;
  const result = passed ? 'approved' : 'rejected';

  // Update vote status
  await supabase
    .from('parliamentary_votes')
    .update({ 
      status: 'closed',
      result 
    })
    .eq('id', vote.id);

  // If passed, update the subject
  if (passed && vote.subject_id) {
    if (vote.vote_type === 'law' || vote.vote_type === 'bloc_law') {
      await supabase
        .from('laws')
        .update({ 
          status: 'enacted',
          enacted_at: new Date().toISOString()
        })
        .eq('id', vote.subject_id);

      // Log to legal history
      await supabase
        .from('legal_history')
        .insert({
          law_id: vote.subject_id,
          action: 'enacted',
          description: `Lei aprovada pelo Parlamento com ${yesVotes} votos a favor e ${noVotes} contra`,
          old_status: 'voting',
          new_status: 'enacted'
        });
    } else if (vote.vote_type === 'bloc_creation') {
      await supabase
        .from('geopolitical_blocs')
        .update({ status: 'active' })
        .eq('id', vote.subject_id);
    }
  } else if (!passed && vote.subject_id) {
    if (vote.vote_type === 'law' || vote.vote_type === 'bloc_law') {
      await supabase
        .from('laws')
        .update({ status: 'vetoed' })
        .eq('id', vote.subject_id);

      await supabase
        .from('legal_history')
        .insert({
          law_id: vote.subject_id,
          action: 'vetoed',
          description: `Lei rejeitada pelo Parlamento com ${yesVotes} votos a favor e ${noVotes} contra`,
          old_status: 'voting',
          new_status: 'vetoed'
        });
    }
  }

  console.log(`Vote ${vote.id} concluded: ${result}`);
}
