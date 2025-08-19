import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEnhancedPortfolio, usePortfolioOptimization } from '@/hooks/useEnhancedPortfolio';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  AlertTriangle,
  Award,
  Zap,
  DollarSign
} from 'lucide-react';

interface EnhancedPortfolioDashboardProps {
  walletAddress?: string;
}

export const EnhancedPortfolioDashboard = ({ walletAddress }: EnhancedPortfolioDashboardProps) => {
  const { walletAddress: connectedWallet } = useWalletAuth();
  const address = walletAddress || connectedWallet;
  
  const { data: portfolio, isLoading } = useEnhancedPortfolio(address || '');
  const { portfolio: optimizationData, riskMetrics, recommendations, optimizationScore } = usePortfolioOptimization(address || '');

  if (!address) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Connect wallet to view portfolio</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!portfolio || portfolio.tokens.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">No tokens in portfolio</p>
            <p className="text-sm text-muted-foreground">Start trading to build your portfolio</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { tokens, metrics } = portfolio;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getProfitColor = (value: number) => {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'extreme': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Value</p>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
            <p className="text-sm text-muted-foreground">
              Invested: {formatCurrency(metrics.totalInvested)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total P&L</p>
            </div>
            <p className={`text-2xl font-bold ${getProfitColor(metrics.totalProfitLoss)}`}>
              {formatCurrency(metrics.totalProfitLoss)}
            </p>
            <p className={`text-sm ${getProfitColor(metrics.totalProfitPercentage)}`}>
              {formatPercentage(metrics.totalProfitPercentage)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
            <p className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">
              {metrics.tokenCount} tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Risk Score</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                className={`${getRiskBadgeColor(riskMetrics?.riskScore)} text-white`}
                variant="secondary"
              >
                {riskMetrics?.riskScore?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Volatility: {riskMetrics?.portfolioVolatility.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Portfolio Optimization Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={optimizationScore || 0} className="h-3" />
              </div>
              <Badge 
                variant="outline" 
                className={`${
                  (optimizationScore || 0) >= 80 ? 'text-green-500 border-green-500' :
                  (optimizationScore || 0) >= 60 ? 'text-yellow-500 border-yellow-500' :
                  'text-red-500 border-red-500'
                }`}
              >
                {(optimizationScore || 0).toFixed(0)}/100
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {(optimizationScore || 0) >= 80 ? 'Excellent portfolio optimization!' :
               (optimizationScore || 0) >= 60 ? 'Good portfolio with room for improvement' :
               'Portfolio needs optimization for better risk-adjusted returns'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Best Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.bestPerformer ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{metrics.bestPerformer.symbol}</h3>
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    {formatPercentage(metrics.bestPerformer.profit_percentage)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invested</p>
                    <p className="font-medium">{formatCurrency(metrics.bestPerformer.total_invested)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Value</p>
                    <p className="font-medium">{formatCurrency(metrics.bestPerformer.current_value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit</p>
                    <p className="font-medium text-green-500">
                      {formatCurrency(metrics.bestPerformer.profit_loss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{metrics.bestPerformer.amount_held.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No profitable positions</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Worst Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.worstPerformer ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{metrics.worstPerformer.symbol}</h3>
                  <Badge variant="outline" className="text-red-500 border-red-500">
                    {formatPercentage(metrics.worstPerformer.profit_percentage)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invested</p>
                    <p className="font-medium">{formatCurrency(metrics.worstPerformer.total_invested)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Value</p>
                    <p className="font-medium">{formatCurrency(metrics.worstPerformer.current_value)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Loss</p>
                    <p className="font-medium text-red-500">
                      {formatCurrency(metrics.worstPerformer.profit_loss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{metrics.worstPerformer.amount_held.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No losing positions</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Smart Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokens.map((token, index) => (
              <div key={token.id}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">{token.symbol}</h3>
                        <p className="text-sm text-muted-foreground">{token.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(token.current_value)}</span>
                      <Badge 
                        variant="outline" 
                        className={`${getProfitColor(token.profit_percentage)} border-current`}
                      >
                        {formatPercentage(token.profit_percentage)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {token.amount_held.toLocaleString()} tokens
                    </p>
                  </div>
                </div>
                
                {index < tokens.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};