import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TransactionAnalytics {
  signature: string;
  blockTime: number;
  slot: number;
  fee: number;
  success: boolean;
  instructions: any[];
  tokenTransfers: TokenTransfer[];
  swapData?: SwapData;
}

interface TokenTransfer {
  mint: string;
  from: string;
  to: string;
  amount: number;
  decimals: number;
}

interface SwapData {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  priceImpact: number;
}

interface WalletAnalytics {
  totalTrades: number;
  totalVolume: number;
  profitLoss: number;
  successRate: number;
  averageHoldTime: number;
  topTokens: Array<{
    mint: string;
    symbol: string;
    trades: number;
    volume: number;
    pnl: number;
  }>;
}

export const useTransactionAnalytics = (signature: string) => {
  return useQuery({
    queryKey: ['transaction-analytics', signature],
    queryFn: async (): Promise<TransactionAnalytics> => {
      const { data, error } = await supabase.functions.invoke('helius-parsed-transactions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({ signature })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    },
    enabled: !!signature,
    staleTime: 300000, // Transaction data doesn't change, cache for 5 minutes
  });
};

export const useWalletTransactionHistory = (walletAddress: string, limit = 50) => {
  return useQuery({
    queryKey: ['wallet-transactions', walletAddress, limit],
    queryFn: async (): Promise<TransactionAnalytics[]> => {
      const { data, error } = await supabase.functions.invoke('helius-parsed-transactions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({ 
          address: walletAddress,
          limit: limit.toString()
        })
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    },
    enabled: !!walletAddress,
    staleTime: 60000, // Cache for 1 minute
  });
};

export const useBatchTransactionAnalytics = (signatures: string[]) => {
  return useQuery({
    queryKey: ['batch-transaction-analytics', signatures.sort()],
    queryFn: async (): Promise<TransactionAnalytics[]> => {
      if (signatures.length === 0) return [];

      const { data, error } = await supabase.functions.invoke('helius-parsed-transactions', {
        method: 'POST',
        body: { signatures }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data;
    },
    enabled: signatures.length > 0,
    staleTime: 300000, // Transaction data doesn't change
  });
};

export const useWalletAnalytics = (walletAddress: string) => {
  return useQuery({
    queryKey: ['wallet-analytics', walletAddress],
    queryFn: async (): Promise<WalletAnalytics> => {
      // Fetch trading activities from database
      const { data: activities, error } = await supabase
        .from('trading_activities')
        .select(`
          *,
          tokens:token_id (symbol, name, mint_address)
        `)
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate analytics from trading activities
      const analytics = calculateWalletAnalytics(activities || []);
      
      return analytics;
    },
    enabled: !!walletAddress,
    staleTime: 120000, // Cache for 2 minutes
  });
};

export const useTokenHolderAnalytics = (mintAddress: string) => {
  return useQuery({
    queryKey: ['token-holder-analytics', mintAddress],
    queryFn: async (): Promise<any> => {
      // Get holder distribution and analytics
      const { data: portfolios, error } = await supabase
        .from('user_portfolios')
        .select(`
          user_wallet,
          token_amount,
          total_invested,
          first_purchase_at,
          last_activity_at,
          average_buy_price
        `)
        .eq('token_id', mintAddress)
        .gt('token_amount', 0)
        .order('token_amount', { ascending: false });

      if (error) throw error;

      return analyzeTokenHolders(portfolios || []);
    },
    enabled: !!mintAddress,
    staleTime: 300000, // Cache for 5 minutes
  });
};

export const useTradingMetrics = (tokenId: string, timeframe: '1h' | '24h' | '7d' = '24h') => {
  return useQuery({
    queryKey: ['trading-metrics', tokenId, timeframe],
    queryFn: async () => {
      const startTime = getTimeframeStart(timeframe);
      
      const { data: activities, error } = await supabase
        .from('trading_activities')
        .select('*')
        .eq('token_id', tokenId)
        .gte('created_at', startTime)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return calculateTradingMetrics(activities || []);
    },
    enabled: !!tokenId,
    staleTime: 60000, // Cache for 1 minute
  });
};

function calculateWalletAnalytics(activities: any[]): WalletAnalytics {
  const totalTrades = activities.length;
  const totalVolume = activities.reduce((sum, activity) => sum + (activity.amount_sol || 0), 0);
  const profitLoss = activities.reduce((sum, activity) => sum + (activity.profit_loss || 0), 0);
  
  const successfulTrades = activities.filter(activity => (activity.profit_loss || 0) > 0).length;
  const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;

  // Calculate average hold time
  const avgHoldTime = calculateAverageHoldTime(activities);

  // Group by token to get top tokens
  const tokenMap = new Map();
  activities.forEach(activity => {
    const token = activity.tokens;
    if (!token) return;

    if (!tokenMap.has(token.mint_address)) {
      tokenMap.set(token.mint_address, {
        mint: token.mint_address,
        symbol: token.symbol,
        trades: 0,
        volume: 0,
        pnl: 0
      });
    }

    const tokenData = tokenMap.get(token.mint_address);
    tokenData.trades += 1;
    tokenData.volume += activity.amount_sol || 0;
    tokenData.pnl += activity.profit_loss || 0;
  });

  const topTokens = Array.from(tokenMap.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  return {
    totalTrades,
    totalVolume,
    profitLoss,
    successRate,
    averageHoldTime: avgHoldTime,
    topTokens
  };
}

function calculateAverageHoldTime(activities: any[]): number {
  // This would require matching buy/sell pairs to calculate hold times
  // For now, return 0 as placeholder
  return 0;
}

function analyzeTokenHolders(portfolios: any[]) {
  const totalHolders = portfolios.length;
  const totalTokensHeld = portfolios.reduce((sum, p) => sum + (p.token_amount || 0), 0);
  const averageHolding = totalHolders > 0 ? totalTokensHeld / totalHolders : 0;

  // Calculate holder distribution
  const distribution = {
    whales: portfolios.filter(p => p.token_amount > 1000000).length, // > 1M tokens
    large: portfolios.filter(p => p.token_amount > 100000 && p.token_amount <= 1000000).length,
    medium: portfolios.filter(p => p.token_amount > 10000 && p.token_amount <= 100000).length,
    small: portfolios.filter(p => p.token_amount <= 10000).length
  };

  return {
    totalHolders,
    totalTokensHeld,
    averageHolding,
    distribution,
    topHolders: portfolios.slice(0, 10) // Top 10 holders
  };
}

function calculateTradingMetrics(activities: any[]) {
  const totalTrades = activities.length;
  const buys = activities.filter(a => a.activity_type === 'buy').length;
  const sells = activities.filter(a => a.activity_type === 'sell').length;
  const volume = activities.reduce((sum, a) => sum + (a.amount_sol || 0), 0);

  return {
    totalTrades,
    buys,
    sells,
    buyRatio: totalTrades > 0 ? (buys / totalTrades) * 100 : 0,
    volume,
    averageTradeSize: totalTrades > 0 ? volume / totalTrades : 0
  };
}

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