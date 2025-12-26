export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bloc_memberships: {
        Row: {
          bloc_id: string
          created_at: string
          id: string
          joined_at: string | null
          left_at: string | null
          status: string
          territory_id: string
        }
        Insert: {
          bloc_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          territory_id: string
        }
        Update: {
          bloc_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          status?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloc_memberships_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "geopolitical_blocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloc_memberships_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      cell_cities: {
        Row: {
          cell_id: string
          city_id: string
          created_at: string
          id: string
          is_primary: boolean | null
        }
        Insert: {
          cell_id: string
          city_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          cell_id?: string
          city_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cell_cities_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cell_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      cells: {
        Row: {
          area_km2: number
          cell_type: Database["public"]["Enums"]["cell_type"]
          city_id: string | null
          colonization_cost: number | null
          colonized_at: string | null
          colonized_by: string | null
          created_at: string
          explored_at: string | null
          explored_by: string | null
          focus_changed_at: string | null
          focus_penalty_until: string | null
          has_city: boolean
          id: string
          is_urban_eligible: boolean
          owner_territory_id: string | null
          population_density: number
          region_id: string | null
          rural_focus: string | null
          rural_population: number
          status: Database["public"]["Enums"]["cell_status"]
          unlock_reason: string | null
          unlocked_by_era_id: string | null
          updated_at: string
          urban_focus: string | null
          urban_population: number
        }
        Insert: {
          area_km2?: number
          cell_type?: Database["public"]["Enums"]["cell_type"]
          city_id?: string | null
          colonization_cost?: number | null
          colonized_at?: string | null
          colonized_by?: string | null
          created_at?: string
          explored_at?: string | null
          explored_by?: string | null
          focus_changed_at?: string | null
          focus_penalty_until?: string | null
          has_city?: boolean
          id?: string
          is_urban_eligible?: boolean
          owner_territory_id?: string | null
          population_density?: number
          region_id?: string | null
          rural_focus?: string | null
          rural_population?: number
          status?: Database["public"]["Enums"]["cell_status"]
          unlock_reason?: string | null
          unlocked_by_era_id?: string | null
          updated_at?: string
          urban_focus?: string | null
          urban_population?: number
        }
        Update: {
          area_km2?: number
          cell_type?: Database["public"]["Enums"]["cell_type"]
          city_id?: string | null
          colonization_cost?: number | null
          colonized_at?: string | null
          colonized_by?: string | null
          created_at?: string
          explored_at?: string | null
          explored_by?: string | null
          focus_changed_at?: string | null
          focus_penalty_until?: string | null
          has_city?: boolean
          id?: string
          is_urban_eligible?: boolean
          owner_territory_id?: string | null
          population_density?: number
          region_id?: string | null
          rural_focus?: string | null
          rural_population?: number
          status?: Database["public"]["Enums"]["cell_status"]
          unlock_reason?: string | null
          unlocked_by_era_id?: string | null
          updated_at?: string
          urban_focus?: string | null
          urban_population?: number
        }
        Relationships: [
          {
            foreignKeyName: "cells_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cells_owner_territory_id_fkey"
            columns: ["owner_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cells_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cells_unlocked_by_era_id_fkey"
            columns: ["unlocked_by_era_id"]
            isOneToOne: false
            referencedRelation: "planetary_eras"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          cell_id: string | null
          created_at: string
          id: string
          is_neutral: boolean
          name: string
          owner_territory_id: string | null
          population: number
          profile_id: string | null
          region_id: string | null
          status: Database["public"]["Enums"]["city_status"]
          updated_at: string
          urban_population: number
        }
        Insert: {
          cell_id?: string | null
          created_at?: string
          id?: string
          is_neutral?: boolean
          name: string
          owner_territory_id?: string | null
          population?: number
          profile_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["city_status"]
          updated_at?: string
          urban_population?: number
        }
        Update: {
          cell_id?: string | null
          created_at?: string
          id?: string
          is_neutral?: boolean
          name?: string
          owner_territory_id?: string | null
          population?: number
          profile_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["city_status"]
          updated_at?: string
          urban_population?: number
        }
        Relationships: [
          {
            foreignKeyName: "cities_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "city_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cities_territory"
            columns: ["owner_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      city_profiles: {
        Row: {
          base_outputs_per_tick: Json
          base_research_per_tick: number
          created_at: string
          description: string | null
          id: string
          maintenance_cost_per_tick: number
          name: string
          updated_at: string
        }
        Insert: {
          base_outputs_per_tick?: Json
          base_research_per_tick?: number
          created_at?: string
          description?: string | null
          id?: string
          maintenance_cost_per_tick?: number
          name: string
          updated_at?: string
        }
        Update: {
          base_outputs_per_tick?: Json
          base_research_per_tick?: number
          created_at?: string
          description?: string | null
          id?: string
          maintenance_cost_per_tick?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      currency_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          related_territory_id: string | null
          related_user_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          related_territory_id?: string | null
          related_user_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          related_territory_id?: string | null
          related_user_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "currency_transactions_related_territory_id_fkey"
            columns: ["related_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      diplomatic_history: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          involved_territories: string[] | null
          proposal_id: string | null
          space_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          involved_territories?: string[] | null
          proposal_id?: string | null
          space_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          involved_territories?: string[] | null
          proposal_id?: string | null
          space_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "diplomatic_history_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "formal_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diplomatic_history_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "discussion_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      diplomatic_relations: {
        Row: {
          created_at: string
          id: string
          last_interaction_at: string | null
          relation_score: number
          status: Database["public"]["Enums"]["diplomatic_status"]
          territory_a_id: string
          territory_b_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          relation_score?: number
          status?: Database["public"]["Enums"]["diplomatic_status"]
          territory_a_id: string
          territory_b_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          relation_score?: number
          status?: Database["public"]["Enums"]["diplomatic_status"]
          territory_a_id?: string
          territory_b_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diplomatic_relations_territory_a_id_fkey"
            columns: ["territory_a_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diplomatic_relations_territory_b_id_fkey"
            columns: ["territory_b_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          author_territory_id: string | null
          content: string
          created_at: string
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean | null
          topic_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_territory_id?: string | null
          content: string
          created_at?: string
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean | null
          topic_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_territory_id?: string | null
          content?: string
          created_at?: string
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean | null
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_territory_id_fkey"
            columns: ["author_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "discussion_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_spaces: {
        Row: {
          bloc_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean | null
          name: string
          space_type: Database["public"]["Enums"]["discussion_space_type"]
          updated_at: string
        }
        Insert: {
          bloc_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name: string
          space_type: Database["public"]["Enums"]["discussion_space_type"]
          updated_at?: string
        }
        Update: {
          bloc_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean | null
          name?: string
          space_type?: Database["public"]["Enums"]["discussion_space_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_spaces_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "geopolitical_blocs"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_topics: {
        Row: {
          author_id: string
          author_territory_id: string | null
          content: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          reply_count: number | null
          space_id: string
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          author_territory_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          reply_count?: number | null
          space_id: string
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          author_territory_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          reply_count?: number | null
          space_id?: string
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_topics_author_territory_id_fkey"
            columns: ["author_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_topics_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "discussion_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      event_logs: {
        Row: {
          created_at: string
          description: string | null
          effects: Json | null
          event_type: string
          id: string
          territory_id: string | null
          tick_log_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          effects?: Json | null
          event_type: string
          id?: string
          territory_id?: string | null
          tick_log_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          effects?: Json | null
          event_type?: string
          id?: string
          territory_id?: string | null
          tick_log_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_logs_tick_log_id_fkey"
            columns: ["tick_log_id"]
            isOneToOne: false
            referencedRelation: "tick_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      exploration_projects: {
        Row: {
          cells_completed: number
          created_at: string
          description: string | null
          era_id: string | null
          id: string
          name: string
          project_type: string
          started_by: string | null
          status: string
          target_cells: number
          updated_at: string
        }
        Insert: {
          cells_completed?: number
          created_at?: string
          description?: string | null
          era_id?: string | null
          id?: string
          name: string
          project_type: string
          started_by?: string | null
          status?: string
          target_cells?: number
          updated_at?: string
        }
        Update: {
          cells_completed?: number
          created_at?: string
          description?: string | null
          era_id?: string | null
          id?: string
          name?: string
          project_type?: string
          started_by?: string | null
          status?: string
          target_cells?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exploration_projects_era_id_fkey"
            columns: ["era_id"]
            isOneToOne: false
            referencedRelation: "planetary_eras"
            referencedColumns: ["id"]
          },
        ]
      }
      formal_proposals: {
        Row: {
          created_at: string
          description: string | null
          full_content: string | null
          id: string
          proposal_type: Database["public"]["Enums"]["proposal_type"]
          proposer_id: string
          proposer_territory_id: string | null
          result_entity_id: string | null
          result_entity_type: string | null
          space_id: string
          status: Database["public"]["Enums"]["proposal_status"]
          title: string
          topic_id: string | null
          updated_at: string
          votes_abstain: number | null
          votes_no: number | null
          votes_yes: number | null
          voting_ends_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          full_content?: string | null
          id?: string
          proposal_type: Database["public"]["Enums"]["proposal_type"]
          proposer_id: string
          proposer_territory_id?: string | null
          result_entity_id?: string | null
          result_entity_type?: string | null
          space_id: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title: string
          topic_id?: string | null
          updated_at?: string
          votes_abstain?: number | null
          votes_no?: number | null
          votes_yes?: number | null
          voting_ends_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          full_content?: string | null
          id?: string
          proposal_type?: Database["public"]["Enums"]["proposal_type"]
          proposer_id?: string
          proposer_territory_id?: string | null
          result_entity_id?: string | null
          result_entity_type?: string | null
          space_id?: string
          status?: Database["public"]["Enums"]["proposal_status"]
          title?: string
          topic_id?: string | null
          updated_at?: string
          votes_abstain?: number | null
          votes_no?: number | null
          votes_yes?: number | null
          voting_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formal_proposals_proposer_territory_id_fkey"
            columns: ["proposer_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_proposals_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "discussion_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_proposals_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "discussion_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      geopolitical_blocs: {
        Row: {
          charter: string | null
          created_at: string
          description: string | null
          founded_at: string | null
          founder_territory_id: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          charter?: string | null
          created_at?: string
          description?: string | null
          founded_at?: string | null
          founder_territory_id?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          charter?: string | null
          created_at?: string
          description?: string | null
          founded_at?: string | null
          founder_territory_id?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geopolitical_blocs_founder_territory_id_fkey"
            columns: ["founder_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      law_templates: {
        Row: {
          base_repulsion: number
          base_sympathy: number
          category: string
          created_at: string
          description: string | null
          economic_impact: number
          full_text: string | null
          id: string
          is_constitution: boolean
          legal_level: Database["public"]["Enums"]["legal_level"]
          military_impact: number
          name: string
          negative_effects: Json
          positive_effects: Json
          prerequisites: Json
          social_impact: number
          territorial_impact: number
        }
        Insert: {
          base_repulsion?: number
          base_sympathy?: number
          category: string
          created_at?: string
          description?: string | null
          economic_impact?: number
          full_text?: string | null
          id?: string
          is_constitution?: boolean
          legal_level: Database["public"]["Enums"]["legal_level"]
          military_impact?: number
          name: string
          negative_effects?: Json
          positive_effects?: Json
          prerequisites?: Json
          social_impact?: number
          territorial_impact?: number
        }
        Update: {
          base_repulsion?: number
          base_sympathy?: number
          category?: string
          created_at?: string
          description?: string | null
          economic_impact?: number
          full_text?: string | null
          id?: string
          is_constitution?: boolean
          legal_level?: Database["public"]["Enums"]["legal_level"]
          military_impact?: number
          name?: string
          negative_effects?: Json
          positive_effects?: Json
          prerequisites?: Json
          social_impact?: number
          territorial_impact?: number
        }
        Relationships: []
      }
      laws: {
        Row: {
          bloc_id: string | null
          category: string
          created_at: string
          description: string | null
          economic_impact: number
          enacted_at: string | null
          full_text: string | null
          id: string
          is_constitution: boolean
          legal_conflicts: Json
          legal_level: Database["public"]["Enums"]["legal_level"]
          military_impact: number
          name: string
          negative_effects: Json
          population_repulsion: number
          population_sympathy: number
          positive_effects: Json
          prerequisites: Json
          proposed_by: string | null
          repealed_at: string | null
          social_impact: number
          status: Database["public"]["Enums"]["law_status"]
          territorial_impact: number
          territory_id: string | null
          updated_at: string
        }
        Insert: {
          bloc_id?: string | null
          category: string
          created_at?: string
          description?: string | null
          economic_impact?: number
          enacted_at?: string | null
          full_text?: string | null
          id?: string
          is_constitution?: boolean
          legal_conflicts?: Json
          legal_level: Database["public"]["Enums"]["legal_level"]
          military_impact?: number
          name: string
          negative_effects?: Json
          population_repulsion?: number
          population_sympathy?: number
          positive_effects?: Json
          prerequisites?: Json
          proposed_by?: string | null
          repealed_at?: string | null
          social_impact?: number
          status?: Database["public"]["Enums"]["law_status"]
          territorial_impact?: number
          territory_id?: string | null
          updated_at?: string
        }
        Update: {
          bloc_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          economic_impact?: number
          enacted_at?: string | null
          full_text?: string | null
          id?: string
          is_constitution?: boolean
          legal_conflicts?: Json
          legal_level?: Database["public"]["Enums"]["legal_level"]
          military_impact?: number
          name?: string
          negative_effects?: Json
          population_repulsion?: number
          population_sympathy?: number
          positive_effects?: Json
          prerequisites?: Json
          proposed_by?: string | null
          repealed_at?: string | null
          social_impact?: number
          status?: Database["public"]["Enums"]["law_status"]
          territorial_impact?: number
          territory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "laws_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "geopolitical_blocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laws_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_history: {
        Row: {
          action: string
          bloc_id: string | null
          created_at: string
          description: string | null
          id: string
          law_id: string | null
          new_status: Database["public"]["Enums"]["law_status"] | null
          old_status: Database["public"]["Enums"]["law_status"] | null
          performed_by: string | null
          territory_id: string | null
        }
        Insert: {
          action: string
          bloc_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          law_id?: string | null
          new_status?: Database["public"]["Enums"]["law_status"] | null
          old_status?: Database["public"]["Enums"]["law_status"] | null
          performed_by?: string | null
          territory_id?: string | null
        }
        Update: {
          action?: string
          bloc_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          law_id?: string | null
          new_status?: Database["public"]["Enums"]["law_status"] | null
          old_status?: Database["public"]["Enums"]["law_status"] | null
          performed_by?: string | null
          territory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_history_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "geopolitical_blocs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_history_law_id_fkey"
            columns: ["law_id"]
            isOneToOne: false
            referencedRelation: "laws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_history_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          created_at: string
          filled_quantity: number
          id: string
          listing_type: Database["public"]["Enums"]["listing_type"]
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id: string | null
          seller_user_id: string
          status: Database["public"]["Enums"]["listing_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          filled_quantity?: number
          id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id?: string | null
          seller_user_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          filled_quantity?: number
          id?: string
          listing_type?: Database["public"]["Enums"]["listing_type"]
          price_per_unit?: number
          quantity?: number
          resource_type?: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id?: string | null
          seller_user_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_seller_territory_id_fkey"
            columns: ["seller_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      parliamentary_votes: {
        Row: {
          bloc_id: string | null
          created_at: string
          description: string | null
          id: string
          legal_level: Database["public"]["Enums"]["legal_level"]
          result: string | null
          status: string
          subject_id: string
          title: string
          total_eligible: number
          updated_at: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          votes_abstain: number
          votes_no: number
          votes_yes: number
          voting_ends_at: string
          voting_starts_at: string
        }
        Insert: {
          bloc_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_level: Database["public"]["Enums"]["legal_level"]
          result?: string | null
          status?: string
          subject_id: string
          title: string
          total_eligible?: number
          updated_at?: string
          vote_type: Database["public"]["Enums"]["vote_type"]
          votes_abstain?: number
          votes_no?: number
          votes_yes?: number
          voting_ends_at: string
          voting_starts_at?: string
        }
        Update: {
          bloc_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legal_level?: Database["public"]["Enums"]["legal_level"]
          result?: string | null
          status?: string
          subject_id?: string
          title?: string
          total_eligible?: number
          updated_at?: string
          vote_type?: Database["public"]["Enums"]["vote_type"]
          votes_abstain?: number
          votes_no?: number
          votes_yes?: number
          voting_ends_at?: string
          voting_starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parliamentary_votes_bloc_id_fkey"
            columns: ["bloc_id"]
            isOneToOne: false
            referencedRelation: "geopolitical_blocs"
            referencedColumns: ["id"]
          },
        ]
      }
      planetary_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      planetary_eras: {
        Row: {
          cells_unlocked: number
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          started_at: string | null
          updated_at: string
        }
        Insert: {
          cells_unlocked?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          cells_unlocked?: number
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      planetary_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_active: boolean
          pd_reward: number
          pi_reward: number
          region_id: string | null
          start_date: string | null
          title: string
          token_reward_amount: number | null
          token_reward_type: Database["public"]["Enums"]["token_type"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_active?: boolean
          pd_reward?: number
          pi_reward?: number
          region_id?: string | null
          start_date?: string | null
          title: string
          token_reward_amount?: number | null
          token_reward_type?: Database["public"]["Enums"]["token_type"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_active?: boolean
          pd_reward?: number
          pi_reward?: number
          region_id?: string | null
          start_date?: string | null
          title?: string
          token_reward_amount?: number | null
          token_reward_type?: Database["public"]["Enums"]["token_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planetary_events_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      population_stats: {
        Row: {
          created_at: string
          growth_rate: number
          id: string
          migration_in: number
          migration_out: number
          rural_population: number
          territory_id: string | null
          tick_number: number
          urban_population: number
        }
        Insert: {
          created_at?: string
          growth_rate?: number
          id?: string
          migration_in?: number
          migration_out?: number
          rural_population?: number
          territory_id?: string | null
          tick_number: number
          urban_population?: number
        }
        Update: {
          created_at?: string
          growth_rate?: number
          id?: string
          migration_in?: number
          migration_out?: number
          rural_population?: number
          territory_id?: string | null
          tick_number?: number
          urban_population?: number
        }
        Relationships: [
          {
            foreignKeyName: "population_stats_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: number
          development_points: number
          id: string
          influence_points: number
          research_points: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: number
          development_points?: number
          id: string
          influence_points?: number
          research_points?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: number
          development_points?: number
          id?: string
          influence_points?: number
          research_points?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      project_participants: {
        Row: {
          contribution_points: number
          id: string
          joined_at: string
          project_id: string
          territory_id: string | null
          user_id: string
        }
        Insert: {
          contribution_points?: number
          id?: string
          joined_at?: string
          project_id: string
          territory_id?: string | null
          user_id: string
        }
        Update: {
          contribution_points?: number
          id?: string
          joined_at?: string
          project_id?: string
          territory_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "exploration_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_participants_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["region_difficulty"]
          id: string
          is_visible: boolean
          name: string
          required_research_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["region_difficulty"]
          id?: string
          is_visible?: boolean
          name: string
          required_research_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["region_difficulty"]
          id?: string
          is_visible?: boolean
          name?: string
          required_research_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      research_contributions: {
        Row: {
          created_at: string
          id: string
          points_contributed: number
          project_id: string
          territory_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_contributed?: number
          project_id: string
          territory_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_contributed?: number
          project_id?: string
          territory_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_contributions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_contributions_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          cost_research_points_total: number
          created_at: string
          created_by_territory_id: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          is_global: boolean
          name: string
          progress_research_points: number
          status: Database["public"]["Enums"]["research_project_status"]
          target_region_id: string | null
          updated_at: string
        }
        Insert: {
          cost_research_points_total?: number
          created_at?: string
          created_by_territory_id?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
          progress_research_points?: number
          status?: Database["public"]["Enums"]["research_project_status"]
          target_region_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_research_points_total?: number
          created_at?: string
          created_by_territory_id?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
          progress_research_points?: number
          status?: Database["public"]["Enums"]["research_project_status"]
          target_region_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_created_by_territory_id_fkey"
            columns: ["created_by_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_projects_target_region_id_fkey"
            columns: ["target_region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_balances: {
        Row: {
          energy: number
          food: number
          id: string
          minerals: number
          tech: number
          territory_id: string
          tick_number: number
          updated_at: string
        }
        Insert: {
          energy?: number
          food?: number
          id?: string
          minerals?: number
          tech?: number
          territory_id: string
          tick_number?: number
          updated_at?: string
        }
        Update: {
          energy?: number
          food?: number
          id?: string
          minerals?: number
          tech?: number
          territory_id?: string
          tick_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_balances_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: true
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_market: {
        Row: {
          base_price: number
          created_at: string
          current_price: number
          demand: number
          id: string
          price_volatility: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          supply: number
          updated_at: string
        }
        Insert: {
          base_price: number
          created_at?: string
          current_price: number
          demand?: number
          id?: string
          price_volatility?: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          supply?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          current_price?: number
          demand?: number
          id?: string
          price_volatility?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          supply?: number
          updated_at?: string
        }
        Relationships: []
      }
      resource_orders: {
        Row: {
          created_at: string
          filled_quantity: number
          id: string
          order_type: string
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          status: string
          territory_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filled_quantity?: number
          id?: string
          order_type: string
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          status?: string
          territory_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filled_quantity?: number
          id?: string
          order_type?: string
          price_per_unit?: number
          quantity?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          status?: string
          territory_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_orders_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      room_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_territory_id: string
          room_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_territory_id: string
          room_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_territory_id?: string
          room_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_invitations_invited_territory_id_fkey"
            columns: ["invited_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_invitations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "discussion_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          accepted_statute: boolean
          admin_style: string | null
          capital_city_id: string | null
          created_at: string
          demonym: string | null
          economy_rating: number
          flag_url: string | null
          government_type: Database["public"]["Enums"]["government_type"]
          id: string
          is_neutral: boolean
          level: Database["public"]["Enums"]["territory_level"]
          lore: string | null
          motto: string | null
          name: string
          official_color: string | null
          owner_id: string | null
          pd_points: number
          pi_points: number
          region_id: string | null
          research_bonus: number
          stability: number
          status: Database["public"]["Enums"]["territory_status"]
          style: Database["public"]["Enums"]["territory_style"]
          total_rural_population: number
          total_urban_population: number
          treasury: number
          updated_at: string
          vocation: string | null
        }
        Insert: {
          accepted_statute?: boolean
          admin_style?: string | null
          capital_city_id?: string | null
          created_at?: string
          demonym?: string | null
          economy_rating?: number
          flag_url?: string | null
          government_type?: Database["public"]["Enums"]["government_type"]
          id?: string
          is_neutral?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          lore?: string | null
          motto?: string | null
          name: string
          official_color?: string | null
          owner_id?: string | null
          pd_points?: number
          pi_points?: number
          region_id?: string | null
          research_bonus?: number
          stability?: number
          status?: Database["public"]["Enums"]["territory_status"]
          style?: Database["public"]["Enums"]["territory_style"]
          total_rural_population?: number
          total_urban_population?: number
          treasury?: number
          updated_at?: string
          vocation?: string | null
        }
        Update: {
          accepted_statute?: boolean
          admin_style?: string | null
          capital_city_id?: string | null
          created_at?: string
          demonym?: string | null
          economy_rating?: number
          flag_url?: string | null
          government_type?: Database["public"]["Enums"]["government_type"]
          id?: string
          is_neutral?: boolean
          level?: Database["public"]["Enums"]["territory_level"]
          lore?: string | null
          motto?: string | null
          name?: string
          official_color?: string | null
          owner_id?: string | null
          pd_points?: number
          pi_points?: number
          region_id?: string | null
          research_bonus?: number
          stability?: number
          status?: Database["public"]["Enums"]["territory_status"]
          style?: Database["public"]["Enums"]["territory_style"]
          total_rural_population?: number
          total_urban_population?: number
          treasury?: number
          updated_at?: string
          vocation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territories_capital_city_id_fkey"
            columns: ["capital_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territories_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          pd_change: number
          pi_change: number
          planetary_event_id: string | null
          territory_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          pd_change?: number
          pi_change?: number
          planetary_event_id?: string | null
          territory_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          pd_change?: number
          pi_change?: number
          planetary_event_id?: string | null
          territory_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_events_planetary_event_id_fkey"
            columns: ["planetary_event_id"]
            isOneToOne: false
            referencedRelation: "planetary_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_events_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_research: {
        Row: {
          created_at: string
          id: string
          research_points: number
          research_rate: number
          territory_id: string
          total_research_generated: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          research_points?: number
          research_rate?: number
          territory_id: string
          total_research_generated?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          research_points?: number
          research_rate?: number
          territory_id?: string
          total_research_generated?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_research_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: true
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_resources: {
        Row: {
          amount: number
          consumption_rate: number
          created_at: string
          id: string
          production_rate: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          territory_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          consumption_rate?: number
          created_at?: string
          id?: string
          production_rate?: number
          resource_type: Database["public"]["Enums"]["resource_type"]
          territory_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          consumption_rate?: number
          created_at?: string
          id?: string
          production_rate?: number
          resource_type?: Database["public"]["Enums"]["resource_type"]
          territory_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_resources_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_transfers: {
        Row: {
          cell_id: string | null
          created_at: string
          from_territory_id: string | null
          id: string
          notes: string | null
          price: number | null
          territory_id: string | null
          to_territory_id: string | null
          transfer_type: string
          treaty_id: string | null
          war_id: string | null
        }
        Insert: {
          cell_id?: string | null
          created_at?: string
          from_territory_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          territory_id?: string | null
          to_territory_id?: string | null
          transfer_type: string
          treaty_id?: string | null
          war_id?: string | null
        }
        Update: {
          cell_id?: string | null
          created_at?: string
          from_territory_id?: string | null
          id?: string
          notes?: string | null
          price?: number | null
          territory_id?: string | null
          to_territory_id?: string | null
          transfer_type?: string
          treaty_id?: string | null
          war_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "territory_transfers_cell_id_fkey"
            columns: ["cell_id"]
            isOneToOne: false
            referencedRelation: "cells"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_transfers_from_territory_id_fkey"
            columns: ["from_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_transfers_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_transfers_to_territory_id_fkey"
            columns: ["to_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_transfers_treaty_id_fkey"
            columns: ["treaty_id"]
            isOneToOne: false
            referencedRelation: "treaties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_transfers_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "wars"
            referencedColumns: ["id"]
          },
        ]
      }
      tick_logs: {
        Row: {
          cities_processed: number | null
          completed_at: string | null
          error_message: string | null
          events_generated: number | null
          id: string
          research_projects_completed: number | null
          started_at: string
          status: string
          summary: Json | null
          territories_processed: number | null
          tick_number: number
        }
        Insert: {
          cities_processed?: number | null
          completed_at?: string | null
          error_message?: string | null
          events_generated?: number | null
          id?: string
          research_projects_completed?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          territories_processed?: number | null
          tick_number: number
        }
        Update: {
          cities_processed?: number | null
          completed_at?: string | null
          error_message?: string | null
          events_generated?: number | null
          id?: string
          research_projects_completed?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          territories_processed?: number | null
          tick_number?: number
        }
        Relationships: []
      }
      token_market: {
        Row: {
          available_quantity: number
          created_at: string
          id: string
          is_active: boolean
          price_per_unit: number
          token_type: string
          total_sold: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          price_per_unit: number
          token_type: string
          total_sold?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          price_per_unit?: number
          token_type?: string
          total_sold?: number
          updated_at?: string
        }
        Relationships: []
      }
      token_purchases: {
        Row: {
          created_at: string
          id: string
          price_paid: number
          quantity: number
          token_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_paid: number
          quantity: number
          token_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_paid?: number
          quantity?: number
          token_type?: string
          user_id?: string
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          admin_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string | null
          token_type: Database["public"]["Enums"]["token_type"]
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason?: string | null
          token_type: Database["public"]["Enums"]["token_type"]
          user_id: string
        }
        Update: {
          admin_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string | null
          token_type?: Database["public"]["Enums"]["token_type"]
          user_id?: string
        }
        Relationships: []
      }
      trade_deals: {
        Row: {
          created_at: string
          from_territory_id: string
          from_user_id: string
          id: string
          offer: Json
          request: Json
          status: Database["public"]["Enums"]["trade_deal_status"]
          to_territory_id: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_territory_id: string
          from_user_id: string
          id?: string
          offer?: Json
          request?: Json
          status?: Database["public"]["Enums"]["trade_deal_status"]
          to_territory_id: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_territory_id?: string
          from_user_id?: string
          id?: string
          offer?: Json
          request?: Json
          status?: Database["public"]["Enums"]["trade_deal_status"]
          to_territory_id?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_deals_from_territory_id_fkey"
            columns: ["from_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_deals_to_territory_id_fkey"
            columns: ["to_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          buyer_territory_id: string | null
          buyer_user_id: string
          created_at: string
          id: string
          listing_id: string | null
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id: string | null
          seller_user_id: string
          total_price: number
        }
        Insert: {
          buyer_territory_id?: string | null
          buyer_user_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          price_per_unit: number
          quantity: number
          resource_type: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id?: string | null
          seller_user_id: string
          total_price: number
        }
        Update: {
          buyer_territory_id?: string | null
          buyer_user_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          price_per_unit?: number
          quantity?: number
          resource_type?: Database["public"]["Enums"]["market_resource_type"]
          seller_territory_id?: string | null
          seller_user_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "trade_history_buyer_territory_id_fkey"
            columns: ["buyer_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_history_seller_territory_id_fkey"
            columns: ["seller_territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      treaties: {
        Row: {
          accepted_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          proposed_by: string
          starts_at: string | null
          status: string
          terms: string | null
          territory_a_id: string
          territory_b_id: string
          title: string
          treaty_type: Database["public"]["Enums"]["treaty_type"]
          updated_at: string
        }
        Insert: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          proposed_by: string
          starts_at?: string | null
          status?: string
          terms?: string | null
          territory_a_id: string
          territory_b_id: string
          title: string
          treaty_type: Database["public"]["Enums"]["treaty_type"]
          updated_at?: string
        }
        Update: {
          accepted_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          proposed_by?: string
          starts_at?: string | null
          status?: string
          terms?: string | null
          territory_a_id?: string
          territory_b_id?: string
          title?: string
          treaty_type?: Database["public"]["Enums"]["treaty_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treaties_territory_a_id_fkey"
            columns: ["territory_a_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treaties_territory_b_id_fkey"
            columns: ["territory_b_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tokens: {
        Row: {
          city_tokens: number
          created_at: string
          id: string
          land_tokens: number
          state_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city_tokens?: number
          created_at?: string
          id?: string
          land_tokens?: number
          state_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city_tokens?: number
          created_at?: string
          id?: string
          land_tokens?: number
          state_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vote_records: {
        Row: {
          choice: Database["public"]["Enums"]["vote_choice"]
          id: string
          reason: string | null
          territory_id: string
          vote_id: string
          voted_at: string
          voter_id: string
        }
        Insert: {
          choice: Database["public"]["Enums"]["vote_choice"]
          id?: string
          reason?: string | null
          territory_id: string
          vote_id: string
          voted_at?: string
          voter_id: string
        }
        Update: {
          choice?: Database["public"]["Enums"]["vote_choice"]
          id?: string
          reason?: string | null
          territory_id?: string
          vote_id?: string
          voted_at?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_records_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_records_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "parliamentary_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      war_battles: {
        Row: {
          attacker_damage: number
          attacker_roll: number
          attacker_strength: number
          battle_log: string | null
          created_at: string
          cycle_number: number
          defender_damage: number
          defender_roll: number
          defender_strength: number
          id: string
          war_id: string
          winner: string | null
        }
        Insert: {
          attacker_damage: number
          attacker_roll: number
          attacker_strength: number
          battle_log?: string | null
          created_at?: string
          cycle_number: number
          defender_damage: number
          defender_roll: number
          defender_strength: number
          id?: string
          war_id: string
          winner?: string | null
        }
        Update: {
          attacker_damage?: number
          attacker_roll?: number
          attacker_strength?: number
          battle_log?: string | null
          created_at?: string
          cycle_number?: number
          defender_damage?: number
          defender_roll?: number
          defender_strength?: number
          id?: string
          war_id?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "war_battles_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "wars"
            referencedColumns: ["id"]
          },
        ]
      }
      war_turn_logs: {
        Row: {
          attacker_power: number
          created_at: string
          defender_power: number
          id: string
          result_summary: string | null
          tick_number: number
          war_id: string
        }
        Insert: {
          attacker_power?: number
          created_at?: string
          defender_power?: number
          id?: string
          result_summary?: string | null
          tick_number: number
          war_id: string
        }
        Update: {
          attacker_power?: number
          created_at?: string
          defender_power?: number
          id?: string
          result_summary?: string | null
          tick_number?: number
          war_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "war_turn_logs_war_id_fkey"
            columns: ["war_id"]
            isOneToOne: false
            referencedRelation: "wars"
            referencedColumns: ["id"]
          },
        ]
      }
      wars: {
        Row: {
          attacker_id: string
          attacker_resources_spent: number
          attacker_war_score: number
          created_at: string
          cycles_elapsed: number
          declared_at: string
          defender_id: string
          defender_resources_spent: number
          defender_war_score: number
          description: string | null
          ended_at: string | null
          id: string
          max_cycles: number
          status: Database["public"]["Enums"]["war_status"]
          target_cells: Json | null
          title: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          attacker_id: string
          attacker_resources_spent?: number
          attacker_war_score?: number
          created_at?: string
          cycles_elapsed?: number
          declared_at?: string
          defender_id: string
          defender_resources_spent?: number
          defender_war_score?: number
          description?: string | null
          ended_at?: string | null
          id?: string
          max_cycles?: number
          status?: Database["public"]["Enums"]["war_status"]
          target_cells?: Json | null
          title: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          attacker_id?: string
          attacker_resources_spent?: number
          attacker_war_score?: number
          created_at?: string
          cycles_elapsed?: number
          declared_at?: string
          defender_id?: string
          defender_resources_spent?: number
          defender_war_score?: number
          description?: string | null
          ended_at?: string | null
          id?: string
          max_cycles?: number
          status?: Database["public"]["Enums"]["war_status"]
          target_cells?: Json | null
          title?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wars_attacker_id_fkey"
            columns: ["attacker_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wars_defender_id_fkey"
            columns: ["defender_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wars_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      world_config: {
        Row: {
          active_rural_population: number
          active_urban_population: number
          cell_size_km2_default: number
          created_at: string
          id: string
          initial_playable_land_km2: number
          last_tick_at: string | null
          latent_population: number
          max_listings_per_territory: number
          max_urban_ratio: number
          season_day: number
          tick_interval_hours: number
          total_planet_land_km2: number
          total_planet_population: number
          total_ticks: number | null
          updated_at: string
        }
        Insert: {
          active_rural_population?: number
          active_urban_population?: number
          cell_size_km2_default?: number
          created_at?: string
          id?: string
          initial_playable_land_km2?: number
          last_tick_at?: string | null
          latent_population?: number
          max_listings_per_territory?: number
          max_urban_ratio?: number
          season_day?: number
          tick_interval_hours?: number
          total_planet_land_km2?: number
          total_planet_population?: number
          total_ticks?: number | null
          updated_at?: string
        }
        Update: {
          active_rural_population?: number
          active_urban_population?: number
          cell_size_km2_default?: number
          created_at?: string
          id?: string
          initial_playable_land_km2?: number
          last_tick_at?: string | null
          latent_population?: number
          max_listings_per_territory?: number
          max_urban_ratio?: number
          season_day?: number
          tick_interval_hours?: number
          total_planet_land_km2?: number
          total_planet_population?: number
          total_ticks?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_region_cells: {
        Args: { p_num_cells?: number; p_region_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_market_order: {
        Args: {
          p_filled_quantity: number
          p_listing_id: string
          p_listing_type: string
          p_price_per_unit: number
          p_quantity: number
          p_resource_type: string
          p_seller_territory_id: string
          p_seller_user_id: string
        }
        Returns: {
          new_status: string
          remaining_quantity: number
          trades_executed: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cell_status: "blocked" | "explored" | "colonized"
      cell_type: "rural" | "urban" | "neutral" | "blocked"
      city_status: "free" | "occupied" | "neutral"
      diplomatic_status:
        | "peace"
        | "tension"
        | "cold_war"
        | "war"
        | "alliance"
        | "trade_partner"
      discussion_space_type:
        | "planetary_council"
        | "bloc_council"
        | "trade_chamber"
        | "private_room"
      event_type: "global" | "regional" | "crisis" | "conference" | "war"
      government_type:
        | "monarchy"
        | "republic"
        | "theocracy"
        | "oligarchy"
        | "democracy"
        | "dictatorship"
      law_status:
        | "draft"
        | "proposed"
        | "voting"
        | "enacted"
        | "repealed"
        | "vetoed"
      legal_level: "planetary" | "bloc" | "national"
      listing_status: "open" | "partially_filled" | "filled" | "cancelled"
      listing_type: "sell" | "buy"
      market_resource_type:
        | "food"
        | "energy"
        | "minerals"
        | "tech"
        | "token_city"
        | "token_land"
        | "token_state"
      proposal_status:
        | "draft"
        | "open"
        | "voting"
        | "approved"
        | "rejected"
        | "executed"
      proposal_type:
        | "law"
        | "treaty"
        | "bloc_creation"
        | "trade_deal"
        | "sanction"
        | "era_change"
        | "other"
      region_difficulty: "easy" | "medium" | "hard" | "extreme" | "anomaly"
      research_project_status: "active" | "completed" | "cancelled"
      resource_type: "food" | "energy" | "minerals" | "technology" | "influence"
      territory_level:
        | "colony"
        | "autonomous"
        | "recognized"
        | "kingdom"
        | "power"
      territory_status:
        | "pending"
        | "approved"
        | "rejected"
        | "active"
        | "inactive"
      territory_style: "cultural" | "commercial" | "technological" | "military"
      token_type: "city" | "land" | "state"
      trade_deal_status:
        | "proposed"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      treaty_type:
        | "peace"
        | "trade"
        | "alliance"
        | "non_aggression"
        | "research"
        | "territorial"
      vote_choice: "yes" | "no" | "abstain"
      vote_type:
        | "constitution"
        | "law"
        | "bloc_creation"
        | "sanction"
        | "era_change"
        | "bloc_charter"
        | "bloc_law"
      war_game_status: "declared" | "ongoing" | "resolved"
      war_status: "declared" | "active" | "ceasefire" | "ended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      cell_status: ["blocked", "explored", "colonized"],
      cell_type: ["rural", "urban", "neutral", "blocked"],
      city_status: ["free", "occupied", "neutral"],
      diplomatic_status: [
        "peace",
        "tension",
        "cold_war",
        "war",
        "alliance",
        "trade_partner",
      ],
      discussion_space_type: [
        "planetary_council",
        "bloc_council",
        "trade_chamber",
        "private_room",
      ],
      event_type: ["global", "regional", "crisis", "conference", "war"],
      government_type: [
        "monarchy",
        "republic",
        "theocracy",
        "oligarchy",
        "democracy",
        "dictatorship",
      ],
      law_status: [
        "draft",
        "proposed",
        "voting",
        "enacted",
        "repealed",
        "vetoed",
      ],
      legal_level: ["planetary", "bloc", "national"],
      listing_status: ["open", "partially_filled", "filled", "cancelled"],
      listing_type: ["sell", "buy"],
      market_resource_type: [
        "food",
        "energy",
        "minerals",
        "tech",
        "token_city",
        "token_land",
        "token_state",
      ],
      proposal_status: [
        "draft",
        "open",
        "voting",
        "approved",
        "rejected",
        "executed",
      ],
      proposal_type: [
        "law",
        "treaty",
        "bloc_creation",
        "trade_deal",
        "sanction",
        "era_change",
        "other",
      ],
      region_difficulty: ["easy", "medium", "hard", "extreme", "anomaly"],
      research_project_status: ["active", "completed", "cancelled"],
      resource_type: ["food", "energy", "minerals", "technology", "influence"],
      territory_level: [
        "colony",
        "autonomous",
        "recognized",
        "kingdom",
        "power",
      ],
      territory_status: [
        "pending",
        "approved",
        "rejected",
        "active",
        "inactive",
      ],
      territory_style: ["cultural", "commercial", "technological", "military"],
      token_type: ["city", "land", "state"],
      trade_deal_status: [
        "proposed",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      treaty_type: [
        "peace",
        "trade",
        "alliance",
        "non_aggression",
        "research",
        "territorial",
      ],
      vote_choice: ["yes", "no", "abstain"],
      vote_type: [
        "constitution",
        "law",
        "bloc_creation",
        "sanction",
        "era_change",
        "bloc_charter",
        "bloc_law",
      ],
      war_game_status: ["declared", "ongoing", "resolved"],
      war_status: ["declared", "active", "ceasefire", "ended"],
    },
  },
} as const
