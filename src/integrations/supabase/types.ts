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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      briefing_log: {
        Row: {
          briefing_date: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          briefing_date: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          briefing_date?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          course_id: string | null
          created_at: string
          event_date: string
          event_time: string | null
          id: string
          notes: string | null
          notified_at: string | null
          remind_minutes: number | null
          title: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          event_date: string
          event_time?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          remind_minutes?: number | null
          title: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          event_date?: string
          event_time?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          remind_minutes?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_items: {
        Row: {
          completed: boolean
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          notified_at: string | null
          score_percent: number | null
          title: string
          type: Database["public"]["Enums"]["item_type"]
          user_id: string
          weight: number | null
        }
        Insert: {
          completed?: boolean
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notified_at?: string | null
          score_percent?: number | null
          title: string
          type?: Database["public"]["Enums"]["item_type"]
          user_id: string
          weight?: number | null
        }
        Update: {
          completed?: boolean
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notified_at?: string | null
          score_percent?: number | null
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          alt_group: string | null
          archived: boolean
          category: Database["public"]["Enums"]["course_category"]
          code: string | null
          color: string | null
          completed_term: string | null
          created_at: string
          credits: number | null
          final_grade: string | null
          grade_points: number | null
          id: string
          instructor: string | null
          is_retake: boolean
          location: string | null
          meetings: Json
          name: string
          nickname: string | null
          notes: string | null
          plan_level: number | null
          prerequisites: string[]
          previous_attempt_id: string | null
          status: Database["public"]["Enums"]["course_status"]
          syllabus_path: string | null
          term: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alt_group?: string | null
          archived?: boolean
          category?: Database["public"]["Enums"]["course_category"]
          code?: string | null
          color?: string | null
          completed_term?: string | null
          created_at?: string
          credits?: number | null
          final_grade?: string | null
          grade_points?: number | null
          id?: string
          instructor?: string | null
          is_retake?: boolean
          location?: string | null
          meetings?: Json
          name: string
          nickname?: string | null
          notes?: string | null
          plan_level?: number | null
          prerequisites?: string[]
          previous_attempt_id?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          syllabus_path?: string | null
          term?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alt_group?: string | null
          archived?: boolean
          category?: Database["public"]["Enums"]["course_category"]
          code?: string | null
          color?: string | null
          completed_term?: string | null
          created_at?: string
          credits?: number | null
          final_grade?: string | null
          grade_points?: number | null
          id?: string
          instructor?: string | null
          is_retake?: boolean
          location?: string | null
          meetings?: Json
          name?: string
          nickname?: string | null
          notes?: string | null
          plan_level?: number | null
          prerequisites?: string[]
          previous_attempt_id?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          syllabus_path?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_previous_attempt_id_fkey"
            columns: ["previous_attempt_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_weights: {
        Row: {
          category: string
          course_id: string
          created_at: string
          id: string
          percentage: number
          user_id: string
        }
        Insert: {
          category: string
          course_id: string
          created_at?: string
          id?: string
          percentage?: number
          user_id: string
        }
        Update: {
          category?: string
          course_id?: string
          created_at?: string
          id?: string
          percentage?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_weights_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accent_color: string | null
          briefing_buffer_minutes: number
          briefing_enabled: boolean
          briefing_lead_minutes: number
          commute_mode: string
          created_at: string
          current_term: string | null
          full_name: string | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          language: string
          major: string | null
          onboarding_completed: boolean
          overall_gpa: number | null
          semester_gpa: number | null
          sounds_enabled: boolean
          term_number: number
          theme: string
          timezone: string
          total_credits: number
          university: string | null
          university_address: string | null
          university_lat: number | null
          university_lng: number | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          briefing_buffer_minutes?: number
          briefing_enabled?: boolean
          briefing_lead_minutes?: number
          commute_mode?: string
          created_at?: string
          current_term?: string | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id: string
          language?: string
          major?: string | null
          onboarding_completed?: boolean
          overall_gpa?: number | null
          semester_gpa?: number | null
          sounds_enabled?: boolean
          term_number?: number
          theme?: string
          timezone?: string
          total_credits?: number
          university?: string | null
          university_address?: string | null
          university_lat?: number | null
          university_lng?: number | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          briefing_buffer_minutes?: number
          briefing_enabled?: boolean
          briefing_lead_minutes?: number
          commute_mode?: string
          created_at?: string
          current_term?: string | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          language?: string
          major?: string | null
          onboarding_completed?: boolean
          overall_gpa?: number | null
          semester_gpa?: number | null
          sounds_enabled?: boolean
          term_number?: number
          theme?: string
          timezone?: string
          total_credits?: number
          university?: string | null
          university_address?: string | null
          university_lat?: number | null
          university_lng?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      study_streak: {
        Row: {
          count: number
          created_at: string
          id: string
          log_date: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          log_date: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
        }
        Relationships: []
      }
      term_calendar_events: {
        Row: {
          created_at: string
          end_date: string | null
          event_type: string
          id: string
          start_date: string
          term_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          event_type?: string
          id?: string
          start_date: string
          term_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          event_type?: string
          id?: string
          start_date?: string
          term_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_calendar_events_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          credits: number | null
          end_date: string | null
          gpa: number | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          term_number: number
          user_id: string
          weeks_count: number | null
        }
        Insert: {
          created_at?: string
          credits?: number | null
          end_date?: string | null
          gpa?: number | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          term_number?: number
          user_id: string
          weeks_count?: number | null
        }
        Update: {
          created_at?: string
          credits?: number | null
          end_date?: string | null
          gpa?: number | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          term_number?: number
          user_id?: string
          weeks_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      course_category: "general" | "college" | "major" | "major_elective"
      course_status: "current" | "completed" | "future"
      item_type: "assignment" | "exam" | "quiz" | "project" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      course_category: ["general", "college", "major", "major_elective"],
      course_status: ["current", "completed", "future"],
      item_type: ["assignment", "exam", "quiz", "project", "other"],
    },
  },
} as const
