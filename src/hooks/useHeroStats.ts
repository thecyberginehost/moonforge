import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroStats {
  tokensForged: number;
  aiMemesGenerated: number;
  volume24h: number;
}

export const useHeroStats = () => {
  return useQuery({
    queryKey: ['hero-stats'],
    queryFn: async (): Promise<HeroStats> => {
      // Get total tokens count
      const { count: tokensCount } = await supabase
        .from('tokens')
        .select('*', { count: 'exact', head: true });

      // Get total volume from all tokens (sum of volume_24h)
      const { data: volumeData } = await supabase
        .from('tokens')
        .select('volume_24h');

      const totalVolume = volumeData?.reduce((sum, token) => sum + (token.volume_24h || 0), 0) || 0;

      return {
        tokensForged: tokensCount || 0,
        aiMemesGenerated: tokensCount || 0, // For now, assume AI generated = tokens created
        volume24h: totalVolume,
      };
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};