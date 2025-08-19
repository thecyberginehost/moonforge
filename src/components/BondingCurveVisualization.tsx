import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { 
  useBondingCurve, 
  formatMarketCap, 
  formatTokenAmount, 
  formatPrice,
  BONDING_CURVE_CONFIG 
} from '@/hooks/useBondingCurve';
import { TrendingUp, Target, Rocket, Zap } from 'lucide-react';

interface BondingCurveVisualizationProps {
  currentSolRaised: number;
  tokensSold: number;
  tokenSymbol: string;
}

const BondingCurveVisualization = ({ 
  currentSolRaised, 
  tokensSold, 
  tokenSymbol 
}: BondingCurveVisualizationProps) => {
  const { state, getCurveData } = useBondingCurve(currentSolRaised, tokensSold);
  
  // Generate curve visualization data
  const curveData = useMemo(() => getCurveData(50), [getCurveData]);
  
  // Key milestones
  const milestones = [
    { progress: 25, label: 'Early Bird Zone', icon: '🐦' },
    { progress: 50, label: 'King of Hill', icon: '👑' },
    { progress: 75, label: 'Moon Mission', icon: '🚀' },
    { progress: 100, label: 'Raydium Ready', icon: '🎯' },
  ];

  // Calculate graduation progress
  const graduationProgress = (state.marketCap / BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD) * 100;
  const tokenProgress = state.progressPercentage;

  return (
    <div className="space-y-6">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Bonding Curve Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Sales Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tokens Sold</span>
              <span className="font-mono">
                {formatTokenAmount(state.tokensSold)} / {formatTokenAmount(BONDING_CURVE_CONFIG.BONDING_CURVE_SUPPLY)}
              </span>
            </div>
            <Progress value={tokenProgress} className="h-3" />
            <div className="text-xs text-muted-foreground text-center">
              {tokenProgress.toFixed(1)}% of tokens sold
            </div>
          </div>

          {/* Market Cap Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Market Cap Progress</span>
              <span className="font-mono">
                {formatMarketCap(state.marketCap)} / {formatMarketCap(BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD)}
              </span>
            </div>
            <Progress value={Math.min(graduationProgress, 100)} className="h-3" />
            <div className="text-xs text-muted-foreground text-center">
              {Math.min(graduationProgress, 100).toFixed(1)}% to Raydium graduation
            </div>
          </div>

          {/* Current Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background border rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Current Price</div>
              <div className="text-sm font-mono">{formatPrice(state.currentPrice)} SOL</div>
            </div>
            <div className="bg-background border rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Market Cap</div>
              <div className="text-sm font-mono">{formatMarketCap(state.marketCap)}</div>
            </div>
            <div className="bg-background border rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">SOL Raised</div>
              <div className="text-sm font-mono">{state.solRaised.toFixed(2)} SOL</div>
            </div>
            <div className="bg-background border rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="text-sm font-mono">{formatTokenAmount(state.tokensRemaining)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curve Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Price Curve Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-48 bg-gradient-to-r from-background to-muted rounded-lg p-4">
            {/* SVG Curve */}
            <svg className="w-full h-full absolute inset-4" viewBox="0 0 400 160">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Price curve */}
              <path
                d={curveData.map((point, index) => {
                  const x = (index / (curveData.length - 1)) * 380 + 10;
                  const y = 150 - (Math.log(point.price * 1000000) / Math.log(10)) * 20;
                  return `${index === 0 ? 'M' : 'L'} ${x} ${Math.max(10, Math.min(150, y))}`;
                }).join(' ')}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                fill="none"
              />
              
              {/* Current position marker */}
              <circle
                cx={(tokenProgress / 100) * 380 + 10}
                cy={150 - (Math.log(state.currentPrice * 1000000) / Math.log(10)) * 20}
                r="4"
                fill="hsl(var(--primary))"
                stroke="white"
                strokeWidth="2"
              />
              
              {/* Graduation line */}
              <line
                x1={10}
                y1={150 - (Math.log(BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD / BONDING_CURVE_CONFIG.TOTAL_SUPPLY * 1000000) / Math.log(10)) * 20}
                x2={390}
                y2={150 - (Math.log(BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD / BONDING_CURVE_CONFIG.TOTAL_SUPPLY * 1000000) / Math.log(10)) * 20}
                stroke="hsl(var(--destructive))"
                strokeWidth="1"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            </svg>
            
            {/* Labels */}
            <div className="absolute bottom-2 left-4 text-xs text-muted-foreground">
              0% Progress
            </div>
            <div className="absolute bottom-2 right-4 text-xs text-muted-foreground">
              100% (Graduation)
            </div>
            <div className="absolute top-2 right-4 text-xs text-destructive">
              Graduation Line
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Milestones & Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.progress}
                className={`p-4 rounded-lg border text-center transition-all ${
                  tokenProgress >= milestone.progress
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-background border-border'
                }`}
              >
                <div className="text-2xl mb-2">{milestone.icon}</div>
                <div className="text-sm font-medium">{milestone.label}</div>
                <div className="text-xs text-muted-foreground">{milestone.progress}%</div>
                {tokenProgress >= milestone.progress && (
                  <div className="text-xs text-primary mt-1">✓ Achieved</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Graduation Status */}
      {state.isGraduated && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Rocket className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                  🎉 Congratulations! Token Graduated!
                </h3>
                <p className="text-green-600 dark:text-green-300">
                  {tokenSymbol} has reached {formatMarketCap(BONDING_CURVE_CONFIG.GRADUATION_THRESHOLD)} market cap and is ready for Raydium!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BondingCurveVisualization;