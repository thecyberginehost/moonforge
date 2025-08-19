import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  badge_color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: any;
  reward_type?: string;
  reward_value?: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_wallet: string;
  achievement_type_id: string;
  token_id?: string;
  earned_at: string;
  metadata?: any;
  achievement_types: Achievement;
  tokens?: {
    name: string;
    symbol: string;
    image_url?: string;
  };
}

export const useAchievements = (walletAddress?: string) => {
  // Get all achievement types
  const { data: achievementTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['achievement-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievement_types')
        .select('*')
        .order('rarity', { ascending: false });
      
      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Get user achievements
  const { data: userAchievements, isLoading: loadingUserAchievements } = useQuery({
    queryKey: ['user-achievements', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement_types (*),
          tokens (name, symbol, image_url)
        `)
        .eq('user_wallet', walletAddress)
        .order('earned_at', { ascending: false });
      
      if (error) throw error;
      return data as UserAchievement[];
    },
    enabled: !!walletAddress,
  });

  // Check and award achievements
  const queryClient = useQueryClient();
  const checkAchievements = useMutation({
    mutationFn: async ({ 
      userWallet, 
      tokenId, 
      checkType = 'all' 
    }: { 
      userWallet: string; 
      tokenId?: string; 
      checkType?: string; 
    }) => {
      const { error } = await supabase.rpc('check_and_award_achievements', {
        p_user_wallet: userWallet,
        p_token_id: tokenId,
        p_check_type: checkType,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh user achievements
      queryClient.invalidateQueries({ queryKey: ['user-achievements'] });
    },
    onError: (error: any) => {
      console.error('Error checking achievements:', error);
    },
  });

  // Get achievement stats
  const getAchievementStats = (userAchievements: UserAchievement[]) => {
    const stats = {
      total: userAchievements.length,
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      byCategory: {
        milestone: 0,
        creator: 0,
        community: 0,
        trading: 0,
      },
    };

    userAchievements.forEach((ua) => {
      const achievement = ua.achievement_types;
      stats[achievement.rarity as keyof typeof stats]++;
      stats.byCategory[achievement.category as keyof typeof stats.byCategory]++;
    });

    return stats;
  };

  // Show achievement notification
  const showAchievementNotification = (achievement: Achievement, tokenName?: string) => {
    const rarityColors = {
      common: '#10B981',
      rare: '#3B82F6',
      epic: '#8B5CF6',
      legendary: '#DC2626',
    };

    toast.success(
      `🎉 Achievement Unlocked: ${achievement.name}!`,
      {
        description: tokenName 
          ? `${achievement.description} (${tokenName})`
          : achievement.description,
        duration: 5000,
        style: {
          borderLeft: `4px solid ${rarityColors[achievement.rarity]}`,
        },
      }
    );
  };

  return {
    achievementTypes,
    userAchievements,
    isLoading: loadingTypes || loadingUserAchievements,
    checkAchievements: checkAchievements.mutate,
    isCheckingAchievements: checkAchievements.isPending,
    getAchievementStats,
    showAchievementNotification,
  };
};

export const useTokenAchievements = (tokenId: string, creatorWallet: string) => {
  const { checkAchievements } = useAchievements();

  // Check achievements when token metrics change
  const checkTokenAchievements = () => {
    if (creatorWallet && tokenId) {
      checkAchievements({
        userWallet: creatorWallet,
        tokenId,
        checkType: 'milestone',
      });
    }
  };

  return {
    checkTokenAchievements,
  };
};