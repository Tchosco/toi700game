import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LawInput {
  name: string;
  legal_level: 'planetary' | 'bloc' | 'national';
  category: string;
  description?: string;
  full_text?: string;
  bloc_id?: string;
  territory_id?: string;
  positive_effects: string[];
  negative_effects: string[];
  economic_impact: number;
  social_impact: number;
  territorial_impact: number;
  military_impact: number;
  template_id?: string;
  enact_immediately?: boolean;
}

function calculateSympathyAndRepulsion(
  positiveEffects: string[],
  negativeEffects: string[],
  economicImpact: number,
  socialImpact: number,
  territorialImpact: number,
  militaryImpact: number
): { sympathy: number; repulsion: number } {
  // Base values
  let baseSympathy = 50;
  let baseRepulsion = 50;

  // Adjust based on number of effects
  const positiveCount = positiveEffects.length;
  const negativeCount = negativeEffects.length;
  
  baseSympathy += positiveCount * 8;
  baseSympathy -= negativeCount * 5;
  baseRepulsion += negativeCount * 8;
  baseRepulsion -= positiveCount * 5;

  // Adjust based on impacts
  // Economic impact: positive = popular with merchants, negative = unpopular
  if (economicImpact > 0) {
    baseSympathy += economicImpact * 0.3;
    baseRepulsion -= economicImpact * 0.1;
  } else {
    baseRepulsion += Math.abs(economicImpact) * 0.3;
    baseSympathy -= Math.abs(economicImpact) * 0.1;
  }

  // Social impact: positive = popular with people
  if (socialImpact > 0) {
    baseSympathy += socialImpact * 0.4;
  } else {
    baseRepulsion += Math.abs(socialImpact) * 0.4;
  }

  // Territorial impact: mixed reactions
  if (territorialImpact > 0) {
    baseSympathy += territorialImpact * 0.2;
    baseRepulsion += territorialImpact * 0.1; // Expansion can cause fear
  }

  // Military impact: nationalists like it, pacifists don't
  if (militaryImpact > 0) {
    baseSympathy += militaryImpact * 0.15;
    baseRepulsion += militaryImpact * 0.25;
  } else if (militaryImpact < 0) {
    baseSympathy += Math.abs(militaryImpact) * 0.1;
    baseRepulsion += Math.abs(militaryImpact) * 0.15;
  }

  // Add randomness (±10%)
  const randomFactor = () => (Math.random() - 0.5) * 20;
  baseSympathy += randomFactor();
  baseRepulsion += randomFactor();

  // Clamp values between 5 and 95
  const sympathy = Math.max(5, Math.min(95, Math.round(baseSympathy)));
  const repulsion = Math.max(5, Math.min(95, Math.round(baseRepulsion)));

  return { sympathy, repulsion };
}

