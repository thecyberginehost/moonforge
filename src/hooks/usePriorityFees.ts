import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PriorityFeeData {
  priorityFees: {
    min: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
    unsafeMax: number;
  };
  recommendedFee: number;
}

export const usePriorityFees = () => {
  return useQuery({
    queryKey: ['priority-fees'],
    queryFn: async (): Promise<PriorityFeeData> => {
      const { data, error } = await supabase.functions.invoke('get-priority-fee');
      
      if (error) {
        console.error('Priority fee fetch error:', error);
        // Return fallback values
        return {
          priorityFees: {
            min: 100,
            low: 1000,
            medium: 5000,
            high: 10000,
            veryHigh: 50000,
            unsafeMax: 100000,
          },
          recommendedFee: 5000
        };
      }
      
      return data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
  });
};