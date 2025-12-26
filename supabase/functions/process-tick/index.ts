import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CityProfile {
  base_outputs_per_tick: {
    food?: number;
    energy?: number;
    minerals?: number;
    tech?: number;
  };
  base_research_per_tick: number;
  maintenance_cost_per_tick: number;
}

interface City {
  id: string;
  name: string;
  owner_territory_id: string;
  population: number;
  profile_id: string;
  city_profiles: CityProfile;
}

interface Territory {
  id: string;
  name: string;
  owner_id: string;
  stability: number;
  treasury: number;
  is_neutral: boolean;
}

interface ResourceBalance {
  id: string;
  territory_id: string;
  food: number;
  energy: number;
  minerals: number;
  tech: number;
}

interface ResearchProject {
  id: string;
  name: string;
  target_region_id: string | null;
  cost_research_points_total: number;
  progress_research_points: number;
  status: string;
  is_global: boolean;
}

// Random events that can happen each tick
const RANDOM_EVENTS = [
  { type: 'bonus_production', title: 'Onda de Produtividade', description: 'Trabalhadores mais motivados aumentaram a produção.', effects: { food: 50, energy: 30 } },
  { type: 'mineral_discovery', title: 'Descoberta Mineral', description: 'Uma nova veia de minerais foi encontrada.', effects: { minerals: 100 } },
  { type: 'tech_breakthrough', title: 'Avanço Tecnológico', description: 'Cientistas fizeram uma descoberta importante.', effects: { tech: 25, research_points: 10 } },
  { type: 'trade_boom', title: 'Boom Comercial', description: 'Comércio próspero gerou receitas extras.', effects: { currency: 200 } },
  { type: 'storm', title: 'Tempestade Severa', description: 'Uma tempestade causou pequenos danos.', effects: { energy: -20, stability: -2 } },
  { type: 'harvest', title: 'Colheita Abundante', description: 'Condições climáticas favoráveis resultaram em colheita extra.', effects: { food: 80 } },
  { type: 'research_grant', title: 'Financiamento de Pesquisa', description: 'Um mecenas investiu em pesquisa.', effects: { research_points: 20, currency: 100 } },
  { type: 'energy_surge', title: 'Pico de Energia', description: 'Geradores operaram com eficiência máxima.', effects: { energy: 60 } },
  { type: 'cultural_event', title: 'Festival Cultural', description: 'Um festival aumentou a moral do povo.', effects: { stability: 5, currency: 50 } },
  { type: 'minor_accident', title: 'Acidente Industrial', description: 'Um pequeno acidente afetou a produção.', effects: { minerals: -30, stability: -1 } },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting tick processing...');

    // 1. Get world config
    const { data: worldConfig, error: configError } = await supabase
      .from('world_config')
      .select('*')
      .limit(1)
      .single();

    if (configError) {
      console.error('Error fetching world config:', configError);
      throw new Error('Failed to fetch world config');
    }

    const newTickNumber = (worldConfig.total_ticks || 0) + 1;
    const newSeasonDay = (worldConfig.season_day || 0) + 1;

    // Create tick log entry
    const { data: tickLog, error: tickLogError } = await supabase
      .from('tick_logs')
      .insert({
        tick_number: newTickNumber,
        status: 'running',
      })
      .select()
      .single();

    if (tickLogError) {
      console.error('Error creating tick log:', tickLogError);
      throw new Error('Failed to create tick log');
    }

    console.log(`Tick #${newTickNumber} started`);

    let territoriesProcessed = 0;
    let citiesProcessed = 0;
    let researchProjectsCompleted = 0;
    let eventsGenerated = 0;
    const summary: Record<string, any> = {};

    // 2. Get all active territories
    const { data: territories, error: territoriesError } = await supabase
      .from('territories')
      .select('*')
      .eq('status', 'active')
      .eq('is_neutral', false);

    if (territoriesError) {
      console.error('Error fetching territories:', territoriesError);
      throw new Error('Failed to fetch territories');
    }

    console.log(`Processing ${territories?.length || 0} territories...`);

    // 3. Get all cities with their profiles
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('*, city_profiles(*)')
      .not('owner_territory_id', 'is', null);

    if (citiesError) {
      console.error('Error fetching cities:', citiesError);
      throw new Error('Failed to fetch cities');
    }

    // 4. Get resource balances
    const { data: resourceBalances, error: resourcesError } = await supabase
      .from('resource_balances')
      .select('*');

    if (resourcesError) {
      console.error('Error fetching resource balances:', resourcesError);
    }

    // Create a map of resource balances by territory
    const resourceMap = new Map<string, ResourceBalance>();
    resourceBalances?.forEach((rb: ResourceBalance) => {
      resourceMap.set(rb.territory_id, rb);
    });

    // Group cities by territory
    const citiesByTerritory = new Map<string, City[]>();
    cities?.forEach((city: any) => {
      if (city.owner_territory_id && city.city_profiles) {
        const list = citiesByTerritory.get(city.owner_territory_id) || [];
        list.push(city);
        citiesByTerritory.set(city.owner_territory_id, list);
      }
    });

    // 5. Process each territory
    for (const territory of (territories || [])) {
      const territoryCities = citiesByTerritory.get(territory.id) || [];
      let resourceBalance = resourceMap.get(territory.id);

      // Initialize resource balance if it doesn't exist
      if (!resourceBalance) {
        const { data: newBalance, error: newBalanceError } = await supabase
          .from('resource_balances')
          .insert({
            territory_id: territory.id,
            food: 0,
            energy: 0,
            minerals: 0,
            tech: 0,
            tick_number: newTickNumber,
          })
          .select()
          .single();

        if (!newBalanceError && newBalance) {
          resourceBalance = newBalance;
        }
      }

      let totalFood = resourceBalance?.food || 0;
      let totalEnergy = resourceBalance?.energy || 0;
      let totalMinerals = resourceBalance?.minerals || 0;
      let totalTech = resourceBalance?.tech || 0;
      let totalResearchGenerated = 0;
      let totalMaintenanceCost = 0;
      let newStability = territory.stability;
      let newTreasury = territory.treasury;

      // Calculate stability penalty for production
      const stabilityMultiplier = territory.stability < 20 ? 0.5 : 1.0;

      // Production phase - each city produces resources
      for (const city of territoryCities) {
        const profile = city.city_profiles as CityProfile;
        if (!profile) continue;

        const outputs = profile.base_outputs_per_tick || {};
        const popMultiplier = Math.sqrt(city.population / 1000); // Population affects production

        totalFood += (outputs.food || 0) * popMultiplier * stabilityMultiplier;
        totalEnergy += (outputs.energy || 0) * popMultiplier * stabilityMultiplier;
        totalMinerals += (outputs.minerals || 0) * popMultiplier * stabilityMultiplier;
        totalTech += (outputs.tech || 0) * popMultiplier * stabilityMultiplier;
        totalResearchGenerated += profile.base_research_per_tick * stabilityMultiplier;
        totalMaintenanceCost += profile.maintenance_cost_per_tick;

        citiesProcessed++;
      }

      // Base consumption (population needs food and energy)
      const baseConsumption = territoryCities.length * 5;
      totalFood -= baseConsumption;
      totalEnergy -= baseConsumption;

      // Maintenance costs
      newTreasury -= totalMaintenanceCost;

      // Stability adjustments
      if (totalFood < 0 || totalEnergy < 0 || newTreasury < 0) {
        // Lacking resources or bankrupt - stability drops
        newStability -= 5;
        if (totalFood < 0) totalFood = 0;
        if (totalEnergy < 0) totalEnergy = 0;
      } else if (totalFood > 50 && totalEnergy > 50 && newTreasury > 100) {
        // Surplus - stability slowly increases
        newStability = Math.min(100, newStability + 1);
      }

      // Crisis check for low stability
      if (newStability < 20 && Math.random() < 0.3) {
        // 30% chance of crisis event
        const { error: crisisError } = await supabase
          .from('event_logs')
          .insert({
            tick_log_id: tickLog.id,
            territory_id: territory.id,
            event_type: 'crisis',
            title: 'Crise de Estabilidade',
            description: `${territory.name} está enfrentando uma crise devido à baixa estabilidade.`,
            effects: { stability: -5, production_penalty: 0.5 },
          });

        if (!crisisError) eventsGenerated++;
        newStability -= 5;
      }

      // Contested cell check for very low stability
      if (newStability < 5) {
        // Mark a random rural cell as potentially contested
        const { data: ruralCells } = await supabase
          .from('cells')
          .select('id')
          .eq('owner_territory_id', territory.id)
          .eq('cell_type', 'rural')
          .limit(1);

        if (ruralCells && ruralCells.length > 0) {
          await supabase
            .from('event_logs')
            .insert({
              tick_log_id: tickLog.id,
              territory_id: territory.id,
              event_type: 'contested_cell',
              title: 'Célula Contestada',
              description: `Uma célula rural em ${territory.name} está sendo contestada devido à instabilidade extrema.`,
              effects: { cell_id: ruralCells[0].id },
            });
          eventsGenerated++;
        }
      }

      // Clamp stability
      newStability = Math.max(0, Math.min(100, newStability));

      // Update resource balance
      if (resourceBalance) {
        await supabase
          .from('resource_balances')
          .update({
            food: Math.round(totalFood * 100) / 100,
            energy: Math.round(totalEnergy * 100) / 100,
            minerals: Math.round(totalMinerals * 100) / 100,
            tech: Math.round(totalTech * 100) / 100,
            tick_number: newTickNumber,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resourceBalance.id);
      }

      // Update territory research
      await supabase
        .from('territory_research')
        .upsert({
          territory_id: territory.id,
          research_points: totalResearchGenerated,
          total_research_generated: totalResearchGenerated,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'territory_id' });

      // Update territory stability and treasury
      await supabase
        .from('territories')
        .update({
          stability: newStability,
          treasury: Math.round(newTreasury * 100) / 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', territory.id);

      // Update owner's profile research points
      if (territory.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('research_points')
          .eq('id', territory.owner_id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              research_points: (profile.research_points || 0) + Math.floor(totalResearchGenerated),
              updated_at: new Date().toISOString(),
            })
            .eq('id', territory.owner_id);
        }
      }

      territoriesProcessed++;
    }

    // 6. Process active research projects
    const { data: researchProjects, error: researchError } = await supabase
      .from('research_projects')
      .select('*')
      .eq('status', 'active');

    if (!researchError && researchProjects) {
      for (const project of researchProjects as ResearchProject[]) {
        // Get contributions for this tick
        const { data: contributions } = await supabase
          .from('research_contributions')
          .select('points_contributed')
          .eq('project_id', project.id);

        const totalContributed = contributions?.reduce(
          (sum, c) => sum + (c.points_contributed || 0),
          0
        ) || 0;

        const newProgress = project.progress_research_points + totalContributed;

        // Check if project is completed
        if (newProgress >= project.cost_research_points_total) {
          await supabase
            .from('research_projects')
            .update({
              progress_research_points: project.cost_research_points_total,
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', project.id);

          // If global project targeting a region, reveal the region
          if (project.is_global && project.target_region_id) {
            await supabase
              .from('regions')
              .update({ is_visible: true, updated_at: new Date().toISOString() })
              .eq('id', project.target_region_id);

            await supabase
              .from('event_logs')
              .insert({
                tick_log_id: tickLog.id,
                event_type: 'research_complete',
                title: 'Pesquisa Concluída',
                description: `O projeto de pesquisa "${project.name}" foi concluído. Uma nova região foi revelada!`,
                effects: { region_id: project.target_region_id },
              });
            eventsGenerated++;
          }

          researchProjectsCompleted++;
        } else {
          await supabase
            .from('research_projects')
            .update({
              progress_research_points: newProgress,
              updated_at: new Date().toISOString(),
            })
            .eq('id', project.id);
        }
      }
    }

    // 7. Generate random daily events (1-3 events)
    const numEvents = Math.floor(Math.random() * 3) + 1;
    const activeTerritoriesForEvents = territories?.filter(t => !t.is_neutral) || [];

    for (let i = 0; i < numEvents && activeTerritoriesForEvents.length > 0; i++) {
      const randomTerritory = activeTerritoriesForEvents[
        Math.floor(Math.random() * activeTerritoriesForEvents.length)
      ];
      const randomEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];

      // Apply event effects
      const effects = randomEvent.effects;

      if (effects.currency && randomTerritory.owner_id) {
        await supabase
          .from('profiles')
          .update({
            currency: randomTerritory.treasury + (effects.currency || 0),
          })
          .eq('id', randomTerritory.owner_id);
      }

      if (effects.stability) {
        const newStab = Math.max(0, Math.min(100, randomTerritory.stability + effects.stability));
        await supabase
          .from('territories')
          .update({ stability: newStab })
          .eq('id', randomTerritory.id);
      }

      // Apply resource effects
      const resourceBalance = resourceMap.get(randomTerritory.id);
      if (resourceBalance && (effects.food || effects.energy || effects.minerals || effects.tech)) {
        await supabase
          .from('resource_balances')
          .update({
            food: Math.max(0, (resourceBalance.food || 0) + (effects.food || 0)),
            energy: Math.max(0, (resourceBalance.energy || 0) + (effects.energy || 0)),
            minerals: Math.max(0, (resourceBalance.minerals || 0) + (effects.minerals || 0)),
            tech: Math.max(0, (resourceBalance.tech || 0) + (effects.tech || 0)),
          })
          .eq('id', resourceBalance.id);
      }

      // Log the event
      await supabase
        .from('event_logs')
        .insert({
          tick_log_id: tickLog.id,
          territory_id: randomTerritory.id,
          event_type: randomEvent.type,
          title: randomEvent.title,
          description: `${randomEvent.description} (${randomTerritory.name})`,
          effects: effects,
        });

      eventsGenerated++;
    }

    // 8. Update world config
    await supabase
      .from('world_config')
      .update({
        season_day: newSeasonDay,
        total_ticks: newTickNumber,
        last_tick_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', worldConfig.id);

    // 9. Complete tick log
    summary.territories_processed = territoriesProcessed;
    summary.cities_processed = citiesProcessed;
    summary.research_projects_completed = researchProjectsCompleted;
    summary.events_generated = eventsGenerated;

    await supabase
      .from('tick_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        territories_processed: territoriesProcessed,
        cities_processed: citiesProcessed,
        research_projects_completed: researchProjectsCompleted,
        events_generated: eventsGenerated,
        summary: summary,
      })
      .eq('id', tickLog.id);

    console.log(`Tick #${newTickNumber} completed successfully`);
    console.log(`Territories: ${territoriesProcessed}, Cities: ${citiesProcessed}, Events: ${eventsGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        tick_number: newTickNumber,
        season_day: newSeasonDay,
        summary: summary,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Tick processing error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
