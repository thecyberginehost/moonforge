import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PriorityFeeData {
  priorityFeeEstimate: number;
  priorityFeeLevels: {
    min: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
    unsafeMax: number;
  };
  microLamportsPerCu: number;
  recommended: number;
}

interface PriorityFeeOptions {
  accountKeys?: string[];
  urgency?: 'low' | 'medium' | 'high' | 'veryHigh';
  enabled?: boolean;
}

export const usePriorityFees = (options: PriorityFeeOptions = {}) => {
  const { accountKeys, urgency = 'medium', enabled = true } = options;

  return useQuery({
    queryKey: ['priority-fees', accountKeys?.sort(), urgency],
    queryFn: async (): Promise<PriorityFeeData> => {
      if (accountKeys && accountKeys.length > 0) {
        // Get priority fees for specific accounts
        const { data, error } = await supabase.functions.invoke('helius-priority-fees', {
          method: 'POST',
          body: {
            accountKeys,
            options: {
              recommended: true,
              includeAllPriorityFeeLevels: true,
              lookbackSlots: 150
            }
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        return data.data;
      } else {
        // Get general priority fees
        const { data, error } = await supabase.functions.invoke('helius-priority-fees', {
          method: 'GET'
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        return data.data;
      }
    },
    enabled,
    staleTime: 10000, // Priority fees change frequently, 10 second cache
    gcTime: 60000, // Keep in cache for 1 minute
    refetchInterval: 15000, // Refetch every 15 seconds for active trading
  });
};

export const useOptimalPriorityFee = (urgency: 'low' | 'medium' | 'high' | 'veryHigh' = 'medium') => {
  const { data: priorityFees, isLoading, error } = usePriorityFees({ urgency });

  const optimalFee = priorityFees?.priorityFeeLevels?.[urgency] || priorityFees?.recommended || 50000;

  return {
    optimalFee,
    isLoading,
    error,
    allLevels: priorityFees?.priorityFeeLevels,
    recommendation: getRecommendationText(urgency, optimalFee)
  };
};

export const useDynamicPriorityFee = (accountKeys?: string[]) => {
  const { data: priorityFees, isLoading } = usePriorityFees({ accountKeys });

  // Dynamic fee selection based on network congestion
  const getDynamicFee = (tradeUrgency: 'normal' | 'fast' | 'instant' = 'normal') => {
    if (!priorityFees) return 50000; // Fallback

    const { priorityFeeLevels } = priorityFees;
    
    switch (tradeUrgency) {
      case 'normal':
        return priorityFeeLevels.medium;
      case 'fast':
        return priorityFeeLevels.high;
      case 'instant':
        return priorityFeeLevels.veryHigh;
      default:
        return priorityFeeLevels.medium;
    }
  };

  return {
    getDynamicFee,
    currentFees: priorityFees,
    isLoading,
    networkCongestion: getNetworkCongestionLevel(priorityFees)
  };
};

export const useBondingCurvePriorityFees = () => {
  // Specific priority fees for bonding curve operations
  const bondingCurveAccounts = [
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
    '11111111111111111111111111111111', // System program
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated token program
  ];

  return usePriorityFees({ 
    accountKeys: bondingCurveAccounts,
    urgency: 'medium' 
  });
};

function getRecommendationText(urgency: string, fee: number): string {
  const feeInSOL = fee / 1_000_000; // Convert micro-lamports to SOL
  
  switch (urgency) {
    case 'low':
      return `Low priority (${feeInSOL.toFixed(6)} SOL) - May take longer to confirm`;
    case 'medium':
      return `Recommended (${feeInSOL.toFixed(6)} SOL) - Balanced speed and cost`;
    case 'high':
      return `High priority (${feeInSOL.toFixed(6)} SOL) - Faster confirmation`;
    case 'veryHigh':
      return `Maximum priority (${feeInSOL.toFixed(6)} SOL) - Fastest confirmation`;
    default:
      return `Priority fee: ${feeInSOL.toFixed(6)} SOL`;
  }
}

function getNetworkCongestionLevel(priorityFees?: PriorityFeeData): 'low' | 'medium' | 'high' {
  if (!priorityFees) return 'medium';

  const { priorityFeeLevels } = priorityFees;
  const medianFee = priorityFeeLevels.medium;

  if (medianFee < 10000) return 'low';
  if (medianFee < 100000) return 'medium';
  return 'high';
}