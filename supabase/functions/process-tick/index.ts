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
  urban_population: number;
  profile_id: string;
  cell_id: string;
  city_profiles: CityProfile;
}

interface Territory {
  id: string;
  name: string;
  owner_id: string;
  stability: number;
  treasury: number;
  is_neutral: boolean;
  total_rural_population: number;
  total_urban_population: number;
}

interface Cell {
  id: string;
  owner_territory_id: string | null;
  status: string;
  cell_type: string;
  rural_population: number;
  urban_population: number;
  area_km2: number;
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
  { type: 'population_boom', title: 'Boom Populacional', description: 'Condições favoráveis causaram crescimento populacional.', effects: { population_growth: 5 } },
  { type: 'migration', title: 'Onda Migratória', description: 'Migrantes rurais se mudaram para áreas urbanas.', effects: { urban_migration: 2 } },
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

    // 5. Get all cells
    const { data: allCells, error: cellsError } = await supabase
      .from('cells')
      .select('id, owner_territory_id, status, cell_type, rural_population, urban_population, area_km2');

    if (cellsError) {
      console.error('Error fetching cells:', cellsError);
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

    // Group cells by territory
    const cellsByTerritory = new Map<string, Cell[]>();
    allCells?.forEach((cell: any) => {
      if (cell.owner_territory_id) {
        const list = cellsByTerritory.get(cell.owner_territory_id) || [];
        list.push(cell);
        cellsByTerritory.set(cell.owner_territory_id, list);
      }
    });

    // Population tracking for world config
    let totalActiveUrbanPop = 0;
    let totalActiveRuralPop = 0;

    // 6. Process each territory
    for (const territory of (territories || [])) {
      const territoryCities = citiesByTerritory.get(territory.id) || [];
      const territoryCells = cellsByTerritory.get(territory.id) || [];
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

      // Calculate territory population from cells
      let territoryRuralPop = 0;
      let territoryUrbanPop = 0;

      for (const cell of territoryCells) {
        territoryRuralPop += cell.rural_population || 0;
        territoryUrbanPop += cell.urban_population || 0;
      }

      totalActiveRuralPop += territoryRuralPop;
      totalActiveUrbanPop += territoryUrbanPop;

      // Calculate stability penalty for production
      const stabilityMultiplier = territory.stability < 20 ? 0.5 : 1.0;

      // RURAL PRODUCTION - from rural population
      // Rural produces: food, minerals, base economy
      const ruralPopFactor = Math.sqrt(territoryRuralPop / 10000); // Scale factor
      const ruralFoodProduction = ruralPopFactor * 20 * stabilityMultiplier;
      const ruralMineralProduction = ruralPopFactor * 10 * stabilityMultiplier;
      const ruralEconomyBonus = ruralPopFactor * 5; // Currency per tick

      totalFood += ruralFoodProduction;
      totalMinerals += ruralMineralProduction;
      newTreasury += ruralEconomyBonus;

      // URBAN PRODUCTION - from cities
      for (const city of territoryCities) {
        const profile = city.city_profiles as CityProfile;
        if (!profile) continue;

        const outputs = profile.base_outputs_per_tick || {};
        const cityUrbanPop = city.urban_population || city.population || 1000;
        const popMultiplier = Math.sqrt(cityUrbanPop / 1000);

        // Urban produces: currency, tech, research, influence
        totalFood += (outputs.food || 0) * popMultiplier * stabilityMultiplier;
        totalEnergy += (outputs.energy || 0) * popMultiplier * stabilityMultiplier;
        totalMinerals += (outputs.minerals || 0) * popMultiplier * stabilityMultiplier;
        totalTech += (outputs.tech || 0) * popMultiplier * stabilityMultiplier;
        totalResearchGenerated += profile.base_research_per_tick * stabilityMultiplier;
        totalMaintenanceCost += profile.maintenance_cost_per_tick;

        // Urban generates more currency but consumes more resources
        newTreasury += popMultiplier * 10 * stabilityMultiplier;

        citiesProcessed++;
      }

      // CONSUMPTION - urban consumes food and energy
      const urbanPopConsumptionFactor = Math.sqrt(territoryUrbanPop / 5000);
      const foodConsumption = urbanPopConsumptionFactor * 15;
      const energyConsumption = urbanPopConsumptionFactor * 10;

      totalFood -= foodConsumption;
      totalEnergy -= energyConsumption;

      // Maintenance costs
      newTreasury -= totalMaintenanceCost;

      // POPULATION GROWTH & MIGRATION
      let populationGrowth = 0;
      let urbanMigration = 0;

      // Growth depends on: food, energy, stability, tech
      if (totalFood > 0 && totalEnergy > 0 && territory.stability > 30) {
        // Base growth rate: 0.1% per tick
        const growthRate = 0.001 * (territory.stability / 100) * (1 + totalTech / 1000);
        populationGrowth = Math.floor(territoryRuralPop * growthRate);
      }

      // Urban migration: rural to urban when cities exist and stability is high
      if (territoryCities.length > 0 && territory.stability > 50 && territoryRuralPop > 1000) {
        // 0.05% migration rate
        urbanMigration = Math.floor(territoryRuralPop * 0.0005);
      }

      // Apply population changes to cells
      if (populationGrowth > 0 || urbanMigration > 0) {
        // Distribute growth to rural cells
        const ruralCells = territoryCells.filter(c => c.cell_type === 'rural');
        if (ruralCells.length > 0 && populationGrowth > 0) {
          const growthPerCell = Math.ceil(populationGrowth / ruralCells.length);
          for (const cell of ruralCells) {
            await supabase
              .from('cells')
              .update({ 
                rural_population: (cell.rural_population || 0) + growthPerCell - (urbanMigration > 0 ? Math.ceil(urbanMigration / ruralCells.length) : 0)
              })
              .eq('id', cell.id);
          }
        }

        // Add migration to urban cells
        if (urbanMigration > 0) {
          const urbanCells = territoryCells.filter(c => c.cell_type === 'urban');
          if (urbanCells.length > 0) {
            const migrationPerCell = Math.ceil(urbanMigration / urbanCells.length);
            for (const cell of urbanCells) {
              await supabase
                .from('cells')
                .update({ urban_population: (cell.urban_population || 0) + migrationPerCell })
                .eq('id', cell.id);
            }
          }
        }
      }

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

      // Urban/Rural imbalance check
      if (territoryRuralPop > 0 && territoryUrbanPop / territoryRuralPop > 0.6) {
        // Too many urban, not enough rural - instability
        newStability -= 2;
      }

      // Crisis check for low stability
      if (newStability < 20 && Math.random() < 0.3) {
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

      // Update territory with population and stability
      await supabase
        .from('territories')
        .update({
          stability: newStability,
          treasury: Math.round(newTreasury * 100) / 100,
          total_rural_population: territoryRuralPop + populationGrowth - urbanMigration,
          total_urban_population: territoryUrbanPop + urbanMigration,
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

      // Record population stats
      await supabase
        .from('population_stats')
        .insert({
          territory_id: territory.id,
          tick_number: newTickNumber,
          urban_population: territoryUrbanPop + urbanMigration,
          rural_population: territoryRuralPop + populationGrowth - urbanMigration,
          migration_in: urbanMigration,
          migration_out: 0,
          growth_rate: populationGrowth > 0 ? (populationGrowth / territoryRuralPop) : 0,
        });

      territoriesProcessed++;
    }

    // 7. Process active research projects
    const { data: researchProjects, error: researchError } = await supabase
      .from('research_projects')
      .select('*')
      .eq('status', 'active');

    if (!researchError && researchProjects) {
      for (const project of researchProjects as ResearchProject[]) {
        const { data: contributions } = await supabase
          .from('research_contributions')
          .select('points_contributed')
          .eq('project_id', project.id);

        const totalContributed = contributions?.reduce(
          (sum, c) => sum + (c.points_contributed || 0),
          0
        ) || 0;

        const newProgress = project.progress_research_points + totalContributed;

        if (newProgress >= project.cost_research_points_total) {
          await supabase
            .from('research_projects')
            .update({
              progress_research_points: project.cost_research_points_total,
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', project.id);

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

    // 8. Generate random daily events (1-3 events)
    const numEvents = Math.floor(Math.random() * 3) + 1;
    const activeTerritoriesForEvents = territories?.filter(t => !t.is_neutral) || [];

    for (let i = 0; i < numEvents && activeTerritoriesForEvents.length > 0; i++) {
      const randomTerritory = activeTerritoriesForEvents[
        Math.floor(Math.random() * activeTerritoriesForEvents.length)
      ];
      const randomEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];

      const effects = randomEvent.effects as Record<string, any>;

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

    // 9. Process active wars
    let warsProcessed = 0;
    const { data: activeWars, error: warsError } = await supabase
      .from('wars')
      .select('*, attacker:territories!wars_attacker_id_fkey(*), defender:territories!wars_defender_id_fkey(*)')
      .in('status', ['declared', 'active']);

    if (!warsError && activeWars) {
      for (const war of activeWars) {
        const attacker = war.attacker as Territory;
        const defender = war.defender as Territory;

        if (!attacker || !defender) continue;

        const attackerCities = citiesByTerritory.get(attacker.id)?.length || 0;
        const defenderCities = citiesByTerritory.get(defender.id)?.length || 0;

        const attackerResources = resourceMap.get(attacker.id);
        const defenderResources = resourceMap.get(defender.id);

        // Include population in military power calculation
        const attackerPop = (attacker.total_urban_population || 0) + (attacker.total_rural_population || 0);
        const defenderPop = (defender.total_urban_population || 0) + (defender.total_rural_population || 0);

        const attackerPower = Math.floor(
          (attackerCities * 10) +
          (attacker.stability * 0.5) +
          ((attackerResources?.tech || 0) * 2) +
          ((attacker as any).pi_points || 0) * 0.3 +
          (attackerPop / 100000) + // Population bonus
          (Math.random() * 20)
        );

        const defenderPower = Math.floor(
          (defenderCities * 10) +
          (defender.stability * 0.5) +
          ((defenderResources?.tech || 0) * 2) +
          ((defender as any).pi_points || 0) * 0.3 +
          (defenderPop / 100000) + // Population bonus
          (Math.random() * 20) +
          10 // Defender bonus
        );

        const attackerWins = attackerPower > defenderPower;
        const pointsGained = Math.abs(attackerPower - defenderPower);

        const newAttackerScore = war.attacker_war_score + (attackerWins ? pointsGained : 0);
        const newDefenderScore = war.defender_war_score + (!attackerWins ? pointsGained : 0);
        const newCycles = war.cycles_elapsed + 1;

        await supabase
          .from('war_turn_logs')
          .insert({
            war_id: war.id,
            tick_number: newTickNumber,
            attacker_power: attackerPower,
            defender_power: defenderPower,
            result_summary: `${attackerWins ? attacker.name : defender.name} venceu o turno (+${pointsGained} pontos)`,
          });

        const victoryThreshold = 100;
        const stabilityDefeat = 10;
        let warEnded = false;
        let winnerId: string | null = null;
        let cellsToTransfer = 0;

        if (newAttackerScore >= victoryThreshold) {
          warEnded = true;
          winnerId = attacker.id;
          cellsToTransfer = (war.target_cells as string[])?.length || 0;
        } else if (newDefenderScore >= victoryThreshold) {
          warEnded = true;
          winnerId = defender.id;
          cellsToTransfer = 0;
        } else if (defender.stability < stabilityDefeat) {
          warEnded = true;
          winnerId = attacker.id;
          cellsToTransfer = Math.ceil(((war.target_cells as string[])?.length || 0) * 0.5);
        } else if (newCycles >= war.max_cycles) {
          warEnded = true;
          winnerId = newAttackerScore > newDefenderScore ? attacker.id : defender.id;
          cellsToTransfer = winnerId === attacker.id 
            ? Math.ceil(((war.target_cells as string[])?.length || 0) * (newAttackerScore / (newAttackerScore + newDefenderScore)))
            : 0;
        }

        if (warEnded) {
          const targetCells = war.target_cells as string[] || [];
          const cellsToActuallyTransfer = winnerId === attacker.id ? targetCells.slice(0, cellsToTransfer) : [];

          for (const cellId of cellsToActuallyTransfer) {
            await supabase
              .from('cells')
              .update({ owner_territory_id: winnerId })
              .eq('id', cellId);

            await supabase
              .from('territory_transfers')
              .insert({
                cell_id: cellId,
                from_territory_id: defender.id,
                to_territory_id: winnerId,
                war_id: war.id,
                transfer_type: 'war_victory',
              });
          }

          await supabase
            .from('territories')
            .update({ stability: Math.max(0, attacker.stability - 15) })
            .eq('id', attacker.id);

          await supabase
            .from('territories')
            .update({ stability: Math.max(0, defender.stability - 20) })
            .eq('id', defender.id);

          await supabase
            .from('wars')
            .update({
              status: 'ended',
              winner_id: winnerId,
              attacker_war_score: newAttackerScore,
              defender_war_score: newDefenderScore,
              cycles_elapsed: newCycles,
              ended_at: new Date().toISOString(),
            })
            .eq('id', war.id);

          const winnerName = winnerId === attacker.id ? attacker.name : defender.name;
          await supabase
            .from('event_logs')
            .insert({
              tick_log_id: tickLog.id,
              territory_id: winnerId,
              event_type: 'war_ended',
              title: 'Guerra Encerrada',
              description: `${winnerName} venceu a guerra! ${cellsToActuallyTransfer.length} célula(s) transferida(s).`,
              effects: { 
                winner_id: winnerId, 
                cells_transferred: cellsToActuallyTransfer.length,
                final_score: `${newAttackerScore} vs ${newDefenderScore}`
              },
            });

          eventsGenerated++;
        } else {
          await supabase
            .from('wars')
            .update({
              status: 'active',
              attacker_war_score: newAttackerScore,
              defender_war_score: newDefenderScore,
              cycles_elapsed: newCycles,
              updated_at: new Date().toISOString(),
            })
            .eq('id', war.id);
        }

        warsProcessed++;
      }
    }

    console.log(`Wars processed: ${warsProcessed}`);

    // 10. Calculate latent population (blocked cells)
    const { data: blockedCells } = await supabase
      .from('cells')
      .select('area_km2')
      .eq('status', 'blocked');

    const latentPopulation = blockedCells?.reduce((sum, cell) => sum + (cell.area_km2 * 500), 0) || 0;

    // 11. Update world config with population stats
    await supabase
      .from('world_config')
      .update({
        season_day: newSeasonDay,
        total_ticks: newTickNumber,
        last_tick_at: new Date().toISOString(),
        active_urban_population: totalActiveUrbanPop,
        active_rural_population: totalActiveRuralPop,
        latent_population: latentPopulation,
        updated_at: new Date().toISOString(),
      })
      .eq('id', worldConfig.id);

    // 12. Complete tick log
    summary.territories_processed = territoriesProcessed;
    summary.cities_processed = citiesProcessed;
    summary.research_projects_completed = researchProjectsCompleted;
    summary.events_generated = eventsGenerated;
    summary.population = {
      active_urban: totalActiveUrbanPop,
      active_rural: totalActiveRuralPop,
      latent: latentPopulation,
    };

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
    console.log(`Population - Urban: ${totalActiveUrbanPop}, Rural: ${totalActiveRuralPop}, Latent: ${latentPopulation}`);

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
