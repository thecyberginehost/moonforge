import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface TokenPriceData {
  mint: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  lastUpdated: string;
}

interface PriceFeedOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

export const useTokenPriceFeed = (mintAddress: string, options: PriceFeedOptions = {}) => {
  const { refetchInterval = 30000, enabled = true } = options;

  return useQuery({
    queryKey: ['token-price', mintAddress],
    queryFn: async (): Promise<TokenPriceData> => {
      const { data, error } = await supabase.functions.invoke('helius-price-feed', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({ mint: mintAddress })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    },
    enabled: enabled && !!mintAddress,
    refetchInterval,
    staleTime: 15000, // Data considered fresh for 15 seconds
    gcTime: 300000, // Cache for 5 minutes
  });
};

export const useMultiTokenPriceFeeds = (mintAddresses: string[], options: PriceFeedOptions = {}) => {
  const { refetchInterval = 60000, enabled = true } = options;

  return useQuery({
    queryKey: ['multi-token-prices', mintAddresses.sort()],
    queryFn: async (): Promise<TokenPriceData[]> => {
      if (mintAddresses.length === 0) return [];

      const { data, error } = await supabase.functions.invoke('helius-price-feed', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({ tokens: mintAddresses.join(',') })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    },
    enabled: enabled && mintAddresses.length > 0,
    refetchInterval,
    staleTime: 30000, // Data considered fresh for 30 seconds
    gcTime: 300000, // Cache for 5 minutes
  });
};

export const useRealTimePriceUpdates = (mintAddresses: string[]) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (mintAddresses.length === 0) return;

    // Set up real-time subscription for price updates
    const channel = supabase
      .channel('price-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tokens',
          filter: `mint_address=in.(${mintAddresses.join(',')})`
        },
        (payload) => {
          console.log('Real-time price update:', payload);
          
          // Update specific token price cache
          if (payload.new.mint_address) {
            queryClient.setQueryData(
              ['token-price', payload.new.mint_address],
              {
                mint: payload.new.mint_address,
                price: payload.new.price,
                marketCap: payload.new.market_cap,
                volume24h: payload.new.volume_24h,
                priceChange24h: 0, // Would need to calculate this
                lastUpdated: payload.new.updated_at
              }
            );
          }

          // Invalidate multi-token queries that include this mint
          queryClient.invalidateQueries({
            queryKey: ['multi-token-prices'],
            exact: false
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mintAddresses, queryClient]);
};

export const usePriceHistory = (mintAddress: string, timeframe: '1h' | '24h' | '7d' = '24h') => {
  return useQuery({
    queryKey: ['price-history', mintAddress, timeframe],
    queryFn: async () => {
      // For now, return empty array as historical price data needs to be collected over time
      // In the future, you could create a price_history table to store historical data
      return [];
    },
    enabled: !!mintAddress,
    staleTime: 60000, // Historical data is less frequently updated
  });
};

function getTimeframeStart(timeframe: '1h' | '24h' | '7d'): string {
  const now = new Date();
  switch (timeframe) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}