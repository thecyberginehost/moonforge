export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievement_types: {
        Row: {
          badge_color: string
          category: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
          rarity: string
          reward_type: string | null
          reward_value: number | null
        }
        Insert: {
          badge_color?: string
          category: string
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
          rarity?: string
          reward_type?: string | null
          reward_value?: number | null
        }
        Update: {
          badge_color?: string
          category?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
          rarity?: string
          reward_type?: string | null
          reward_value?: number | null
        }
        Relationships: []
      }
      community_rewards: {
        Row: {
          created_at: string
          distributed_amount: number
          id: string
          remaining_pool: number
          token_id: string
          total_pool: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          distributed_amount?: number
          id?: string
          remaining_pool?: number
          token_id: string
          total_pool?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          distributed_amount?: number
          id?: string
          remaining_pool?: number
          token_id?: string
          total_pool?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_rewards_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: true
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          prompt_type: string | null
          response: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          prompt_type?: string | null
          response: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          prompt_type?: string | null
          response?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_credits: {
        Row: {
          created_at: string
          daily_credits: number
          id: string
          last_reset: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_credits?: number
          id?: string
          last_reset?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_credits?: number
          id?: string
          last_reset?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_earnings: {
        Row: {
          claimable_amount: number
          created_at: string
          creator_wallet: string
          id: string
          last_claim_at: string | null
          token_id: string
          total_claimed: number
          total_earned: number
          updated_at: string
        }
        Insert: {
          claimable_amount?: number
          created_at?: string
          creator_wallet: string
          id?: string
          last_claim_at?: string | null
          token_id: string
          total_claimed?: number
          total_earned?: number
          updated_at?: string
        }
        Update: {
          claimable_amount?: number
          created_at?: string
          creator_wallet?: string
          id?: string
          last_claim_at?: string | null
          token_id?: string
          total_claimed?: number
          total_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "creator_earnings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_config: {
        Row: {
          created_at: string | null
          creator_fee_bps: number
          id: string
          is_active: boolean | null
          platform_fee_bps: number
          prize_pool_fee_bps: number
          reserves_fee_bps: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_fee_bps?: number
          id?: string
          is_active?: boolean | null
          platform_fee_bps?: number
          prize_pool_fee_bps?: number
          reserves_fee_bps?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_fee_bps?: number
          id?: string
          is_active?: boolean | null
          platform_fee_bps?: number
          prize_pool_fee_bps?: number
          reserves_fee_bps?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      fee_transactions: {
        Row: {
          community_fee: number
          created_at: string
          creator_fee: number
          creator_wallet: string
          id: string
          liquidity_fee: number
          platform_fee: number
          token_id: string
          total_fee: number
          trade_amount: number
          trader_wallet: string
          transaction_type: string
        }
        Insert: {
          community_fee: number
          created_at?: string
          creator_fee: number
          creator_wallet: string
          id?: string
          liquidity_fee: number
          platform_fee: number
          token_id: string
          total_fee: number
          trade_amount: number
          trader_wallet: string
          transaction_type: string
        }
        Update: {
          community_fee?: number
          created_at?: string
          creator_fee?: number
          creator_wallet?: string
          id?: string
          liquidity_fee?: number
          platform_fee?: number
          token_id?: string
          total_fee?: number
          trade_amount?: number
          trader_wallet?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_transactions_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
          {
            foreignKeyName: "fee_transactions_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category_id: string
          content: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          last_reply_at: string | null
          post_type: string
          reply_count: number | null
          title: string
          updated_at: string
          user_wallet: string
          view_count: number | null
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          post_type?: string
          reply_count?: number | null
          title: string
          updated_at?: string
          user_wallet: string
          view_count?: number | null
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          post_type?: string
          reply_count?: number | null
          title?: string
          updated_at?: string
          user_wallet?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_solution: boolean | null
          post_id: string
          updated_at: string
          user_wallet: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          post_id: string
          updated_at?: string
          user_wallet: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          post_id?: string
          updated_at?: string
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          signature_hash: string
          timestamp: string
          token_id: string | null
          user_wallet: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          signature_hash: string
          timestamp?: string
          token_id?: string | null
          user_wallet: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          signature_hash?: string
          timestamp?: string
          token_id?: string | null
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_logs_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          last_active: string
          total_tokens_created: number | null
          total_volume_traded: number | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          last_active?: string
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          last_active?: string
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      program_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          network: string
          program_id: string
          program_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          network?: string
          program_id: string
          program_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          network?: string
          program_id?: string
          program_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tokens: {
        Row: {
          bonding_curve_address: string | null
          created_at: string
          creation_fee: number | null
          creator_wallet: string
          description: string | null
          holder_count: number | null
          id: string
          image_url: string | null
          is_graduated: boolean | null
          market_cap: number | null
          mint_address: string | null
          name: string
          platform_identifier: string | null
          platform_signature: string | null
          price: number | null
          signature_expires_at: string | null
          sol_raised: number | null
          symbol: string
          telegram_url: string | null
          tokens_sold: number | null
          total_supply: number | null
          updated_at: string
          volume_24h: number | null
          x_url: string | null
        }
        Insert: {
          bonding_curve_address?: string | null
          created_at?: string
          creation_fee?: number | null
          creator_wallet: string
          description?: string | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          is_graduated?: boolean | null
          market_cap?: number | null
          mint_address?: string | null
          name: string
          platform_identifier?: string | null
          platform_signature?: string | null
          price?: number | null
          signature_expires_at?: string | null
          sol_raised?: number | null
          symbol: string
          telegram_url?: string | null
          tokens_sold?: number | null
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
          x_url?: string | null
        }
        Update: {
          bonding_curve_address?: string | null
          created_at?: string
          creation_fee?: number | null
          creator_wallet?: string
          description?: string | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          is_graduated?: boolean | null
          market_cap?: number | null
          mint_address?: string | null
          name?: string
          platform_identifier?: string | null
          platform_signature?: string | null
          price?: number | null
          signature_expires_at?: string | null
          sol_raised?: number | null
          symbol?: string
          telegram_url?: string | null
          tokens_sold?: number | null
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
          x_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tokens_creator_wallet_fkey"
            columns: ["creator_wallet"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["wallet_address"]
          },
        ]
      }
      trading_activities: {
        Row: {
          activity_type: string
          amount_sol: number
          created_at: string
          id: string
          market_cap_at_time: number | null
          profit_loss: number | null
          profit_percentage: number | null
          time_since_launch_minutes: number | null
          token_amount: number
          token_id: string
          token_price: number
          updated_at: string
          user_wallet: string
        }
        Insert: {
          activity_type: string
          amount_sol: number
          created_at?: string
          id?: string
          market_cap_at_time?: number | null
          profit_loss?: number | null
          profit_percentage?: number | null
          time_since_launch_minutes?: number | null
          token_amount: number
          token_id: string
          token_price: number
          updated_at?: string
          user_wallet: string
        }
        Update: {
          activity_type?: string
          amount_sol?: number
          created_at?: string
          id?: string
          market_cap_at_time?: number | null
          profit_loss?: number | null
          profit_percentage?: number | null
          time_since_launch_minutes?: number | null
          token_amount?: number
          token_id?: string
          token_price?: number
          updated_at?: string
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_activities_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_boosts: {
        Row: {
          boost_type: string
          created_at: string
          creator_wallet: string
          duration_hours: number
          expires_at: string
          id: string
          position: number | null
          price_sol: number
          starts_at: string
          token_id: string
          updated_at: string
        }
        Insert: {
          boost_type: string
          created_at?: string
          creator_wallet: string
          duration_hours: number
          expires_at: string
          id?: string
          position?: number | null
          price_sol: number
          starts_at?: string
          token_id: string
          updated_at?: string
        }
        Update: {
          boost_type?: string
          created_at?: string
          creator_wallet?: string
          duration_hours?: number
          expires_at?: string
          id?: string
          position?: number | null
          price_sol?: number
          starts_at?: string
          token_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_type_id: string
          created_at: string
          earned_at: string
          id: string
          metadata: Json | null
          token_id: string | null
          user_wallet: string
        }
        Insert: {
          achievement_type_id: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          token_id?: string | null
          user_wallet: string
        }
        Update: {
          achievement_type_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          token_id?: string | null
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_type_id_fkey"
            columns: ["achievement_type_id"]
            isOneToOne: false
            referencedRelation: "achievement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_portfolios: {
        Row: {
          average_buy_price: number
          created_at: string
          first_purchase_at: string
          id: string
          last_activity_at: string
          token_amount: number
          token_id: string
          total_invested: number
          updated_at: string
          user_wallet: string
        }
        Insert: {
          average_buy_price?: number
          created_at?: string
          first_purchase_at?: string
          id?: string
          last_activity_at?: string
          token_amount?: number
          token_id: string
          total_invested?: number
          updated_at?: string
          user_wallet: string
        }
        Update: {
          average_buy_price?: number
          created_at?: string
          first_purchase_at?: string
          id?: string
          last_activity_at?: string
          token_amount?: number
          token_id?: string
          total_invested?: number
          updated_at?: string
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_portfolios_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          wallet_address: string
          wallet_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address: string
          wallet_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          wallet_address?: string
          wallet_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_top_10_position: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_and_award_achievements: {
        Args: {
          p_user_wallet: string
          p_token_id?: string
          p_check_type?: string
        }
        Returns: undefined
      }
      check_creator_rate_limit: {
        Args: { p_creator_wallet: string }
        Returns: {
          allowed: boolean
          reason: string
          tokens_created_today: number
          daily_limit: number
        }[]
      }
      get_active_fee_config: {
        Args: Record<PropertyKey, never>
        Returns: {
          platform_fee_bps: number
          creator_fee_bps: number
          prize_pool_fee_bps: number
          reserves_fee_bps: number
        }[]
      }
      get_active_program_id: {
        Args: { p_program_name?: string }
        Returns: string
      }
      get_available_top_10_spots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_fee_config_by_graduation: {
        Args: { is_graduated?: boolean }
        Returns: {
          platform_fee_bps: number
          creator_fee_bps: number
          prize_pool_fee_bps: number
          reserves_fee_bps: number
        }[]
      }
      get_user_credits: {
        Args: { user_wallet: string }
        Returns: number
      }
      get_wallet_address: {
        Args: { p_wallet_type: string }
        Returns: string
      }
      has_unlimited_credits: {
        Args: { user_wallet: string }
        Returns: boolean
      }
      initialize_creator_credits: {
        Args: { p_user_wallet: string }
        Returns: undefined
      }
      reset_daily_credits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      test_achievement_system: {
        Args: { p_user_wallet: string; p_token_id: string }
        Returns: Json
      }
      update_existing_tokens_program_id: {
        Args: { new_program_id: string; old_program_id: string }
        Returns: number
      }
      validate_platform_signature: {
        Args: { p_token_id: string; p_signature: string }
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
