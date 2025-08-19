import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWalletAuth } from './useWalletAuth';

interface CreatorCredits {
  daily_credits: number;
  last_reset: string;
  created_at: string;
  updated_at: string;
}

interface CreatorLimits {
  maxTokensPerDay: number;
  maxTokensPerWeek: number;
  cooldownHours: number;
  requiresVerification: boolean;
}

export const useCreatorControls = () => {
  const { walletAddress } = useWalletAuth();
  const queryClient = useQueryClient();

  // Get user's current credits
  const { data: credits, isLoading: creditsLoading } = useQuery({
    queryKey: ['creator-credits', walletAddress],
    queryFn: async (): Promise<CreatorCredits | null> => {
      if (!walletAddress) return null;
      
      const { data, error } = await supabase
        .from('creator_credits')
        .select('*')
        .eq('user_id', walletAddress)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
  });

  // Get user's token creation history
  const { data: tokenHistory } = useQuery({
    queryKey: ['creator-token-history', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      
      const { data, error } = await supabase
        .from('tokens')
        .select('id, name, created_at, market_cap')
        .eq('creator_wallet', walletAddress)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!walletAddress,
  });

  // Initialize credits for new users
  const initializeCredits = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected');
      
      const { error } = await supabase.rpc('initialize_creator_credits', {
        p_user_wallet: walletAddress
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-credits', walletAddress] });
    },
  });

  // Initialize credits when wallet is connected but no credits exist
  useEffect(() => {
    if (walletAddress && !creditsLoading && !credits) {
      initializeCredits.mutate();
    }
  }, [walletAddress, creditsLoading, credits]);

  // Check if user can create tokens
  const canCreateToken = () => {
    if (!credits) return false;
    
    // Basic credit check
    if (credits.daily_credits <= 0) return false;
    
    // Check if it's been more than 24 hours since last reset
    const lastReset = new Date(credits.last_reset);
    const now = new Date();
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      // Credits should be reset - this happens automatically via DB function
      return true;
    }
    
    return credits.daily_credits > 0;
  };

  // Get tokens created today
  const getTokensCreatedToday = () => {
    if (!tokenHistory) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tokenHistory.filter(token => {
      const tokenDate = new Date(token.created_at);
      return tokenDate >= today;
    }).length;
  };

  // Check creator limits
  const checkCreatorLimits = (): { allowed: boolean; reason?: string; limits: CreatorLimits } => {
    const limits: CreatorLimits = {
      maxTokensPerDay: 999, // Removed for testing
      maxTokensPerWeek: 999, // Removed for testing
      cooldownHours: 0, // Removed for testing
      requiresVerification: false
    };

    if (!walletAddress) {
      return { allowed: false, reason: 'Wallet not connected', limits };
    }

    // For testing: always allow token creation if wallet is connected
    return { allowed: true, limits };
  };

  // Consume a creator credit
  const consumeCredit = useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected');
      
      const { data, error } = await supabase.rpc('get_user_credits', {
        user_wallet: walletAddress
      });
      
      if (error) throw error;
      
      if (data <= 0) {
        throw new Error('No credits remaining');
      }

      // Deduct a credit
      const { error: updateError } = await supabase
        .from('creator_credits')
        .update({ 
          daily_credits: data - 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', walletAddress);

      if (updateError) throw updateError;
      
      return data - 1;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-credits', walletAddress] });
    },
  });

  return {
    credits,
    creditsLoading,
    tokenHistory,
    canCreateToken: canCreateToken(),
    tokensCreatedToday: getTokensCreatedToday(),
    creatorLimits: checkCreatorLimits(),
    consumeCredit,
  };
};