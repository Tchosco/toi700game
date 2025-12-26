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
      cells: {
        Row: {
          area_km2: number
          cell_type: Database["public"]["Enums"]["cell_type"]
          city_id: string | null
          colonized_at: string | null
          colonized_by: string | null
          created_at: string
          explored_at: string | null
          explored_by: string | null
          id: string
          owner_territory_id: string | null
          region_id: string | null
          status: Database["public"]["Enums"]["cell_status"]
          unlock_reason: string | null
          unlocked_by_era_id: string | null
          updated_at: string
        }
        Insert: {
          area_km2?: number
          cell_type?: Database["public"]["Enums"]["cell_type"]
          city_id?: string | null
          colonized_at?: string | null
          colonized_by?: string | null
          created_at?: string
          explored_at?: string | null
          explored_by?: string | null
          id?: string
          owner_territory_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["cell_status"]
          unlock_reason?: string | null
          unlocked_by_era_id?: string | null
          updated_at?: string
        }
        Update: {
          area_km2?: number
          cell_type?: Database["public"]["Enums"]["cell_type"]
          city_id?: string | null
          colonized_at?: string | null
          colonized_by?: string | null
          created_at?: string
          explored_at?: string | null
          explored_by?: string | null
          id?: string
          owner_territory_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["cell_status"]
          unlock_reason?: string | null
          unlocked_by_era_id?: string | null
          updated_at?: string
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
          region_id: string | null
          status: Database["public"]["Enums"]["city_status"]
          updated_at: string
        }
        Insert: {
          cell_id?: string | null
          created_at?: string
          id?: string
          is_neutral?: boolean
          name: string
          owner_territory_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["city_status"]
          updated_at?: string
        }
        Update: {
          cell_id?: string | null
          created_at?: string
          id?: string
          is_neutral?: boolean
          name?: string
          owner_territory_id?: string | null
          region_id?: string | null
          status?: Database["public"]["Enums"]["city_status"]
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
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
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      territories: {
        Row: {
          accepted_statute: boolean
          capital_city_id: string | null
          created_at: string
          flag_url: string | null
          government_type: Database["public"]["Enums"]["government_type"]
          id: string
          level: Database["public"]["Enums"]["territory_level"]
          lore: string | null
          name: string
          owner_id: string | null
          pd_points: number
          pi_points: number
          region_id: string | null
          status: Database["public"]["Enums"]["territory_status"]
          style: Database["public"]["Enums"]["territory_style"]
          updated_at: string
        }
        Insert: {
          accepted_statute?: boolean
          capital_city_id?: string | null
          created_at?: string
          flag_url?: string | null
          government_type?: Database["public"]["Enums"]["government_type"]
          id?: string
          level?: Database["public"]["Enums"]["territory_level"]
          lore?: string | null
          name: string
          owner_id?: string | null
          pd_points?: number
          pi_points?: number
          region_id?: string | null
          status?: Database["public"]["Enums"]["territory_status"]
          style?: Database["public"]["Enums"]["territory_style"]
          updated_at?: string
        }
        Update: {
          accepted_statute?: boolean
          capital_city_id?: string | null
          created_at?: string
          flag_url?: string | null
          government_type?: Database["public"]["Enums"]["government_type"]
          id?: string
          level?: Database["public"]["Enums"]["territory_level"]
          lore?: string | null
          name?: string
          owner_id?: string | null
          pd_points?: number
          pi_points?: number
          region_id?: string | null
          status?: Database["public"]["Enums"]["territory_status"]
          style?: Database["public"]["Enums"]["territory_style"]
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cell_status: "blocked" | "explored" | "colonized"
      cell_type: "rural" | "urban" | "neutral" | "blocked"
      city_status: "free" | "occupied" | "neutral"
      event_type: "global" | "regional" | "crisis" | "conference" | "war"
      government_type:
        | "monarchy"
        | "republic"
        | "theocracy"
        | "oligarchy"
        | "democracy"
        | "dictatorship"
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
      event_type: ["global", "regional", "crisis", "conference", "war"],
      government_type: [
        "monarchy",
        "republic",
        "theocracy",
        "oligarchy",
        "democracy",
        "dictatorship",
      ],
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
    },
  },
} as const
