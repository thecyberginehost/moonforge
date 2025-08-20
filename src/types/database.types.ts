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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          color: string | null
          created_at: string | null
          description: string
          icon: string
          id: string
          is_active: boolean | null
          name: string
          points: number | null
          rarity: string | null
          requirement_metadata: Json | null
          requirement_type: string
          requirement_value: number
          reward_type: string | null
          reward_value: number | null
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string | null
          description: string
          icon: string
          id?: string
          is_active?: boolean | null
          name: string
          points?: number | null
          rarity?: string | null
          requirement_metadata?: Json | null
          requirement_type: string
          requirement_value: number
          reward_type?: string | null
          reward_value?: number | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number | null
          rarity?: string | null
          requirement_metadata?: Json | null
          requirement_type?: string
          requirement_value?: number
          reward_type?: string | null
          reward_value?: number | null
        }
        Relationships: []
      }
      forum_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          post_count: number | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          post_count?: number | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          post_count?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          category_id: string
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          last_reply_at: string | null
          like_count: number | null
          post_type: string | null
          reply_count: number | null
          title: string
          token_id: string | null
          updated_at: string | null
          user_wallet: string
          view_count: number | null
        }
        Insert: {
          category_id: string
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          like_count?: number | null
          post_type?: string | null
          reply_count?: number | null
          title: string
          token_id?: string | null
          updated_at?: string | null
          user_wallet: string
          view_count?: number | null
        }
        Update: {
          category_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          last_reply_at?: string | null
          like_count?: number | null
          post_type?: string | null
          reply_count?: number | null
          title?: string
          token_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "forum_posts_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_solution: boolean | null
          like_count: number | null
          post_id: string
          reply_to_id: string | null
          updated_at: string | null
          user_wallet: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_solution?: boolean | null
          like_count?: number | null
          post_id: string
          reply_to_id?: string | null
          updated_at?: string | null
          user_wallet: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_solution?: boolean | null
          like_count?: number | null
          post_id?: string
          reply_to_id?: string | null
          updated_at?: string | null
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
          {
            foreignKeyName: "forum_replies_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stats: {
        Row: {
          active_users: number | null
          created_at: string | null
          creator_fees_distributed: number | null
          date: string
          id: string
          new_users: number | null
          platform_fees_collected: number | null
          tokens_created: number | null
          tokens_graduated: number | null
          tokens_rugged: number | null
          total_trades: number | null
          total_users: number | null
          total_volume_sol: number | null
          total_volume_usd: number | null
        }
        Insert: {
          active_users?: number | null
          created_at?: string | null
          creator_fees_distributed?: number | null
          date: string
          id?: string
          new_users?: number | null
          platform_fees_collected?: number | null
          tokens_created?: number | null
          tokens_graduated?: number | null
          tokens_rugged?: number | null
          total_trades?: number | null
          total_users?: number | null
          total_volume_sol?: number | null
          total_volume_usd?: number | null
        }
        Update: {
          active_users?: number | null
          created_at?: string | null
          creator_fees_distributed?: number | null
          date?: string
          id?: string
          new_users?: number | null
          platform_fees_collected?: number | null
          tokens_created?: number | null
          tokens_graduated?: number | null
          tokens_rugged?: number | null
          total_trades?: number | null
          total_users?: number | null
          total_volume_sol?: number | null
          total_volume_usd?: number | null
        }
        Relationships: []
      }
      price_history: {
        Row: {
          close: number
          created_at: string | null
          high: number
          id: string
          interval: string
          low: number
          open: number
          timestamp: string
          token_id: string
          volume: number
        }
        Insert: {
          close: number
          created_at?: string | null
          high: number
          id?: string
          interval: string
          low: number
          open: number
          timestamp: string
          token_id: string
          volume: number
        }
        Update: {
          close?: number
          created_at?: string | null
          high?: number
          id?: string
          interval?: string
          low?: number
          open?: number
          timestamp?: string
          token_id?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievement_points: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          discord_handle: string | null
          is_verified: boolean | null
          last_active: string | null
          metadata: Json | null
          total_profit_usd: number | null
          total_tokens_created: number | null
          total_volume_traded: number | null
          tournament_wins: number | null
          twitter_handle: string | null
          username: string | null
          wallet_address: string
        }
        Insert: {
          achievement_points?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discord_handle?: string | null
          is_verified?: boolean | null
          last_active?: string | null
          metadata?: Json | null
          total_profit_usd?: number | null
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          tournament_wins?: number | null
          twitter_handle?: string | null
          username?: string | null
          wallet_address: string
        }
        Update: {
          achievement_points?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          discord_handle?: string | null
          is_verified?: boolean | null
          last_active?: string | null
          metadata?: Json | null
          total_profit_usd?: number | null
          total_tokens_created?: number | null
          total_volume_traded?: number | null
          tournament_wins?: number | null
          twitter_handle?: string | null
          username?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      tokens: {
        Row: {
          achievement_multiplier: number | null
          ai_generated: boolean | null
          ai_model: string | null
          ai_prompt: string | null
          bonding_curve_address: string
          created_at: string | null
          creator_wallet: string
          current_price: number | null
          description: string | null
          graduated_at: string | null
          graduation_market_cap: number | null
          holder_count: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_graduated: boolean | null
          is_honeypot: boolean | null
          is_rugpull: boolean | null
          last_trade_at: string | null
          market_cap: number | null
          metadata_address: string | null
          mint_address: string
          name: string
          price_change_24h: number | null
          raydium_pool_address: string | null
          real_sol_reserves: number | null
          real_token_reserves: number | null
          symbol: string
          telegram_url: string | null
          token_supply: number | null
          transaction_count: number | null
          twitter_url: string | null
          updated_at: string | null
          virtual_sol_reserves: number | null
          virtual_token_reserves: number | null
          volume_24h: number | null
          website_url: string | null
        }
        Insert: {
          achievement_multiplier?: number | null
          ai_generated?: boolean | null
          ai_model?: string | null
          ai_prompt?: string | null
          bonding_curve_address: string
          created_at?: string | null
          creator_wallet: string
          current_price?: number | null
          description?: string | null
          graduated_at?: string | null
          graduation_market_cap?: number | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_graduated?: boolean | null
          is_honeypot?: boolean | null
          is_rugpull?: boolean | null
          last_trade_at?: string | null
          market_cap?: number | null
          metadata_address?: string | null
          mint_address: string
          name: string
          price_change_24h?: number | null
          raydium_pool_address?: string | null
          real_sol_reserves?: number | null
          real_token_reserves?: number | null
          symbol: string
          telegram_url?: string | null
          token_supply?: number | null
          transaction_count?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          virtual_sol_reserves?: number | null
          virtual_token_reserves?: number | null
          volume_24h?: number | null
          website_url?: string | null
        }
        Update: {
          achievement_multiplier?: number | null
          ai_generated?: boolean | null
          ai_model?: string | null
          ai_prompt?: string | null
          bonding_curve_address?: string
          created_at?: string | null
          creator_wallet?: string
          current_price?: number | null
          description?: string | null
          graduated_at?: string | null
          graduation_market_cap?: number | null
          holder_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_graduated?: boolean | null
          is_honeypot?: boolean | null
          is_rugpull?: boolean | null
          last_trade_at?: string | null
          market_cap?: number | null
          metadata_address?: string | null
          mint_address?: string
          name?: string
          price_change_24h?: number | null
          raydium_pool_address?: string | null
          real_sol_reserves?: number | null
          real_token_reserves?: number | null
          symbol?: string
          telegram_url?: string | null
          token_supply?: number | null
          transaction_count?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          virtual_sol_reserves?: number | null
          virtual_token_reserves?: number | null
          volume_24h?: number | null
          website_url?: string | null
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
      tournament_entries: {
        Row: {
          id: string
          joined_at: string | null
          metadata: Json | null
          prize_claimed: boolean | null
          prize_won: number | null
          rank: number | null
          score: number | null
          tournament_id: string
          updated_at: string | null
          user_wallet: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          metadata?: Json | null
          prize_claimed?: boolean | null
          prize_won?: number | null
          rank?: number | null
          score?: number | null
          tournament_id: string
          updated_at?: string | null
          user_wallet: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          metadata?: Json | null
          prize_claimed?: boolean | null
          prize_won?: number | null
          rank?: number | null
          score?: number | null
          tournament_id?: string
          updated_at?: string | null
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_entries_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string
          entry_fee: number | null
          id: string
          is_active: boolean | null
          is_completed: boolean | null
          max_participants: number | null
          metric: string
          min_participants: number | null
          name: string
          prize_distribution: Json | null
          prize_pool: number | null
          start_time: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time: string
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          max_participants?: number | null
          metric: string
          min_participants?: number | null
          name: string
          prize_distribution?: Json | null
          prize_pool?: number | null
          start_time: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_completed?: boolean | null
          max_participants?: number | null
          metric?: string
          min_participants?: number | null
          name?: string
          prize_distribution?: Json | null
          prize_pool?: number | null
          start_time?: string
          type?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          block_time: string | null
          client_source: string | null
          confirmed_at: string | null
          created_at: string | null
          creator_fee: number | null
          id: string
          market_cap_after: number | null
          market_cap_before: number | null
          platform_fee: number | null
          price_impact: number | null
          price_per_token: number
          priority_fee: number | null
          profit_loss: number | null
          profit_percentage: number | null
          referral_fee: number | null
          referred_by: string | null
          signature: string
          slippage_tolerance: number | null
          slot: number | null
          sol_amount: number
          token_amount: number
          token_id: string
          trade_type: string
          trader_wallet: string
        }
        Insert: {
          block_time?: string | null
          client_source?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          creator_fee?: number | null
          id?: string
          market_cap_after?: number | null
          market_cap_before?: number | null
          platform_fee?: number | null
          price_impact?: number | null
          price_per_token: number
          priority_fee?: number | null
          profit_loss?: number | null
          profit_percentage?: number | null
          referral_fee?: number | null
          referred_by?: string | null
          signature: string
          slippage_tolerance?: number | null
          slot?: number | null
          sol_amount: number
          token_amount: number
          token_id: string
          trade_type: string
          trader_wallet: string
        }
        Update: {
          block_time?: string | null
          client_source?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          creator_fee?: number | null
          id?: string
          market_cap_after?: number | null
          market_cap_before?: number | null
          platform_fee?: number | null
          price_impact?: number | null
          price_per_token?: number
          priority_fee?: number | null
          profit_loss?: number | null
          profit_percentage?: number | null
          referral_fee?: number | null
          referred_by?: string | null
          signature?: string
          slippage_tolerance?: number | null
          slot?: number | null
          sol_amount?: number
          token_amount?: number
          token_id?: string
          trade_type?: string
          trader_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_tokens: {
        Row: {
          created_at: string | null
          expires_at: string | null
          holder_score: number | null
          id: string
          momentum_score: number | null
          rank: number | null
          score: number | null
          social_score: number | null
          timeframe: string | null
          token_id: string
          volume_score: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          holder_score?: number | null
          id?: string
          momentum_score?: number | null
          rank?: number | null
          score?: number | null
          social_score?: number | null
          timeframe?: string | null
          token_id: string
          volume_score?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          holder_score?: number | null
          id?: string
          momentum_score?: number | null
          rank?: number | null
          score?: number | null
          social_score?: number | null
          timeframe?: string | null
          token_id?: string
          volume_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trending_tokens_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          claimed: boolean | null
          claimed_at: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          progress: number | null
          updated_at: string | null
          user_wallet: string
        }
        Insert: {
          achievement_id: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          updated_at?: string | null
          user_wallet: string
        }
        Update: {
          achievement_id?: string
          claimed?: boolean | null
          claimed_at?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress?: number | null
          updated_at?: string | null
          user_wallet?: string
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
      user_holdings: {
        Row: {
          average_buy_price: number | null
          first_bought_at: string | null
          id: string
          last_traded_at: string | null
          realized_pnl: number | null
          token_balance: number | null
          token_id: string
          total_invested: number | null
          total_returned: number | null
          unrealized_pnl: number | null
          user_wallet: string
        }
        Insert: {
          average_buy_price?: number | null
          first_bought_at?: string | null
          id?: string
          last_traded_at?: string | null
          realized_pnl?: number | null
          token_balance?: number | null
          token_id: string
          total_invested?: number | null
          total_returned?: number | null
          unrealized_pnl?: number | null
          user_wallet: string
        }
        Update: {
          average_buy_price?: number | null
          first_bought_at?: string | null
          id?: string
          last_traded_at?: string | null
          realized_pnl?: number | null
          token_balance?: number | null
          token_id?: string
          total_invested?: number | null
          total_returned?: number | null
          unrealized_pnl?: number | null
          user_wallet?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_holdings_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_market_cap: {
        Args: { price: number; total_supply: number }
        Returns: number
      }
      calculate_token_price: {
        Args: { sol_reserves: number; token_reserves: number }
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
