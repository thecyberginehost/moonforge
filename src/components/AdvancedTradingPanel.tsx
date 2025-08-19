import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSlippageProtection, useSmartTradeRecommendations } from '@/hooks/useSlippageProtection';
import { useDynamicPriorityFee } from '@/hooks/useHeliusPriorityFees';
import { useBondingCurve } from '@/hooks/useBondingCurve';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { AlertTriangle, TrendingUp, Shield, Zap, Target } from 'lucide-react';

interface AdvancedTradingPanelProps {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  currentSolRaised: number;
  tokensSold: number;
  onTrade?: (type: 'buy' | 'sell', amount: number, protection: any) => void;
}

export const AdvancedTradingPanel = ({
  tokenId,
  tokenSymbol,
  tokenName,
  currentSolRaised,
  tokensSold,
  onTrade
}: AdvancedTradingPanelProps) => {
  const [activeTab, setActiveTab] = useState('buy');
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [selectedProtection, setSelectedProtection] = useState<'standard' | 'priority' | 'flash'>('standard');

  const { isAuthenticated } = useWalletAuth();
  const { state, calculateBuy, calculateSell } = useBondingCurve(currentSolRaised, tokensSold);
  const { getDynamicFee, networkCongestion } = useDynamicPriorityFee();
  
  const tradeAmount = parseFloat(activeTab === 'buy' ? buyAmount : sellAmount) || 0;
  const { protection, recommendations, shouldProceed } = useSmartTradeRecommendations(
    tradeAmount,
    activeTab as 'buy' | 'sell',
    currentSolRaised,
    tokensSold
  );

  // Quick buy amounts (in SOL)
  const quickBuyAmounts = [0.1, 0.5, 1, 2, 5];
  
  // Calculate trade preview
  const tradePreview = useMemo(() => {
    if (tradeAmount <= 0) return null;

    if (activeTab === 'buy') {
      const result = calculateBuy(tradeAmount);
      return {
        type: 'buy' as const,
        input: tradeAmount,
        output: result.tokensOut,
        priceAfter: result.priceAfter,
        marketCapAfter: result.marketCapAfter,
        priceImpact: protection.slippage.priceImpact
      };
    } else {
      const result = calculateSell(tradeAmount);
      return {
        type: 'sell' as const,
        input: tradeAmount,
        output: Math.abs(result.solIn),
        priceAfter: result.priceAfter,
        marketCapAfter: result.marketCapAfter,
        priceImpact: protection.slippage.priceImpact
      };
    }
  }, [activeTab, tradeAmount, calculateBuy, calculateSell, protection]);

  const handleQuickBuy = (amount: number) => {
    setBuyAmount(amount.toString());
    setActiveTab('buy');
  };

  const handleTrade = () => {
    if (!shouldProceed || !tradePreview) return;
    
    const tradeData = {
      type: activeTab as 'buy' | 'sell',
      amount: tradeAmount,
      protection: {
        slippage: protection.slippage.recommendedSlippage,
        mevProtection: selectedProtection,
        priorityFee: getDynamicFee(selectedProtection === 'flash' ? 'instant' : 'fast')
      }
    };

    onTrade?.(tradeData.type, tradeData.amount, tradeData.protection);
  };

  const getProtectionBadgeColor = (level: string) => {
    switch (level) {
      case 'flash': return 'bg-red-500 text-white';
      case 'priority': return 'bg-yellow-500 text-white';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Advanced Trading - {tokenSymbol}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRiskColor(networkCongestion)}>
              Network: {networkCongestion}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedMode(!advancedMode)}
            >
              {advancedMode ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Token Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/50 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-semibold">${state.currentPrice.toFixed(8)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="font-semibold">${state.marketCap.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={state.progressPercentage} className="flex-1" />
              <span className="text-sm">{state.progressPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Quick Buy Buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Quick Buy</p>
          <div className="flex gap-2 flex-wrap">
            {quickBuyAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => handleQuickBuy(amount)}
                className="flex-1"
              >
                {amount} SOL
              </Button>
            ))}
          </div>
        </div>

        {/* Trading Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SOL Amount</label>
              <Input
                type="number"
                placeholder="0.0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="text-lg"
              />
            </div>

            {tradePreview && tradePreview.type === 'buy' && (
              <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">You receive:</span>
                  <span className="font-medium">{tradePreview.output.toLocaleString()} {tokenSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price impact:</span>
                  <span className={`font-medium ${tradePreview.priceImpact > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {tradePreview.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New price:</span>
                  <span className="font-medium">${tradePreview.priceAfter.toFixed(8)}</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Token Amount</label>
              <Input
                type="number"
                placeholder="0.0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="text-lg"
              />
            </div>

            {tradePreview && tradePreview.type === 'sell' && (
              <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">You receive:</span>
                  <span className="font-medium">{tradePreview.output.toFixed(4)} SOL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price impact:</span>
                  <span className={`font-medium ${tradePreview.priceImpact > 5 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {tradePreview.priceImpact.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Advanced Protection Settings */}
        {advancedMode && (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="font-medium">MEV Protection</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {['standard', 'priority', 'flash'].map((level) => (
                <Button
                  key={level}
                  variant={selectedProtection === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProtection(level as any)}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <span className="capitalize">{level}</span>
                  <Badge className={getProtectionBadgeColor(level)} variant="secondary">
                    {level === 'flash' ? 'Max' : level === 'priority' ? 'High' : 'Basic'}
                  </Badge>
                </Button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground">
              <p><strong>Standard:</strong> Basic MEV protection with standard priority fees</p>
              <p><strong>Priority:</strong> Enhanced protection with higher priority fees</p>
              <p><strong>Flash:</strong> Maximum protection with atomic bundling (highest cost)</p>
            </div>
          </div>
        )}

        {/* Warnings and Recommendations */}
        {(protection.slippage.warningMessage || protection.liquidityWarning || recommendations.length > 0) && (
          <div className="space-y-3">
            {protection.slippage.warningMessage && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{protection.slippage.warningMessage}</AlertDescription>
              </Alert>
            )}

            {protection.liquidityWarning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{protection.liquidityWarning}</AlertDescription>
              </Alert>
            )}

            {recommendations.length > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Smart Recommendations</span>
                </div>
                <ul className="text-sm text-blue-800 space-y-1">
                  {recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!isAuthenticated || !shouldProceed || tradeAmount <= 0}
          className="w-full h-12 text-lg"
          size="lg"
        >
          {!isAuthenticated ? (
            'Connect Wallet'
          ) : !shouldProceed ? (
            'Risk Too High'
          ) : tradeAmount <= 0 ? (
            'Enter Amount'
          ) : (
            <div className="flex items-center gap-2">
              {selectedProtection === 'flash' && <Zap className="h-4 w-4" />}
              {selectedProtection === 'priority' && <Shield className="h-4 w-4" />}
              {activeTab === 'buy' ? 'Buy' : 'Sell'} {tokenSymbol}
              {selectedProtection !== 'standard' && (
                <Badge variant="secondary" className="ml-2">
                  {selectedProtection.toUpperCase()}
                </Badge>
              )}
            </div>
          )}
        </Button>

        {/* MEV Risk Indicator */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">MEV Risk:</span>
          <Badge 
            variant="outline" 
            className={`${getRiskColor(protection.mevRisk)} border-current`}
          >
            {protection.mevRisk.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};