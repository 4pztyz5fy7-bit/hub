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
      conversions: {
        Row: {
          amount: number
          created_at: string
          id: string
          offer_id: string | null
          offer_name: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          offer_id?: string | null
          offer_name: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          offer_id?: string | null
          offer_name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      link_requests: {
        Row: {
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
      notifications: {
        Row: {
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
          advertiser: string | null
          allowed: string[]
          category: string | null
          city_payouts: Json
          cr: number
          created_at: string
          denied: string[]
          description: string | null
          epc: number
          geo: string | null
          goal: string | null
          hold: string | null
          id: string
          image_url: string | null
          is_new: boolean
          landing: string | null
          name: string
          payout: string
          payout_kind: string
          payout_max: number | null
          payout_min: number | null
          requirements: string | null
          tag: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          advertiser?: string | null
          allowed?: string[]
          category?: string | null
          city_payouts?: Json
          cr?: number
          created_at?: string
          denied?: string[]
          description?: string | null
          epc?: number
          geo?: string | null
          goal?: string | null
          hold?: string | null
          id: string
          image_url?: string | null
          is_new?: boolean
          landing?: string | null
          name: string
          payout: string
          payout_kind?: string
          payout_max?: number | null
          payout_min?: number | null
          requirements?: string | null
          tag: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          advertiser?: string | null
          allowed?: string[]
          category?: string | null
          city_payouts?: Json
          cr?: number
          created_at?: string
          denied?: string[]
          description?: string | null
          epc?: number
          geo?: string | null
          goal?: string | null
          hold?: string | null
          id?: string
          image_url?: string | null
          is_new?: boolean
          landing?: string | null
          name?: string
          payout?: string
          payout_kind?: string
          payout_max?: number | null
          payout_min?: number | null
          requirements?: string | null
          tag?: string
          updated_at?: string
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
          phone: string | null
          settings: Json
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
          phone?: string | null
          settings?: Json
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
          phone?: string | null
          settings?: Json
          telegram?: string | null
          updated_at?: string
          warnings_count?: number
          website?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
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
