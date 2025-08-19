import { useMemo } from 'react';
import { useBondingCurve } from './useBondingCurve';

interface SlippageConfig {
  maxSlippage: number; // in percentage (e.g., 5 for 5%)
  warningThreshold: number; // in percentage
  autoAdjust: boolean;
}

interface SlippageResult {
  isExcessiveSlippage: boolean;
  recommendedSlippage: number;
  priceImpact: number;
  warningMessage?: string;
  canProceed: boolean;
}

interface TradeProtectionResult {
  slippage: SlippageResult;
  mevRisk: 'low' | 'medium' | 'high';
  liquidityWarning?: string;
  optimalTiming: 'immediate' | 'wait' | 'bundle';
}

export const useSlippageProtection = (
  currentSolRaised: number,
  tokensSold: number,
  config: SlippageConfig = {
    maxSlippage: 10,
    warningThreshold: 5,
    autoAdjust: true
  }
) => {
  const { state, calculateBuy, calculateSell } = useBondingCurve(currentSolRaised, tokensSold);

  const calculateSlippage = useMemo(() => {
    return (tradeAmount: number, isSwap: 'buy' | 'sell'): SlippageResult => {
      if (tradeAmount <= 0) {
        return {
          isExcessiveSlippage: false,
          recommendedSlippage: 1,
          priceImpact: 0,
          canProceed: true
        };
      }

      // Calculate expected vs actual output
      const tradeResult = isSwap === 'buy' 
        ? calculateBuy(tradeAmount)
        : calculateSell(tradeAmount);

      const currentPrice = state.currentPrice;
      const priceAfter = tradeResult.priceAfter;
      const priceImpact = Math.abs((priceAfter - currentPrice) / currentPrice) * 100;

      // Dynamic slippage calculation based on trade size and liquidity
      const liquidityRatio = tradeAmount / (state.virtualSolReserves + state.solRaised);
      const baseLiquidity = state.virtualSolReserves + state.solRaised;
      
      // Calculate recommended slippage based on multiple factors
      let recommendedSlippage = Math.max(
        priceImpact * 1.2, // 20% buffer over price impact
        0.5, // Minimum 0.5%
        liquidityRatio * 50 // Higher slippage for larger trades relative to liquidity
      );

      // Adjust for low liquidity scenarios
      if (baseLiquidity < 10) { // Less than 10 SOL liquidity
        recommendedSlippage = Math.max(recommendedSlippage, 3);
      }

      // Cap at reasonable maximum
      recommendedSlippage = Math.min(recommendedSlippage, 25);

      const isExcessiveSlippage = priceImpact > config.maxSlippage;
      const isWarning = priceImpact > config.warningThreshold;

      let warningMessage;
      if (isExcessiveSlippage) {
        warningMessage = `High slippage detected (${priceImpact.toFixed(2)}%). Consider reducing trade size.`;
      } else if (isWarning) {
        warningMessage = `Moderate slippage (${priceImpact.toFixed(2)}%). Price may move against you.`;
      } else if (liquidityRatio > 0.1) {
        warningMessage = `Large trade relative to liquidity. Consider splitting into smaller trades.`;
      }

      return {
        isExcessiveSlippage,
        recommendedSlippage: config.autoAdjust ? recommendedSlippage : config.maxSlippage,
        priceImpact,
        warningMessage,
        canProceed: !isExcessiveSlippage || priceImpact < 25 // Hard limit at 25%
      };
    };
  }, [state, calculateBuy, calculateSell, config]);

  return { calculateSlippage, state };
};

