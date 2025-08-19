
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorEarnings {
  id: string;
  creator_wallet: string;
  token_id: string;
  total_earned: number;
  claimable_amount: number;
  total_claimed: number;
  last_claim_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useCreatorEarnings = (walletAddress: string | undefined) => {
  return useQuery({
    queryKey: ['creator-earnings', walletAddress],
    queryFn: async (): Promise<CreatorEarnings[]> => {
      if (!walletAddress) return [];

      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_wallet', walletAddress)
        .order('total_earned', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!walletAddress,
  });
};

export const useTotalCreatorEarnings = (walletAddress: string | undefined) => {
  return useQuery({
    queryKey: ['total-creator-earnings', walletAddress],
    queryFn: async (): Promise<{ totalEarned: number; totalClaimable: number }> => {
      if (!walletAddress) return { totalEarned: 0, totalClaimable: 0 };

      const { data, error } = await supabase
        .from('creator_earnings')
        .select('total_earned, claimable_amount')
        .eq('creator_wallet', walletAddress);

      if (error) throw error;

      const totalEarned = data?.reduce((sum, earning) => sum + Number(earning.total_earned), 0) || 0;
      const totalClaimable = data?.reduce((sum, earning) => sum + Number(earning.claimable_amount), 0) || 0;

      return { totalEarned, totalClaimable };
    },
    enabled: !!walletAddress,
  });
};
