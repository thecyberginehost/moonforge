import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';

interface PortfolioToken {
  id: string;
  symbol: string;
  name: string;
  mint_address: string;
  current_price: number;
  amount_held: number;
  total_invested: number;
  average_buy_price: number;
  current_value: number;
  profit_loss: number;
  profit_percentage: number;
  first_purchase_at: string;
  last_activity_at: string;
}

interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitPercentage: number;
  bestPerformer: PortfolioToken | null;
  worstPerformer: PortfolioToken | null;
  tokenCount: number;
  avgHoldTime: number;
  winRate: number;
}

interface TradingPerformance {
  totalTrades: number;
  profitableTrades: number;
  losingTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  sharpeRatio: number;
}

interface RiskMetrics {
  portfolioVolatility: number;
  maxDrawdown: number;
  valueAtRisk: number; // 5% VaR
  diversificationScore: number;
  riskScore: 'low' | 'medium' | 'high' | 'extreme';
}

export const useEnhancedPortfolio = (walletAddress: string) => {
  return useQuery({
    queryKey: ['enhanced-portfolio', walletAddress],
    queryFn: async (): Promise<{ tokens: PortfolioToken[]; metrics: PortfolioMetrics }> => {
      if (!walletAddress) return { tokens: [], metrics: getEmptyMetrics() };

      // Get portfolio data with current token prices
      const { data: portfolioData, error } = await supabase
        .from('user_portfolios')
        .select(`
          *,
          tokens:token_id (
            id,
            symbol,
            name,
            mint_address,
            price,
            market_cap
          )
        `)
        .eq('user_wallet', walletAddress)
        .gt('token_amount', 0);

      if (error) throw error;

      const tokens: PortfolioToken[] = (portfolioData || []).map(portfolio => {
        const token = portfolio.tokens as any;
        const currentValue = portfolio.token_amount * (token.price || 0);
        const profitLoss = currentValue - portfolio.total_invested;
        const profitPercentage = portfolio.total_invested > 0 
          ? (profitLoss / portfolio.total_invested) * 100 
          : 0;

        return {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          mint_address: token.mint_address,
          current_price: token.price || 0,
          amount_held: portfolio.token_amount,
          total_invested: portfolio.total_invested,
          average_buy_price: portfolio.average_buy_price,
          current_value: currentValue,
          profit_loss: profitLoss,
          profit_percentage: profitPercentage,
          first_purchase_at: portfolio.first_purchase_at,
          last_activity_at: portfolio.last_activity_at
        };
      });

      const metrics = calculatePortfolioMetrics(tokens);

      return { tokens, metrics };
    },
    enabled: !!walletAddress,
    staleTime: 30000, // Refresh every 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });
};

export const useTradingPerformance = (walletAddress: string, timeframe: '24h' | '7d' | '30d' | 'all' = 'all') => {
  return useQuery({
    queryKey: ['trading-performance', walletAddress, timeframe],
    queryFn: async (): Promise<TradingPerformance> => {
      if (!walletAddress) return getEmptyPerformance();

      const startDate = getTimeframeStart(timeframe);
      
      let query = supabase
        .from('trading_activities')
        .select('*')
        .eq('user_wallet', walletAddress);

      if (timeframe !== 'all') {
        query = query.gte('created_at', startDate);
      }

      const { data: trades, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return calculateTradingPerformance(trades || []);
    },
    enabled: !!walletAddress,
    staleTime: 120000, // Cache for 2 minutes
  });
};

export const useRiskMetrics = (walletAddress: string) => {
  return useQuery({
    queryKey: ['risk-metrics', walletAddress],
    queryFn: async (): Promise<RiskMetrics> => {
      if (!walletAddress) return getEmptyRiskMetrics();

      // Get historical trading data for risk calculations
      const { data: trades, error } = await supabase
        .from('trading_activities')
        .select('*')
        .eq('user_wallet', walletAddress)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: true });

      if (error) throw error;

      return calculateRiskMetrics(trades || []);
    },
    enabled: !!walletAddress,
    staleTime: 300000, // Cache for 5 minutes
  });
};

export const usePortfolioOptimization = (walletAddress: string) => {
  const { data: portfolio } = useEnhancedPortfolio(walletAddress);
  const { data: riskMetrics } = useRiskMetrics(walletAddress);

  const recommendations = useMemo(() => {
    if (!portfolio || !riskMetrics) return [];

    const suggestions: string[] = [];

    // Diversification recommendations
    if (portfolio.metrics.tokenCount < 5) {
      suggestions.push('Consider diversifying across 5-10 different tokens to reduce risk');
    }

    // Risk management
    if (riskMetrics.riskScore === 'high' || riskMetrics.riskScore === 'extreme') {
      suggestions.push('Your portfolio has high risk. Consider taking some profits or reducing position sizes');
    }

    // Profit taking recommendations
    const highProfitTokens = portfolio.tokens.filter(t => t.profit_percentage > 100);
    if (highProfitTokens.length > 0) {
      suggestions.push(`Consider taking profits on ${highProfitTokens.length} tokens with >100% gains`);
    }

    // Loss cutting recommendations
    const highLossTokens = portfolio.tokens.filter(t => t.profit_percentage < -50);
    if (highLossTokens.length > 0) {
      suggestions.push(`Review ${highLossTokens.length} tokens with >50% losses for potential exit`);
    }

    // Rebalancing recommendations
    if (riskMetrics.diversificationScore < 0.6) {
      suggestions.push('Portfolio is concentrated. Consider rebalancing to improve diversification');
    }

    return suggestions;
  }, [portfolio, riskMetrics]);

  return {
    portfolio,
    riskMetrics,
    recommendations,
    optimizationScore: calculateOptimizationScore(portfolio?.metrics, riskMetrics)
  };
};

export const useRealTimePortfolioUpdates = (walletAddress: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!walletAddress) return;

    // Subscribe to portfolio updates
    const channel = supabase
      .channel('portfolio-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_portfolios',
          filter: `user_wallet=eq.${walletAddress}`
        },
        () => {
          // Invalidate portfolio queries when portfolio changes
          queryClient.invalidateQueries({
            queryKey: ['enhanced-portfolio', walletAddress]
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_activities',
          filter: `user_wallet=eq.${walletAddress}`
        },
        () => {
          // Invalidate trading performance when new trades are made
          queryClient.invalidateQueries({
            queryKey: ['trading-performance', walletAddress]
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [walletAddress, queryClient]);
};

// Helper functions
function calculatePortfolioMetrics(tokens: PortfolioToken[]): PortfolioMetrics {
  if (tokens.length === 0) return getEmptyMetrics();

  const totalValue = tokens.reduce((sum, token) => sum + token.current_value, 0);
  const totalInvested = tokens.reduce((sum, token) => sum + token.total_invested, 0);
  const totalProfitLoss = totalValue - totalInvested;
  const totalProfitPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  const sortedByProfit = [...tokens].sort((a, b) => b.profit_percentage - a.profit_percentage);
  const bestPerformer = sortedByProfit[0] || null;
  const worstPerformer = sortedByProfit[sortedByProfit.length - 1] || null;

  const profitableTokens = tokens.filter(t => t.profit_loss > 0);
  const winRate = tokens.length > 0 ? (profitableTokens.length / tokens.length) * 100 : 0;

  // Calculate average hold time
  const now = new Date();
  const avgHoldTime = tokens.reduce((sum, token) => {
    const purchaseDate = new Date(token.first_purchase_at);
    const holdDays = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
    return sum + holdDays;
  }, 0) / tokens.length;

  return {
    totalValue,
    totalInvested,
    totalProfitLoss,
    totalProfitPercentage,
    bestPerformer,
    worstPerformer,
    tokenCount: tokens.length,
    avgHoldTime,
    winRate
  };
}

function calculateTradingPerformance(trades: any[]): TradingPerformance {
  if (trades.length === 0) return getEmptyPerformance();

  const totalTrades = trades.length;
  const profitableTrades = trades.filter(t => (t.profit_loss || 0) > 0).length;
  const losingTrades = trades.filter(t => (t.profit_loss || 0) < 0).length;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

  const profits = trades.filter(t => (t.profit_loss || 0) > 0).map(t => t.profit_loss || 0);
  const losses = trades.filter(t => (t.profit_loss || 0) < 0).map(t => Math.abs(t.profit_loss || 0));

  const avgProfit = profits.length > 0 ? profits.reduce((a, b) => a + b, 0) / profits.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const largestWin = profits.length > 0 ? Math.max(...profits) : 0;
  const largestLoss = losses.length > 0 ? Math.max(...losses) : 0;

  const totalProfit = profits.reduce((a, b) => a + b, 0);
  const totalLoss = losses.reduce((a, b) => a + b, 0);
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  // Simplified Sharpe ratio calculation
  const returns = trades.map(t => (t.profit_percentage || 0) / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const returnVariance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const sharpeRatio = Math.sqrt(returnVariance) > 0 ? avgReturn / Math.sqrt(returnVariance) : 0;

  return {
    totalTrades,
    profitableTrades,
    losingTrades,
    winRate,
    avgProfit,
    avgLoss,
    largestWin,
    largestLoss,
    profitFactor,
    sharpeRatio
  };
}

function calculateRiskMetrics(trades: any[]): RiskMetrics {
  if (trades.length === 0) return getEmptyRiskMetrics();

  // Calculate portfolio volatility
  const returns = trades.map(t => (t.profit_percentage || 0) / 100);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const portfolioVolatility = Math.sqrt(variance) * 100; // Convert to percentage

  // Calculate max drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let runningValue = 100; // Start with 100 as baseline

  for (const trade of trades) {
    runningValue *= (1 + (trade.profit_percentage || 0) / 100);
    if (runningValue > peak) {
      peak = runningValue;
    }
    const drawdown = (peak - runningValue) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  // Value at Risk (5% worst case scenario)
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const varIndex = Math.floor(sortedReturns.length * 0.05);
  const valueAtRisk = sortedReturns[varIndex] || 0;

  // Diversification score (simplified based on unique tokens traded)
  const uniqueTokens = new Set(trades.map(t => t.token_id)).size;
  const diversificationScore = Math.min(uniqueTokens / 10, 1); // Normalized to 0-1, optimal at 10+ tokens

  // Risk score calculation
  let riskScore: 'low' | 'medium' | 'high' | 'extreme' = 'low';
  if (portfolioVolatility > 100 || maxDrawdown > 0.8) {
    riskScore = 'extreme';
  } else if (portfolioVolatility > 50 || maxDrawdown > 0.5) {
    riskScore = 'high';
  } else if (portfolioVolatility > 25 || maxDrawdown > 0.3) {
    riskScore = 'medium';
  }

  return {
    portfolioVolatility,
    maxDrawdown: maxDrawdown * 100, // Convert to percentage
    valueAtRisk: valueAtRisk * 100, // Convert to percentage
    diversificationScore,
    riskScore
  };
}

function calculateOptimizationScore(metrics?: PortfolioMetrics, riskMetrics?: RiskMetrics): number {
  if (!metrics || !riskMetrics) return 0;

  let score = 50; // Base score

  // Profit performance (max 30 points)
  if (metrics.totalProfitPercentage > 50) score += 30;
  else if (metrics.totalProfitPercentage > 20) score += 20;
  else if (metrics.totalProfitPercentage > 0) score += 10;
  else if (metrics.totalProfitPercentage > -20) score += 5;
  else score -= 10;

  // Risk management (max 20 points)
  if (riskMetrics.riskScore === 'low') score += 20;
  else if (riskMetrics.riskScore === 'medium') score += 10;
  else if (riskMetrics.riskScore === 'high') score -= 5;
  else score -= 15;

  // Diversification (max 20 points)
  score += riskMetrics.diversificationScore * 20;

  // Win rate (max 20 points)
  score += (metrics.winRate / 100) * 20;

  // Max drawdown penalty
  if (riskMetrics.maxDrawdown > 50) score -= 20;
  else if (riskMetrics.maxDrawdown > 30) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getEmptyMetrics(): PortfolioMetrics {
  return {
    totalValue: 0,
    totalInvested: 0,
    totalProfitLoss: 0,
    totalProfitPercentage: 0,
    bestPerformer: null,
    worstPerformer: null,
    tokenCount: 0,
    avgHoldTime: 0,
    winRate: 0
  };
}

function getEmptyPerformance(): TradingPerformance {
  return {
    totalTrades: 0,
    profitableTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    profitFactor: 0,
    sharpeRatio: 0
  };
}

function getEmptyRiskMetrics(): RiskMetrics {
  return {
    portfolioVolatility: 0,
    maxDrawdown: 0,
    valueAtRisk: 0,
    diversificationScore: 0,
    riskScore: 'low'
  };
}

function getTimeframeStart(timeframe: '24h' | '7d' | '30d' | 'all'): string {
  const now = new Date();
  switch (timeframe) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(0).toISOString();
  }
}