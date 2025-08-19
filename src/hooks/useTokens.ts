import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Token {
  id: string;
  creator_wallet: string;
  name: string;
  symbol: string;
  description?: string;
  image_url?: string;
  mint_address?: string;
  total_supply: number;
  creation_fee: number;
  market_cap: number;
  price: number;
  volume_24h: number;
  holder_count: number;
  created_at: string;
  updated_at: string;
}

export const useTokens = (limit = 10) => {
  return useQuery({
    queryKey: ['tokens', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Token[];
    },
  });
};

export const useRecentTokens = () => {
  return useTokens(6);
};