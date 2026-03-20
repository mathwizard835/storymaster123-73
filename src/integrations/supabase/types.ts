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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string
          created_at: string
          device_id: string
          email: string
          expires_at: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          banned_at?: string
          banned_by?: string
          created_at?: string
          device_id: string
          email: string
          expires_at?: string | null
          id?: string
          reason: string
          user_id?: string | null
        }
        Update: {
          banned_at?: string
          banned_by?: string
          created_at?: string
          device_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_violations: {
        Row: {
          content: string | null
          created_at: string
          device_id: string
          id: string
          user_id: string | null
          violation_type: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          device_id: string
          id?: string
          user_id?: string | null
          violation_type?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          device_id?: string
          id?: string
          user_id?: string | null
          violation_type?: string
        }
        Relationships: []
      }
      daily_streaks: {
        Row: {
          bonus_stories_earned: number | null
          created_at: string
          current_streak: number | null
          device_id: string
          id: string
          last_story_date: string | null
          longest_streak: number | null
          updated_at: string
        }
        Insert: {
          bonus_stories_earned?: number | null
          created_at?: string
          current_streak?: number | null
          device_id: string
          id?: string
          last_story_date?: string | null
          longest_streak?: number | null
          updated_at?: string
        }
        Update: {
          bonus_stories_earned?: number | null
          created_at?: string
          current_streak?: number | null
          device_id?: string
          id?: string
          last_story_date?: string | null
          longest_streak?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          child_age: number | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          parent_email: string | null
          parental_consent_at: string | null
          parental_consent_given: boolean | null
          parental_consent_method: string | null
          trial_used: boolean | null
          updated_at: string
        }
        Insert: {
          child_age?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          parent_email?: string | null
          parental_consent_at?: string | null
          parental_consent_given?: boolean | null
          parental_consent_method?: string | null
          trial_used?: boolean | null
          updated_at?: string
        }
        Update: {
          child_age?: number | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          parent_email?: string | null
          parental_consent_at?: string | null
          parental_consent_given?: boolean | null
          parental_consent_method?: string | null
          trial_used?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          reading_time_seconds: number
          story_id: string
          story_title: string | null
          user_id: string
          words_read: number
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          reading_time_seconds?: number
          story_id: string
          story_title?: string | null
          user_id: string
          words_read?: number
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          reading_time_seconds?: number
          story_id?: string
          story_title?: string | null
          user_id?: string
          words_read?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          bonus_stories_earned: number | null
          completed_at: string | null
          created_at: string
          id: string
          referred_device_id: string
          referrer_device_id: string
          status: string
        }
        Insert: {
          bonus_stories_earned?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_device_id: string
          referrer_device_id: string
          status?: string
        }
        Update: {
          bonus_stories_earned?: number | null
          completed_at?: string | null
          created_at?: string
          id?: string
          referred_device_id?: string
          referrer_device_id?: string
          status?: string
        }
        Relationships: []
      }
      story_completions: {
        Row: {
          completed_at: string
          created_at: string
          device_id: string
          id: string
          profile: Json | null
        }
        Insert: {
          completed_at?: string
          created_at?: string
          device_id: string
          id?: string
          profile?: Json | null
        }
        Update: {
          completed_at?: string
          created_at?: string
          device_id?: string
          id?: string
          profile?: Json | null
        }
        Relationships: []
      }
      story_shares: {
        Row: {
          created_at: string
          device_id: string
          id: string
          platform: string | null
          share_type: string
          story_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          platform?: string | null
          share_type: string
          story_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          platform?: string | null
          share_type?: string
          story_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          name: string
          price_monthly: number | null
          story_limit: number | null
        }
        Insert: {
          created_at?: string
          features: Json
          id?: string
          name: string
          price_monthly?: number | null
          story_limit?: number | null
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          name?: string
          price_monthly?: number | null
          story_limit?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stories: {
        Row: {
          choices_made: Json | null
          completed_at: string | null
          current_scene_index: number | null
          device_fingerprint: string | null
          id: string
          last_played_at: string
          profile: Json
          scene_count: number | null
          scenes: Json | null
          started_at: string
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          choices_made?: Json | null
          completed_at?: string | null
          current_scene_index?: number | null
          device_fingerprint?: string | null
          id?: string
          last_played_at?: string
          profile: Json
          scene_count?: number | null
          scenes?: Json | null
          started_at?: string
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          choices_made?: Json | null
          completed_at?: string | null
          current_scene_index?: number | null
          device_fingerprint?: string | null
          id?: string
          last_played_at?: string
          profile?: Json
          scene_count?: number | null
          scenes?: Json | null
          started_at?: string
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          device_id: string
          expires_at: string | null
          id: string
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          expires_at?: string | null
          id?: string
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          device_id: string
          email: string
          id: string
          position: number | null
          referral_code: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          email: string
          id?: string
          position?: number | null
          referral_code?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          email?: string
          id?: string
          position?: number | null
          referral_code?: string | null
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
      is_banned: {
        Args: { _device_id?: string; _user_id?: string }
        Returns: boolean
      }
      validate_device_context: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
