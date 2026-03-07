export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      beta_usage_analytics: {
        Row: {
          action_type: string
          created_at: string | null
          credits_would_cost: number | null
          feature: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          credits_would_cost?: number | null
          feature?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          credits_would_cost?: number | null
          feature?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_usage_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_deadlines: {
        Row: {
          case_matter_id: string
          created_at: string | null
          deadline_date: string
          deadline_type: string
          description: string | null
          id: string
          is_completed: boolean | null
          reminder_days: number[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          case_matter_id: string
          created_at?: string | null
          deadline_date: string
          deadline_type: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_days?: number[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          case_matter_id?: string
          created_at?: string | null
          deadline_date?: string
          deadline_type?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_days?: number[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_deadlines_case_matter_id_fkey"
            columns: ["case_matter_id"]
            isOneToOne: false
            referencedRelation: "case_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_deadlines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_matters: {
        Row: {
          case_number: string | null
          case_type: string
          court_level: string
          court_name: string | null
          created_at: string | null
          description: string | null
          filing_date: string | null
          id: string
          lawyer_id: string | null
          next_hearing_date: string | null
          opposing_counsel: string | null
          opposing_party: string | null
          practice_area: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          case_number?: string | null
          case_type: string
          court_level: string
          court_name?: string | null
          created_at?: string | null
          description?: string | null
          filing_date?: string | null
          id?: string
          lawyer_id?: string | null
          next_hearing_date?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          practice_area: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          case_number?: string | null
          case_type?: string
          court_level?: string
          court_name?: string | null
          created_at?: string | null
          description?: string | null
          filing_date?: string | null
          id?: string
          lawyer_id?: string | null
          next_hearing_date?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          practice_area?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_matters_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_matters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          case_matter_id: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          practice_area: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          case_matter_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          practice_area?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          case_matter_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          practice_area?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_case_matter_id_fkey"
            columns: ["case_matter_id"]
            isOneToOne: false
            referencedRelation: "case_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          feature: string
          id: string
          metadata: Json | null
          rating: number | null
          response_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          feature: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          response_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          feature?: string
          id?: string
          metadata?: Json | null
          rating?: number | null
          response_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          fts: unknown
          id: string
          metadata: Json | null
          section_ref: string | null
          source_title: string
          source_type: string
          summary: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          section_ref?: string | null
          source_title: string
          source_type: string
          summary?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          metadata?: Json | null
          section_ref?: string | null
          source_title?: string
          source_type?: string
          summary?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          ai_summary: string | null
          case_matter_id: string | null
          content: string | null
          created_at: string | null
          document_type: string
          file_id: string | null
          file_size: number | null
          file_url: string | null
          generation_method: string | null
          id: string
          mime_type: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          case_matter_id?: string | null
          content?: string | null
          created_at?: string | null
          document_type: string
          file_id?: string | null
          file_size?: number | null
          file_url?: string | null
          generation_method?: string | null
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          case_matter_id?: string | null
          content?: string | null
          created_at?: string | null
          document_type?: string
          file_id?: string | null
          file_size?: number | null
          file_url?: string | null
          generation_method?: string | null
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_case_matter_id_fkey"
            columns: ["case_matter_id"]
            isOneToOne: false
            referencedRelation: "case_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_model: string | null
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_credits: number | null
          avatar_url: string | null
          bar_council_id: string | null
          bio: string | null
          consultation_fee: number | null
          courts_practiced: string[] | null
          created_at: string | null
          email: string
          experience_years: number | null
          full_name: string
          id: string
          is_verified: boolean | null
          languages: string[] | null
          phone: string | null
          practice_areas: string[] | null
          rating: number | null
          role: string
          subscription_tier: string | null
          total_cases: number | null
          updated_at: string | null
          win_rate: number | null
        }
        Insert: {
          ai_credits?: number | null
          avatar_url?: string | null
          bar_council_id?: string | null
          bio?: string | null
          consultation_fee?: number | null
          courts_practiced?: string[] | null
          created_at?: string | null
          email: string
          experience_years?: number | null
          full_name: string
          id: string
          is_verified?: boolean | null
          languages?: string[] | null
          phone?: string | null
          practice_areas?: string[] | null
          rating?: number | null
          role?: string
          subscription_tier?: string | null
          total_cases?: number | null
          updated_at?: string | null
          win_rate?: number | null
        }
        Update: {
          ai_credits?: number | null
          avatar_url?: string | null
          bar_council_id?: string | null
          bio?: string | null
          consultation_fee?: number | null
          courts_practiced?: string[] | null
          created_at?: string | null
          email?: string
          experience_years?: number | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          languages?: string[] | null
          phone?: string | null
          practice_areas?: string[] | null
          rating?: number | null
          role?: string
          subscription_tier?: string | null
          total_cases?: number | null
          updated_at?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      skill_generations: {
        Row: {
          anthropic_file_id: string | null
          case_matter_id: string | null
          created_at: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          output_format: string | null
          prompt: string
          skill_ids: string[]
          status: string | null
          tokens_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anthropic_file_id?: string | null
          case_matter_id?: string | null
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          output_format?: string | null
          prompt: string
          skill_ids: string[]
          status?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anthropic_file_id?: string | null
          case_matter_id?: string | null
          created_at?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          output_format?: string | null
          prompt?: string
          skill_ids?: string[]
          status?: string | null
          tokens_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_generations_case_matter_id_fkey"
            columns: ["case_matter_id"]
            isOneToOne: false
            referencedRelation: "case_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