async function checkLegalConflicts(
  supabase: any,
  legalLevel: string,
  blocId: string | null,
  positiveEffects: string[],
  negativeEffects: string[],
  category: string
): Promise<{ hasConflict: boolean; conflicts: any[] }> {
  const conflicts: any[] = [];

  // Get superior laws based on hierarchy
  let superiorLaws: any[] = [];

  if (legalLevel === 'national') {
    // Check bloc and planetary laws
    const { data: planetaryLaws } = await supabase
      .from('laws')
      .select('*')
      .eq('legal_level', 'planetary')
      .eq('status', 'enacted');
    
    if (planetaryLaws) superiorLaws.push(...planetaryLaws);

    if (blocId) {
      const { data: blocLaws } = await supabase
        .from('laws')
        .select('*')
        .eq('legal_level', 'bloc')
        .eq('bloc_id', blocId)
        .eq('status', 'enacted');
      
      if (blocLaws) superiorLaws.push(...blocLaws);
    }
  } else if (legalLevel === 'bloc') {
    // Check planetary laws
    const { data: planetaryLaws } = await supabase
      .from('laws')
      .select('*')
      .eq('legal_level', 'planetary')
      .eq('status', 'enacted');
    
    if (planetaryLaws) superiorLaws.push(...planetaryLaws);
  }

  // Simple conflict detection based on opposing effects
  const allEffects = [...positiveEffects, ...negativeEffects].map(e => e.toLowerCase());
  
  for (const law of superiorLaws) {
    const lawEffects = [
      ...(law.positive_effects || []),
      ...(law.negative_effects || [])
    ].map((e: string) => e.toLowerCase());

    // Check for category conflicts
    if (law.category === category && law.is_constitution) {
      // Constitution defines the framework - check if new law respects it
      const constitutionText = (law.full_text || '').toLowerCase();
      
      // Simple keyword conflict detection
      if (constitutionText.includes('proibido') || constitutionText.includes('não pode')) {
        // There might be restrictions
        conflicts.push({
          law_id: law.id,
          law_name: law.name,
          reason: 'Possível conflito com a Constituição. Verifique as restrições.',
          severity: 'warning'
        });
      }
    }

    // Check for direct contradictions in effects
    for (const effect of allEffects) {
      for (const lawEffect of lawEffects) {
        if (
          (effect.includes('aumenta') && lawEffect.includes('proíbe')) ||
          (effect.includes('permite') && lawEffect.includes('proíbe')) ||
          (effect.includes('reduz impostos') && lawEffect.includes('impostos obrigatórios'))
        ) {
          conflicts.push({
            law_id: law.id,
            law_name: law.name,
            reason: `Conflito de efeitos: "${effect}" vs "${lawEffect}"`,
            severity: 'error'
          });
        }
      }
    }
  }

  return {
    hasConflict: conflicts.some(c => c.severity === 'error'),
    conflicts
  };
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

    const input: LawInput = await req.json();
    console.log("Creating law:", input);

    // Validate required fields
    if (!input.name || !input.legal_level || !input.category) {
      throw new Error("Nome, nível legal e categoria são obrigatórios");
    }

    // Validate ownership
    if (input.legal_level === 'national' && !input.territory_id) {
      throw new Error("territory_id é obrigatório para leis nacionais");
    }

    if (input.legal_level === 'bloc' && !input.bloc_id) {
      throw new Error("bloc_id é obrigatório para leis de bloco");
    }

    // Check territory ownership for national laws
    if (input.legal_level === 'national') {
      const { data: territory } = await supabase
        .from('territories')
        .select('owner_id')
        .eq('id', input.territory_id)
        .single();

      if (!territory || territory.owner_id !== user.id) {
        throw new Error("Você não possui este território");
      }
    }

    // Get bloc_id for the territory if it's a national law
    let territoryBlocId: string | null = null;
    if (input.legal_level === 'national' && input.territory_id) {
      const { data: membership } = await supabase
        .from('bloc_memberships')
        .select('bloc_id')
        .eq('territory_id', input.territory_id)
        .eq('status', 'active')
        .maybeSingle();
      
      territoryBlocId = membership?.bloc_id || null;
    }

    // Check for legal conflicts
    const { hasConflict, conflicts } = await checkLegalConflicts(
      supabase,
      input.legal_level,
      input.bloc_id || territoryBlocId,
      input.positive_effects || [],
      input.negative_effects || [],
      input.category
    );

    if (hasConflict) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Lei viola leis superiores",
          conflicts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Calculate sympathy and repulsion
    const { sympathy, repulsion } = calculateSympathyAndRepulsion(
      input.positive_effects || [],
      input.negative_effects || [],
      input.economic_impact || 0,
      input.social_impact || 0,
      input.territorial_impact || 0,
      input.military_impact || 0
    );

    // Create the law
    const lawData = {
      name: input.name,
      legal_level: input.legal_level,
      category: input.category,
      description: input.description,
      full_text: input.full_text,
      bloc_id: input.bloc_id,
      territory_id: input.territory_id,
      proposed_by: user.id,
      positive_effects: input.positive_effects || [],
      negative_effects: input.negative_effects || [],
      economic_impact: input.economic_impact || 0,
      social_impact: input.social_impact || 0,
      territorial_impact: input.territorial_impact || 0,
      military_impact: input.military_impact || 0,
      population_sympathy: sympathy,
      population_repulsion: repulsion,
      legal_conflicts: conflicts.length > 0 ? conflicts : [],
      status: input.enact_immediately && input.legal_level === 'national' ? 'enacted' : 'proposed',
      enacted_at: input.enact_immediately && input.legal_level === 'national' ? new Date().toISOString() : null
    };

    const { data: newLaw, error: lawError } = await supabase
      .from('laws')
      .insert(lawData)
      .select()
      .single();

    if (lawError) {
      console.error("Error creating law:", lawError);
      throw new Error(`Erro ao criar lei: ${lawError.message}`);
    }

    // Log to legal history
    await supabase
      .from('legal_history')
      .insert({
        law_id: newLaw.id,
        action: input.enact_immediately && input.legal_level === 'national' ? 'enacted' : 'proposed',
        description: input.enact_immediately && input.legal_level === 'national' 
          ? `Decreto "${input.name}" promulgado por decreto real`
          : `Lei "${input.name}" proposta para votação`,
        new_status: newLaw.status,
        performed_by: user.id,
        territory_id: input.territory_id,
        bloc_id: input.bloc_id
      });

    // If national law enacted immediately, apply effects to territory
    if (input.enact_immediately && input.legal_level === 'national' && input.territory_id) {
      // Calculate stability impact based on sympathy/repulsion
      const stabilityChange = (sympathy - repulsion) * 0.1;
      
      const { data: territory } = await supabase
        .from('territories')
        .select('stability')
        .eq('id', input.territory_id)
        .single();

      if (territory) {
        const newStability = Math.max(0, Math.min(100, territory.stability + stabilityChange));
        
        await supabase
          .from('territories')
          .update({ stability: newStability })
          .eq('id', input.territory_id);
      }
    }

    console.log("Law created successfully:", newLaw.id);

    return new Response(
      JSON.stringify({
        success: true,
        law: newLaw,
        sympathy,
        repulsion,
        conflicts: conflicts.length > 0 ? conflicts : null
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-law:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
