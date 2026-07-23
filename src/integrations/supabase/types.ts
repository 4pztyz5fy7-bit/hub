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
      achievements: {
        Row: {
          code: string
          created_at: string
          description: string
          icon: string
          id: string
          metric: string
          name: string
          sort_order: number
          threshold: number
          tier: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          metric: string
          name: string
          sort_order?: number
          threshold: number
          tier?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          metric?: string
          name?: string
          sort_order?: number
          threshold?: number
          tier?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          admin_prompt_limit: number
          enabled: boolean
          gemini_api_key: string | null
          gemini_model: string
          id: number
          lovable_api_key: string | null
          lovable_model: string
          moderation_enabled: boolean
          provider: string
          updated_at: string
          updated_by: string | null
          user_prompt_limit: number
        }
        Insert: {
          admin_prompt_limit?: number
          enabled?: boolean
          gemini_api_key?: string | null
          gemini_model?: string
          id?: number
          lovable_api_key?: string | null
          lovable_model?: string
          moderation_enabled?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
          user_prompt_limit?: number
        }
        Update: {
          admin_prompt_limit?: number
          enabled?: boolean
          gemini_api_key?: string | null
          gemini_model?: string
          id?: number
          lovable_api_key?: string | null
          lovable_model?: string
          moderation_enabled?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
          user_prompt_limit?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          button_label: string
          button_url: string
          created_at: string
          id: string
          text: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          button_label?: string
          button_url?: string
          created_at?: string
          id?: string
          text?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          button_label?: string
          button_url?: string
          created_at?: string
          id?: string
          text?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_participants: {
        Row: {
          competition_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_participants_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          active: boolean
          banner_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          metric: string
          min_level: Database["public"]["Enums"]["level_tier"]
          prize_pool: number
          prizes: Json
          rules: string | null
          settled_at: string | null
          settled_by: string | null
          starts_at: string
          title: string
          updated_at: string
          winners: Json
        }
        Insert: {
          active?: boolean
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          metric?: string
          min_level?: Database["public"]["Enums"]["level_tier"]
          prize_pool?: number
          prizes?: Json
          rules?: string | null
          settled_at?: string | null
          settled_by?: string | null
          starts_at?: string
          title: string
          updated_at?: string
          winners?: Json
        }
        Update: {
          active?: boolean
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          metric?: string
          min_level?: Database["public"]["Enums"]["level_tier"]
          prize_pool?: number
          prizes?: Json
          rules?: string | null
          settled_at?: string | null
          settled_by?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
          winners?: Json
        }
        Relationships: []
      }
      conversions: {
        Row: {
          amount: number
          base_amount: number | null
          bonus_amount: number | null
          bonus_pct: number | null
          competition_id: string | null
          created_at: string
          id: string
          offer_id: string | null
          offer_name: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          base_amount?: number | null
          bonus_amount?: number | null
          bonus_pct?: number | null
          competition_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          offer_name: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          base_amount?: number | null
          bonus_amount?: number | null
          bonus_pct?: number | null
          competition_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          offer_name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          enabled: boolean
          from_email: string
          from_name: string
          id: number
          reply_to: string
          smtp_host: string
          smtp_pass: string
          smtp_port: number
          smtp_secure: boolean
          smtp_user: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          from_email?: string
          from_name?: string
          id?: number
          reply_to?: string
          smtp_host?: string
          smtp_pass?: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_user?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          from_email?: string
          from_name?: string
          id?: number
          reply_to?: string
          smtp_host?: string
          smtp_pass?: string
          smtp_port?: number
          smtp_secure?: boolean
          smtp_user?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      link_requests: {
        Row: {
          code: string
          created_at: string
          credit_conversion_id: string | null
          credited_at: string | null
          id: string
          link: string | null
          note: string | null
          offer_id: string | null
          offer_name: string
          offer_tag: string | null
          orders_count: number
          payout_override: number | null
          source: string | null
          status: Database["public"]["Enums"]["link_status"]
          sub: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          credit_conversion_id?: string | null
          credited_at?: string | null
          id?: string
          link?: string | null
          note?: string | null
          offer_id?: string | null
          offer_name: string
          offer_tag?: string | null
          orders_count?: number
          payout_override?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          sub?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          credit_conversion_id?: string | null
          credited_at?: string | null
          id?: string
          link?: string | null
          note?: string | null
          offer_id?: string | null
          offer_name?: string
          offer_tag?: string | null
          orders_count?: number
          payout_override?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["link_status"]
          sub?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_requests_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          amount: string | null
          body: string
          created_at: string
          id: string
          kind: string
          read: boolean
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          amount?: string | null
          body: string
          created_at?: string
          id?: string
          kind: string
          read?: boolean
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          amount?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          read?: boolean
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          ad_materials: string | null
          advertiser: string | null
          allowed: string[]
          avg_orders_per_courier: number
          category: string | null
          city_payouts: Json
          cr: number
          created_at: string
          denied: string[]
          description: string | null
          epc: number
          feedback: string | null
          geo: string | null
          goal: string | null
          hold: string | null
          id: string
          image_url: string | null
          income: string | null
          is_new: boolean
          landing: string | null
          min_level: Database["public"]["Enums"]["level_tier"]
          name: string
          payout: string
          payout_kind: string
          payout_max: number | null
          payout_min: number | null
          requirements: string | null
          tag: string
          target_action: string | null
          term_completion: string | null
          term_confirmation: string | null
          updated_at: string
          work_rules: string | null
        }
        Insert: {
          active?: boolean
          ad_materials?: string | null
          advertiser?: string | null
          allowed?: string[]
          avg_orders_per_courier?: number
          category?: string | null
          city_payouts?: Json
          cr?: number
          created_at?: string
          denied?: string[]
          description?: string | null
          epc?: number
          feedback?: string | null
          geo?: string | null
          goal?: string | null
          hold?: string | null
          id: string
          image_url?: string | null
          income?: string | null
          is_new?: boolean
          landing?: string | null
          min_level?: Database["public"]["Enums"]["level_tier"]
          name: string
          payout: string
          payout_kind?: string
          payout_max?: number | null
          payout_min?: number | null
          requirements?: string | null
          tag: string
          target_action?: string | null
          term_completion?: string | null
          term_confirmation?: string | null
          updated_at?: string
          work_rules?: string | null
        }
        Update: {
          active?: boolean
          ad_materials?: string | null
          advertiser?: string | null
          allowed?: string[]
          avg_orders_per_courier?: number
          category?: string | null
          city_payouts?: Json
          cr?: number
          created_at?: string
          denied?: string[]
          description?: string | null
          epc?: number
          feedback?: string | null
          geo?: string | null
          goal?: string | null
          hold?: string | null
          id?: string
          image_url?: string | null
          income?: string | null
          is_new?: boolean
          landing?: string | null
          min_level?: Database["public"]["Enums"]["level_tier"]
          name?: string
          payout?: string
          payout_kind?: string
          payout_max?: number | null
          payout_min?: number | null
          requirements?: string | null
          tag?: string
          target_action?: string | null
          term_completion?: string | null
          term_confirmation?: string | null
          updated_at?: string
          work_rules?: string | null
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string
          destination: string | null
          id: string
          method: string
          note: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          destination?: string | null
          id?: string
          method: string
          note?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          destination?: string | null
          id?: string
          method?: string
          note?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bank: Json | null
          bio: string | null
          blocked: boolean
          blocked_at: string | null
          blocked_reason: string | null
          city: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_activity_date: string | null
          phone: string | null
          settings: Json
          streak_best: number
          streak_days: number
          telegram: string | null
          updated_at: string
          warnings_count: number
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bank?: Json | null
          bio?: string | null
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_activity_date?: string | null
          phone?: string | null
          settings?: Json
          streak_best?: number
          streak_days?: number
          telegram?: string | null
          updated_at?: string
          warnings_count?: number
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bank?: Json | null
          bio?: string | null
          blocked?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_activity_date?: string | null
          phone?: string | null
          settings?: Json
          streak_best?: number
          streak_days?: number
          telegram?: string | null
          updated_at?: string
          warnings_count?: number
          website?: string | null
        }
        Relationships: []
      }
      promo_activations: {
        Row: {
          amount: number
          conversion_id: string | null
          created_at: string
          id: string
          promo_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          conversion_id?: string | null
          created_at?: string
          id?: string
          promo_id: string
          user_id: string
        }
        Update: {
          amount?: number
          conversion_id?: string | null
          created_at?: string
          id?: string
          promo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_activations_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "conversions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_activations_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          bonus_amount: number
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          max_activations: number | null
          starts_at: string
          title: string
          trigger_conversions_count: number
          trigger_offer_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          bonus_amount?: number
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          max_activations?: number | null
          starts_at?: string
          title: string
          trigger_conversions_count?: number
          trigger_offer_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          bonus_amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          max_activations?: number | null
          starts_at?: string
          title?: string
          trigger_conversions_count?: number
          trigger_offer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_trigger_offer_id_fkey"
            columns: ["trigger_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_category_access: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          recruiter_id: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          recruiter_id: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          recruiter_id?: string
        }
        Relationships: []
      }
      recruiter_offer_access: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          offer_id: string
          recruiter_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id: string
          recruiter_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          offer_id?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_offer_access_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string
          created_at: string
          from_admin: boolean
          id: string
          text: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          from_admin?: boolean
          id?: string
          text: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          from_admin?: boolean
          id?: string
          text?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          priority: string
          status: string
          subject: string
          unread_admin: number
          unread_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject?: string
          unread_admin?: number
          unread_user?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          position_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          position_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          position_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "team_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_positions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_leadership: boolean
          is_system: boolean
          name: string
          permissions: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_leadership?: boolean
          is_system?: boolean
          name: string
          permissions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_leadership?: boolean
          is_system?: boolean
          name?: string
          permissions?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_payout: { Args: { _id: string }; Returns: Json }
      admin_set_link_request_status: {
        Args: {
          _new_status: Database["public"]["Enums"]["link_status"]
          _payout_override?: number
          _request_id: string
        }
        Returns: Json
      }
      auto_settle_competitions: { Args: never; Returns: number }
      award_achievements: {
        Args: never
        Returns: {
          unlocked_code: string
          unlocked_name: string
        }[]
      }
      can_recruit_offer: {
        Args: { _offer_id: string; _uid: string }
        Returns: boolean
      }
      current_team_permissions: { Args: never; Returns: Json }
      get_competition_leaderboard: {
        Args: { _competition_id: string; _limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          is_me: boolean
          rank: number
          score: number
          user_id: string
        }[]
      }
      get_landing_stats: { Args: never; Returns: Json }
      get_leaderboard: {
        Args: { _limit?: number; _period?: string }
        Returns: {
          avatar_url: string
          conversions: number
          display_name: string
          is_me: boolean
          total: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_leadership: { Args: { _uid?: string }; Returns: boolean }
      is_team_member: { Args: { _uid?: string }; Returns: boolean }
      join_competition: { Args: { _competition_id: string }; Returns: Json }
      level_bonus_pct: { Args: { _earned: number }; Returns: number }
      level_min_earned: {
        Args: { _tier: Database["public"]["Enums"]["level_tier"] }
        Returns: number
      }
      notify_competition_ranks: { Args: never; Returns: number }
      recompute_offer_stats: { Args: { _offer_id: string }; Returns: undefined }
      settle_competition: { Args: { _id: string }; Returns: Json }
      touch_streak: {
        Args: never
        Returns: {
          last_activity_date: string
          streak_best: number
          streak_days: number
        }[]
      }
      user_total_earned: { Args: { _uid: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "recruiter"
      level_tier: "start" | "silver" | "gold" | "platinum" | "diamond"
      link_status:
        | "new"
        | "review"
        | "approved"
        | "rejected"
        | "in_progress"
        | "completed"
        | "finished"
        | "paid"
      payout_status: "pending" | "processing" | "paid" | "rejected"
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
      app_role: ["admin", "user", "recruiter"],
      level_tier: ["start", "silver", "gold", "platinum", "diamond"],
      link_status: [
        "new",
        "review",
        "approved",
        "rejected",
        "in_progress",
        "completed",
        "finished",
        "paid",
      ],
      payout_status: ["pending", "processing", "paid", "rejected"],
    },
  },
} as const
