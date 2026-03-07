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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          table_id: string | null
          table_name: string
          user_email: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          table_id?: string | null
          table_name: string
          user_email: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          table_id?: string | null
          table_name?: string
          user_email?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_flow_entries: {
        Row: {
          cliente: string | null
          created_at: string
          data: string
          grupo: string | null
          id: string
          nota: string | null
          operacao: string
          subgrupo: string | null
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          data?: string
          grupo?: string | null
          id?: string
          nota?: string | null
          operacao?: string
          subgrupo?: string | null
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          cliente?: string | null
          created_at?: string
          data?: string
          grupo?: string | null
          id?: string
          nota?: string | null
          operacao?: string
          subgrupo?: string | null
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_order: number
          column_type: string
          created_at: string
          display_name: string
          formula_config: Json | null
          id: string
          name: string
          table_id: string
        }
        Insert: {
          column_order?: number
          column_type?: string
          created_at?: string
          display_name: string
          formula_config?: Json | null
          id?: string
          name: string
          table_id: string
        }
        Update: {
          column_order?: number
          column_type?: string
          created_at?: string
          display_name?: string
          formula_config?: Json | null
          id?: string
          name?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_columns_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_data: {
        Row: {
          created_at: string
          data: Json
          id: string
          table_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          table_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          table_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_data_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tables: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_tables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "table_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      external_collection_settings: {
        Row: {
          allow_multiple_submissions: boolean
          created_at: string
          id: string
          is_enabled: boolean
          public_token: string
          respondent_field_label: string
          table_id: string
          updated_at: string
        }
        Insert: {
          allow_multiple_submissions?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          public_token: string
          respondent_field_label?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          allow_multiple_submissions?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          public_token?: string
          respondent_field_label?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_collection_settings_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      external_submissions: {
        Row: {
          id: string
          ip_hash: string | null
          respondent_identifier: string
          submitted_at: string
          table_id: string
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          respondent_identifier: string
          submitted_at?: string
          table_id: string
        }
        Update: {
          id?: string
          ip_hash?: string | null
          respondent_identifier?: string
          submitted_at?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_submissions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          conta: string | null
          created_at: string
          id: string
          link: string | null
          plataforma: string | null
          projeto: string | null
          updated_at: string
          user_id: string | null
          workspace: string | null
        }
        Insert: {
          conta?: string | null
          created_at?: string
          id?: string
          link?: string | null
          plataforma?: string | null
          projeto?: string | null
          updated_at?: string
          user_id?: string | null
          workspace?: string | null
        }
        Update: {
          conta?: string | null
          created_at?: string
          id?: string
          link?: string | null
          plataforma?: string | null
          projeto?: string | null
          updated_at?: string
          user_id?: string | null
          workspace?: string | null
        }
        Relationships: []
      }
      public_view_settings: {
        Row: {
          access_pin: string | null
          created_at: string
          filter_config: Json | null
          id: string
          is_enabled: boolean
          public_token: string
          table_id: string
          updated_at: string
          visible_columns: string[]
        }
        Insert: {
          access_pin?: string | null
          created_at?: string
          filter_config?: Json | null
          id?: string
          is_enabled?: boolean
          public_token: string
          table_id: string
          updated_at?: string
          visible_columns?: string[]
        }
        Update: {
          access_pin?: string | null
          created_at?: string
          filter_config?: Json | null
          id?: string
          is_enabled?: boolean
          public_token?: string
          table_id?: string
          updated_at?: string
          visible_columns?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "public_view_settings_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      table_projects: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      table_shares: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          permission: string
          shared_with_email: string
          shared_with_user_id: string | null
          table_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          permission?: string
          shared_with_email: string
          shared_with_user_id?: string | null
          table_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          permission?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_shares_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transfer_table_ownership: {
        Args: { p_new_owner_email: string; p_table_id: string }
        Returns: boolean
      }
      user_can_admin_table: {
        Args: { check_table_id: string }
        Returns: boolean
      }
      user_can_edit_table: {
        Args: { check_table_id: string }
        Returns: boolean
      }
      user_has_table_access: {
        Args: { check_table_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
