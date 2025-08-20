// src/hooks/useTokenAchievements.ts
// Hook to fetch and display token achievements

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  fee_discount_bps: number;
  earned: boolean;
  earned_at?: string;
  progress?: number;
  requirements: any;
}

export interface TokenAchievements {
  achievements: Achievement[];
  totalPoints: number;
  totalDiscount: number;
  weeklyAchievements: string[];
  nextMilestone?: Achievement;
}

export const useTokenAchievements = (tokenId: string) => {
  const [showNewAchievement, setShowNewAchievement] = useState<Achievement | null>(null);

  // Fetch all achievement definitions and token's earned achievements
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['token-achievements', tokenId],
    queryFn: async () => {
      // Get all achievement definitions
      const { data: definitions, error: defError } = await supabase
        .from('achievement_definitions')
        .select('*')
        .order('points', { ascending: false });

      if (defError) throw defError;

      // Get token's earned achievements
      const { data: earned, error: earnedError } = await supabase
        .from('token_achievements')
        .select(`
          *,
          achievement_definitions (*)
        `)
        .eq('token_id', tokenId);

      if (earnedError) throw earnedError;

      // Get current weekly achievements
      const { data: weekly, error: weeklyError } = await supabase
        .from('weekly_achievements')
        .select('*')
        .eq('is_active', true)
        .single();

      if (weeklyError) console.error('No active weekly achievements');

      // Get token data for progress calculation
      const { data: token, error: tokenError } = await supabase
        .from('tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      if (tokenError) throw tokenError;

      // Map achievements with earned status and progress
      const achievementsWithStatus = definitions.map(def => {
        const earnedAchievement = earned?.find(e => 
          e.achievement_definitions.id === def.id
        );
        
        // Calculate progress for unearned achievements
        let progress = 0;
        if (!earnedAchievement) {
          progress = calculateProgress(def, token);
        }

        return {
          ...def,
          earned: !!earnedAchievement,
          earned_at: earnedAchievement?.earned_at,
          progress,
        };
      });

      // Calculate totals
      const totalPoints = earned?.reduce((sum, e) => 
        sum + (e.achievement_definitions?.points || 0), 0
      ) || 0;

      const totalDiscount = Math.min(
        earned?.reduce((sum, e) => 
          sum + (e.achievement_definitions?.fee_discount_bps || 0), 0
        ) || 0,
        50 // Cap at 50 bps (0.5%) max discount
      );

      // Find next milestone
      const nextMilestone = achievementsWithStatus
        .filter(a => !a.earned && a.category === 'milestone')
        .sort((a, b) => (a.progress || 0) - (b.progress || 0))[0];

      return {
        achievements: achievementsWithStatus,
        totalPoints,
        totalDiscount,
        weeklyAchievements: weekly?.achievement_ids || [],
        nextMilestone,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to new achievements
  useEffect(() => {
    const channel = supabase
      .channel(`achievements-${tokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'token_achievements',
          filter: `token_id=eq.${tokenId}`,
        },
        async (payload) => {
          // Fetch the full achievement data
          const { data: achievement } = await supabase
            .from('achievement_definitions')
            .select('*')
            .eq('id', payload.new.achievement_id)
            .single();

          if (achievement) {
            setShowNewAchievement(achievement);
            // Use string message instead of JSX
            toast.success(`🏆 Achievement Unlocked: ${achievement.name}!`, {
              description: achievement.description,
              duration: 5000
            });
            
            // Refetch to update the list
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId, refetch]);

  return {
    achievements: data?.achievements || [],
    totalPoints: data?.totalPoints || 0,
    totalDiscount: data?.totalDiscount || 0,
    weeklyAchievements: data?.weeklyAchievements || [],
    nextMilestone: data?.nextMilestone,
    isLoading,
    refetch,
    showNewAchievement,
    setShowNewAchievement,
  };
};

// Helper function to calculate progress
function calculateProgress(achievement: any, token: any): number {
  const req = achievement.requirements;
  
  switch (req.type) {
    case 'holder_count':
      return Math.min((token.holder_count / req.value) * 100, 100);
    
    case 'sol_raised':
      return Math.min((token.sol_raised / req.value) * 100, 100);
    
    case 'volume_24h':
      return Math.min((token.volume_24h / req.value) * 100, 100);
    
    case 'market_cap':
      return Math.min((token.market_cap / req.value) * 100, 100);
    
    case 'comment_count':
      // You'd need to track this in your database
      return 0;
    
    default:
      return 0;
  }
}