export const useTradeProtection = (
  currentSolRaised: number,
  tokensSold: number,
  tradeAmount: number,
  tradeType: 'buy' | 'sell'
): TradeProtectionResult => {
  const { calculateSlippage } = useSlippageProtection(currentSolRaised, tokensSold);

  const protection = useMemo((): TradeProtectionResult => {
    const slippage = calculateSlippage(tradeAmount, tradeType);
    
    // Enhanced MEV Risk Assessment
    let mevRisk: 'low' | 'medium' | 'high' = 'low';
    const tradeValueUSD = tradeAmount * 230; // Approximate SOL price
    
    // Consider multiple factors for MEV risk (tuned to avoid blocking legitimate trades)
    const riskFactors = {
      tradeSize: tradeValueUSD > 50000 ? 35 : tradeValueUSD > 10000 ? 25 : tradeValueUSD > 1000 ? 15 : 0, // Higher thresholds
      priceImpact: slippage.priceImpact > 15 ? 30 : slippage.priceImpact > 8 ? 20 : 0, // More lenient on price impact
      liquidityRatio: tradeAmount > (currentSolRaised + 30) * 0.25 ? 25 : tradeAmount > (currentSolRaised + 30) * 0.15 ? 15 : 0, // Allow larger trades relative to liquidity
      timeOfDay: new Date().getHours() >= 13 && new Date().getHours() <= 21 ? 5 : 0, // Reduced time penalty
    };
    
    const totalRiskScore = Object.values(riskFactors).reduce((sum, score) => sum + score, 0);
    
    // Higher thresholds to avoid blocking legitimate large trades
    if (totalRiskScore > 80) {
      mevRisk = 'high';
    } else if (totalRiskScore > 45) {
      mevRisk = 'medium';
    }

    // Enhanced liquidity warnings with sandwich protection
    const totalLiquidity = currentSolRaised + 30; // Virtual reserves
    let liquidityWarning;
    
    if (tradeAmount > totalLiquidity * 0.2) {
      liquidityWarning = 'Trade size is >20% of available liquidity. High sandwich attack risk detected.';
    } else if (tradeAmount > totalLiquidity * 0.1) {
      liquidityWarning = 'Large trade detected. Consider using MEV protection to prevent sandwich attacks.';
    } else if (mevRisk === 'high') {
      liquidityWarning = 'High MEV risk detected. Recommend using priority bundling.';
    }

    // Enhanced timing recommendation with anti-sandwich logic
    let optimalTiming: 'immediate' | 'wait' | 'bundle' = 'immediate';
    
    if (mevRisk === 'high' || slippage.priceImpact > 15) {
      optimalTiming = 'bundle'; // Use MEV protection bundling
    } else if (slippage.priceImpact > 10 || mevRisk === 'medium') {
      optimalTiming = 'bundle'; // Recommend bundling for medium risk too
    } else if (totalRiskScore > 20) {
      optimalTiming = 'wait'; // Wait for better conditions
    }

    return {
      slippage,
      mevRisk,
      liquidityWarning,
      optimalTiming
    };
  }, [calculateSlippage, tradeAmount, tradeType, currentSolRaised, tokensSold]);

  return protection;
};

export const useSmartTradeRecommendations = (
  tradeAmount: number,
  tradeType: 'buy' | 'sell',
  currentSolRaised: number,
  tokensSold: number
) => {
  const protection = useTradeProtection(currentSolRaised, tokensSold, tradeAmount, tradeType);

  const recommendations = useMemo(() => {
    const recs: string[] = [];

    // Slippage recommendations
    if (protection.slippage.priceImpact > 10) {
      recs.push(`Consider splitting trade into ${Math.ceil(protection.slippage.priceImpact / 5)} smaller trades`);
    }

    // Enhanced MEV protection recommendations
    if (protection.mevRisk === 'high') {
      recs.push('🛡️ High sandwich attack risk - Use FLASH MEV protection');
      recs.push('⚡ Set high priority fees to avoid being frontrun');
      recs.push('🔄 Consider splitting into multiple smaller trades');
    } else if (protection.mevRisk === 'medium') {
      recs.push('🔒 Medium MEV risk - Use PRIORITY protection bundle');
      recs.push('⏱️ Add random delay to avoid bot detection');
    }

    // Anti-sandwich timing recommendations
    if (protection.optimalTiming === 'bundle') {
      recs.push('📦 Bundle transaction with MEV protection for safety');
      recs.push('🎯 Use atomic execution to prevent sandwich attacks');
    } else if (protection.optimalTiming === 'wait') {
      recs.push('⏳ Wait for lower MEV bot activity');
      recs.push('📊 Monitor for increased liquidity before trading');
    }

    // Enhanced liquidity recommendations
    if (protection.liquidityWarning) {
      recs.push('💧 Trade during higher activity periods for better liquidity');
      if (protection.liquidityWarning.includes('sandwich')) {
        recs.push('🥪 High sandwich risk - Enable anti-MEV protection');
      }
    }

    return recs;
  }, [protection]);

  return {
    protection,
    recommendations,
    shouldProceed: protection.slippage.canProceed // Never block trades, only warn and recommend protection
  };
};