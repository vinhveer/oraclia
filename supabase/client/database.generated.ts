export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_runs: {
        Row: {
          conversation_id: string
          created_at: string
          error: string | null
          id: string
          model: string
          prompt_version: string
          question: string
          state: Json
          status: string
          step_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          error?: string | null
          id?: string
          model?: string
          prompt_version?: string
          question?: string
          state?: Json
          status?: string
          step_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          error?: string | null
          id?: string
          model?: string
          prompt_version?: string
          question?: string
          state?: Json
          status?: string
          step_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          arcana: string
          id: string
          image: string
          keywords: Json
          name: string
          name_vi: string
          reversed: string
          sort_order: number
          suit: string
          upright: string
        }
        Insert: {
          arcana: string
          id: string
          image?: string
          keywords?: Json
          name: string
          name_vi: string
          reversed: string
          sort_order?: number
          suit?: string
          upright: string
        }
        Update: {
          arcana?: string
          id?: string
          image?: string
          keywords?: Json
          name?: string
          name_vi?: string
          reversed?: string
          sort_order?: number
          suit?: string
          upright?: string
        }
        Relationships: []
      }
      castings: {
        Row: {
          changed_number: number | null
          conversation_id: string
          created_at: string
          id: string
          moving_lines: Json
          payload: Json | null
          primary_number: number
          question: string
          run_id: string | null
          tosses: Json
          user_id: string
        }
        Insert: {
          changed_number?: number | null
          conversation_id: string
          created_at?: string
          id?: string
          moving_lines?: Json
          payload?: Json | null
          primary_number: number
          question?: string
          run_id?: string | null
          tosses?: Json
          user_id: string
        }
        Update: {
          changed_number?: number | null
          conversation_id?: string
          created_at?: string
          id?: string
          moving_lines?: Json
          payload?: Json | null
          primary_number?: number
          question?: string
          run_id?: string | null
          tosses?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "castings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "castings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "castings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      clarifications: {
        Row: {
          allow_free_text: boolean
          answer: string | null
          based_on: string
          conversation_id: string
          created_at: string
          id: string
          options: Json
          question: string
          run_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          allow_free_text?: boolean
          answer?: string | null
          based_on?: string
          conversation_id: string
          created_at?: string
          id?: string
          options?: Json
          question: string
          run_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          allow_free_text?: boolean
          answer?: string | null
          based_on?: string
          conversation_id?: string
          created_at?: string
          id?: string
          options?: Json
          question?: string
          run_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clarifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarifications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clarifications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      conversations: {
        Row: {
          compacted_until: string | null
          context_summary: string
          created_at: string
          id: string
          reflected_at: string | null
          title: string
          title_generated: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          compacted_until?: string | null
          context_summary?: string
          created_at?: string
          id?: string
          reflected_at?: string | null
          title?: string
          title_generated?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          compacted_until?: string | null
          context_summary?: string
          created_at?: string
          id?: string
          reflected_at?: string | null
          title?: string
          title_generated?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hexagram_lines: {
        Row: {
          hexagram_number: number
          line_number: number
          review_status: string
          source_name: string
          source_text: string
          source_url: string
          translation_vi: string | null
        }
        Insert: {
          hexagram_number: number
          line_number: number
          review_status?: string
          source_name: string
          source_text: string
          source_url: string
          translation_vi?: string | null
        }
        Update: {
          hexagram_number?: number
          line_number?: number
          review_status?: string
          source_name?: string
          source_text?: string
          source_url?: string
          translation_vi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hexagram_lines_hexagram_number_fkey"
            columns: ["hexagram_number"]
            isOneToOne: false
            referencedRelation: "hexagrams"
            referencedColumns: ["number"]
          },
        ]
      }
      hexagrams: {
        Row: {
          advice: string
          full_name: string
          keywords: Json
          lines: string
          lower_trigram: string
          meaning: string
          name: string
          number: number
          upper_trigram: string
        }
        Insert: {
          advice: string
          full_name: string
          keywords?: Json
          lines: string
          lower_trigram: string
          meaning: string
          name: string
          number: number
          upper_trigram: string
        }
        Update: {
          advice?: string
          full_name?: string
          keywords?: Json
          lines?: string
          lower_trigram?: string
          meaning?: string
          name?: string
          number?: number
          upper_trigram?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          body_vi: string
          content_hash: string
          embedding: string | null
          embedding_model: string | null
          fts: unknown
          gist_en: string
          id: string
          keywords: string[]
          kind: string
          ref: Json
          review_status: string
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          body_vi: string
          content_hash?: string
          embedding?: string | null
          embedding_model?: string | null
          fts?: unknown
          gist_en?: string
          id: string
          keywords?: string[]
          kind: string
          ref?: Json
          review_status?: string
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          body_vi?: string
          content_hash?: string
          embedding?: string | null
          embedding_model?: string | null
          fts?: unknown
          gist_en?: string
          id?: string
          keywords?: string[]
          kind?: string
          ref?: Json
          review_status?: string
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          embedding: string | null
          fts: unknown
          gist_en: string
          id: string
          importance: number
          kind: string
          last_used_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          fts?: unknown
          gist_en?: string
          id?: string
          importance?: number
          kind?: string
          last_used_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          embedding?: string | null
          fts?: unknown
          gist_en?: string
          id?: string
          importance?: number
          kind?: string
          last_used_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memories_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          note: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          note?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          note?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          cards: Json | null
          content: string
          conversation_id: string
          created_at: string
          hexagram: Json | null
          id: string
          role: string
          run_id: string | null
          user_id: string
        }
        Insert: {
          cards?: Json | null
          content?: string
          conversation_id: string
          created_at?: string
          hexagram?: Json | null
          id?: string
          role: string
          run_id?: string | null
          user_id: string
        }
        Update: {
          cards?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          hexagram?: Json | null
          id?: string
          role?: string
          run_id?: string | null
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
            foreignKeyName: "messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      model_calls: {
        Row: {
          cached_tokens: number
          created_at: string
          fallback_reason: string | null
          finish_reason: string | null
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          output_tokens: number
          reasoning_tokens: number
          run_id: string
          step: number
          tool_names: string[]
          ttft_ms: number | null
          user_id: string
        }
        Insert: {
          cached_tokens?: number
          created_at?: string
          fallback_reason?: string | null
          finish_reason?: string | null
          id?: string
          input_tokens?: number
          latency_ms: number
          model?: string
          output_tokens?: number
          reasoning_tokens?: number
          run_id: string
          step: number
          tool_names?: string[]
          ttft_ms?: number | null
          user_id: string
        }
        Update: {
          cached_tokens?: number
          created_at?: string
          fallback_reason?: string | null
          finish_reason?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          output_tokens?: number
          reasoning_tokens?: number
          run_id?: string
          step?: number
          tool_names?: string[]
          ttft_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      playing_cards: {
        Row: {
          id: string
          image: string
          keywords: Json
          meaning: string
          name_vi: string
          rank: string
          sort_order: number
          suit: string
        }
        Insert: {
          id: string
          image: string
          keywords?: Json
          meaning: string
          name_vi: string
          rank: string
          sort_order?: number
          suit: string
        }
        Update: {
          id?: string
          image?: string
          keywords?: Json
          meaning?: string
          name_vi?: string
          rank?: string
          sort_order?: number
          suit?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          version: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          version: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          version?: string
        }
        Relationships: []
      }
      reading_records: {
        Row: {
          conversation_id: string
          created_at: string
          embedding: string | null
          fts: unknown
          gist_en: string
          id: string
          kind: string
          message_id: string | null
          question: string
          record: string
          run_id: string | null
          synthesis: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          embedding?: string | null
          fts?: unknown
          gist_en?: string
          id?: string
          kind: string
          message_id?: string | null
          question: string
          record: string
          run_id?: string | null
          synthesis?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          embedding?: string | null
          fts?: unknown
          gist_en?: string
          id?: string
          kind?: string
          message_id?: string | null
          question?: string
          record?: string
          run_id?: string | null
          synthesis?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_records_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_records_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_records_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_records_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      readings: {
        Row: {
          conversation_id: string
          created_at: string
          deck: string
          id: string
          positions: Json
          question: string
          reason: string
          revealed: Json | null
          run_id: string | null
          shuffled: Json
          status: string
          tool_call_id: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          deck?: string
          id?: string
          positions?: Json
          question: string
          reason?: string
          revealed?: Json | null
          run_id?: string | null
          shuffled?: Json
          status?: string
          tool_call_id?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          deck?: string
          id?: string
          positions?: Json
          question?: string
          reason?: string
          revealed?: Json | null
          run_id?: string | null
          shuffled?: Json
          status?: string
          tool_call_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      text_stopwords: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      tool_calls: {
        Row: {
          arguments: Json
          call_id: string
          created_at: string
          duration_ms: number | null
          id: string
          name: string
          result: Json | null
          run_id: string
          status: string
          user_id: string
        }
        Insert: {
          arguments?: Json
          call_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          name: string
          result?: Json | null
          run_id: string
          status?: string
          user_id: string
        }
        Update: {
          arguments?: Json
          call_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          name?: string
          result?: Json | null
          run_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_calls_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "run_usage"
            referencedColumns: ["run_id"]
          },
        ]
      }
      user_settings: {
        Row: {
          about_you: string
          response_style: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_you?: string
          response_style?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_you?: string
          response_style?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      feedback_by_prompt: {
        Row: {
          model: string | null
          prompt_version: string | null
          ratings: number | null
          score: number | null
          thumbs_down: number | null
          thumbs_up: number | null
        }
        Relationships: []
      }
      run_usage: {
        Row: {
          cached_tokens: number | null
          created_at: string | null
          first_ttft_ms: number | null
          input_tokens: number | null
          latency_ms: number | null
          model_calls: number | null
          output_tokens: number | null
          prompt_version: string | null
          reasoning_tokens: number | null
          run_id: string | null
          status: string | null
          truncated: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_messages_from: { Args: { message_id: string }; Returns: number }
      f_unaccent: { Args: { value: string }; Returns: string }
      forget_everything: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      kb_document: {
        Args: { body: string; keywords: string[]; title: string }
        Returns: unknown
      }
      loose_terms: { Args: { value: string }; Returns: string[] }
      loose_tsquery: { Args: { value: string }; Returns: unknown }
      match_knowledge: {
        Args: {
          include_drafts?: boolean
          kinds?: string[]
          match_count?: number
          query_embedding?: string
          query_text: string
        }
        Returns: {
          body_vi: string
          id: string
          kind: string
          ref: Json
          score: number
          title: string
        }[]
      }
      match_readings: {
        Args: {
          exclude_conversation?: string
          match_count?: number
          query_embedding?: string
          query_text: string
        }
        Returns: {
          conversation_id: string
          created_at: string
          id: string
          kind: string
          question: string
          record: string
          score: number
          synthesis: string
        }[]
      }
      recall_memories: {
        Args: {
          match_count?: number
          query_embedding?: string
          query_text: string
        }
        Returns: {
          content: string
          id: string
          importance: number
          kind: string
          reason: string
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      similar_memory: {
        Args: { query_embedding: string }
        Returns: {
          content: string
          id: string
          similarity: number
        }[]
      }
      sync_reading_grants: { Args: never; Returns: undefined }
      term_coverage: {
        Args: { document: unknown; terms: string[] }
        Returns: number
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

