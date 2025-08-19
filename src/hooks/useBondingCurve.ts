import { useMemo } from 'react';

// Bonding curve constants (based on pump.fun)
export const BONDING_CURVE_CONFIG = {
  TOTAL_SUPPLY: 1_000_000_000, // 1B tokens
  BONDING_CURVE_SUPPLY: 800_000_000, // 800M tokens in bonding curve
  CREATOR_SUPPLY: 200_000_000, // 200M tokens to creator
  GRADUATION_THRESHOLD: 75_000, // $75k market cap
  VIRTUAL_SOL_RESERVES: 30, // Virtual SOL liquidity
  VIRTUAL_TOKEN_RESERVES: 1_073_000_000, // Virtual token liquidity
};

export interface BondingCurveState {
  // Current state
  tokensRemaining: number;
  tokensSold: number;
  solRaised: number;
  currentPrice: number;
  marketCap: number;
  
  // Progress
  progressPercentage: number;
  isGraduated: boolean;
  
  // Virtual AMM state
  virtualSolReserves: number;
  virtualTokenReserves: number;
}

export interface TradeResult {
  tokensOut: number;
  solIn: number;
  priceAfter: number;
  marketCapAfter: number;
  newTokensRemaining: number;
  newSolRaised: number;
}

export const useBondingCurve = (currentSolRaised: number = 0, tokensSold: number = 0) => {
  const state = useMemo((): BondingCurveState => {
    // Calculate virtual reserves based on current state
    const virtualSolReserves = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + currentSolRaised;
    const virtualTokenReserves = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - tokensSold;
    
    // Current price using constant product formula
    const currentPrice = virtualSolReserves / virtualTokenReserves;
    
    // Market cap calculation
    const marketCap = currentPrice * BONDING_CURVE_CONFIG.TOTAL_SUPPLY;
    
    // Progress calculation
    const tokensRemaining = BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY - tokensSold;
    const progressPercentage = (tokensSold / BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY) * 100;
    
    // Graduation check
    const isGraduated = marketCap >= BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD;
    
    return {
      tokensRemaining,
      tokensSold,
      solRaised: currentSolRaised,
      currentPrice,
      marketCap,
      progressPercentage,
      isGraduated,
      virtualSolReserves,
      virtualTokenReserves,
    };
  }, [currentSolRaised, tokensSold]);

  // Calculate trade output for a given SOL input
  const calculateBuy = (solIn: number): TradeResult => {
    const { virtualSolReserves, virtualTokenReserves, tokensRemaining } = state;
    
    // Constant product formula: x * y = k
    const k = virtualSolReserves * virtualTokenReserves;
    const newSolReserves = virtualSolReserves + solIn;
    const newTokenReserves = k / newSolReserves;
    
    const tokensOut = virtualTokenReserves - newTokenReserves;
    
    // Ensure we don't exceed available tokens
    const actualTokensOut = Math.min(tokensOut, tokensRemaining);
    const actualSolIn = actualTokensOut === tokensOut ? solIn : 
      virtualSolReserves * actualTokensOut / (virtualTokenReserves - actualTokensOut);
    
    // Calculate new state
    const newSolRaised = state.solRaised + actualSolIn;
    const newTokensSold = state.tokensSold + actualTokensOut;
    const newTokensRemaining = BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY - newTokensSold;
    
    // New price after trade
    const newVirtualSolReserves = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + newSolRaised;
    const newVirtualTokenReserves = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - newTokensSold;
    const priceAfter = newVirtualSolReserves / newVirtualTokenReserves;
    const marketCapAfter = priceAfter * BONDING_CURVE_CONFIG.TOTAL_SUPPLY;
    
    return {
      tokensOut: actualTokensOut,
      solIn: actualSolIn,
      priceAfter,
      marketCapAfter,
      newTokensRemaining,
      newSolRaised,
    };
  };

  // Calculate SOL output for selling tokens
  const calculateSell = (tokensIn: number): TradeResult => {
    const { virtualSolReserves, virtualTokenReserves } = state;
    
    // Constant product formula: x * y = k
    const k = virtualSolReserves * virtualTokenReserves;
    const newTokenReserves = virtualTokenReserves + tokensIn;
    const newSolReserves = k / newTokenReserves;
    
    const solOut = virtualSolReserves - newSolReserves;
    
    // Calculate new state
    const newSolRaised = Math.max(0, state.solRaised - solOut);
    const newTokensSold = Math.max(0, state.tokensSold - tokensIn);
    const newTokensRemaining = BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY - newTokensSold;
    
    // New price after trade
    const newVirtualSolReserves = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + newSolRaised;
    const newVirtualTokenReserves = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - newTokensSold;
    const priceAfter = newVirtualSolReserves / newVirtualTokenReserves;
    const marketCapAfter = priceAfter * BONDING_CURVE_CONFIG.TOTAL_SUPPLY;
    
    return {
      tokensOut: -tokensIn, // Negative because we're selling
      solIn: -solOut, // Negative because we're receiving SOL
      priceAfter,
      marketCapAfter,
      newTokensRemaining,
      newSolRaised,
    };
  };

  // Get price at specific token amount
  const getPriceAtTokenAmount = (tokensSoldAmount: number): number => {
    const virtualSolReserves = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES;
    const virtualTokenReserves = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - tokensSoldAmount;
    return virtualSolReserves / virtualTokenReserves;
  };

  // Generate curve data points for visualization
  const getCurveData = (points: number = 100) => {
    const data = [];
    const step = BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY / points;
    
    for (let i = 0; i <= points; i++) {
      const tokensSoldAmount = i * step;
      const price = getPriceAtTokenAmount(tokensSoldAmount);
      const marketCap = price * BONDING_CURVE_CONFIG.TOTAL_SUPPLY;
      const progress = (tokensSoldAmount / BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY) * 100;
      
      data.push({
        tokensSold: tokensSoldAmount,
        price,
        marketCap,
        progress,
        isGraduated: marketCap >= BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD,
      });
    }
    
    return data;
  };

  return {
    state,
    calculateBuy,
    calculateSell,
    getPriceAtTokenAmount,
    getCurveData,
    config: BONDING_CURVE_CONFIG,
  };
};

// Utility functions
export const formatPrice = (price: number): string => {
  if (price < 0.000001) {
    // For very small numbers, show full decimal places with zeros
    return price.toFixed(9);
  }
  if (price < 0.001) {
    return price.toFixed(8);
  }
  return price.toFixed(6);
};

export const formatMarketCap = (marketCap: number): string => {
  if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  }
  if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(1)}K`;
  }
  return `$${marketCap.toFixed(0)}`;
};

export const formatTokenAmount = (amount: number): string => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)}K`;
  }
  return amount.toFixed(0);
};