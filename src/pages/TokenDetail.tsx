
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  ExternalLink,
  Copy,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  Calendar,
  Target,
  Trophy,
  Share2,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
// Force rebuild to clear TokenTradingPanel reference error
import BondingCurvePanel from "@/components/BondingCurvePanel";
import BondingCurveVisualization from "@/components/BondingCurveVisualization";
import TokenTradingActivity from "@/components/TokenTradingActivity";
import { TradingChart } from "@/components/TradingChart";

interface TokenDetail {
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
  telegram_url?: string;
  x_url?: string;
  // New bonding curve fields
  sol_raised?: number;
  tokens_sold?: number;
  is_graduated?: boolean;
}

const TokenDetail = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (identifier) {
      fetchTokenDetail();
    }
  }, [identifier]);

  const fetchTokenDetail = async () => {
    setLoading(true);
    setNotFound(false);
    
    try {
      let query = supabase.from('tokens').select('*');
      
      // Check if identifier is a UUID (token ID) or mint address
      if (identifier?.includes('-') && identifier.length === 36) {
        // Likely a UUID
        query = query.eq('id', identifier);
      } else {
        // Check by mint_address, symbol, or name
        query = query.or(`mint_address.eq.${identifier},symbol.ilike.${identifier},name.ilike.%${identifier}%`);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching token:', error);
        setNotFound(true);
      } else if (!data) {
        setNotFound(true);
      } else {
        setToken(data);
      }
    } catch (error) {
      console.error('Error:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const tokenDate = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getMilestoneProgress = (marketCap: number) => {
    const milestones = [1000, 10000, 25000, 50000, 100000];
    const currentMilestone = milestones.findIndex(milestone => marketCap < milestone);
    
    if (currentMilestone === -1) {
      return { progress: 100, current: 100000, next: null, level: 5 };
    }
    
    const prevMilestone = currentMilestone === 0 ? 0 : milestones[currentMilestone - 1];
    const nextMilestone = milestones[currentMilestone];
    const progress = ((marketCap - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
    
    return { 
      progress: Math.max(0, Math.min(100, progress)), 
      current: nextMilestone, 
      next: currentMilestone < milestones.length - 1 ? milestones[currentMilestone + 1] : null,
      level: currentMilestone + 1
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading token details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !token) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The token you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={() => navigate('/tokens')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Token List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const milestone = getMilestoneProgress(token.market_cap);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/tokens" className="hover:text-foreground">Tokens</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{token.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="flex items-center gap-4">
            {token.image_url ? (
              <img 
                src={token.image_url} 
                alt={token.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-white font-bold text-2xl">
                {token.name?.charAt(0) || '?'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{token.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">${token.symbol}</Badge>
                <span className="text-sm text-muted-foreground">
                  Created {formatTimeAgo(token.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:ml-auto">
            <Button variant="outline" className="gap-2" onClick={() => copyToClipboard(window.location.href, 'Token link')}>
              <Share2 className="w-4 h-4" />
              Share Token
            </Button>
          </div>
        </div>

        {/* Description */}
        {token.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{token.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Bonding Curve Visualization */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bonding Curve Visualization */}
            <BondingCurveVisualization 
              currentSolRaised={token.sol_raised || 0}
              tokensSold={token.tokens_sold || 0}
              tokenSymbol={token.symbol}
            />

            {/* Trading Chart */}
            <TradingChart 
              tokenId={token.id}
              tokenName={token.name}
              currentPrice={token.price}
            />

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Market Cap</div>
                    <div className="text-xl font-bold">${token.market_cap.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Price</div>
                    <div className="text-xl font-bold">${token.price.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">24h Volume</div>
                    <div className="text-xl font-bold">${token.volume_24h.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Holders</div>
                    <div className="text-xl font-bold">{token.holder_count.toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestone Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Milestone Progress
                </CardTitle>
                <CardDescription>
                  Bonding curve milestone: Level {milestone.level} of 5
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Current: ${token.market_cap.toLocaleString()}</span>
                    <span>Next: ${milestone.current.toLocaleString()}</span>
                  </div>
                  <Progress value={milestone.progress} className="h-3" />
                </div>
                
                {milestone.level < 5 ? (
                  <div className="text-sm text-muted-foreground">
                    ${(milestone.current - token.market_cap).toLocaleString()} to next milestone
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">Graduated to Raydium!</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Trading Panel */}
          <div className="space-y-6">
            {/* Bonding Curve Trading Panel */}
            <BondingCurvePanel 
              tokenId={token.id}
              tokenSymbol={token.symbol}
              tokenName={token.name}
              currentSolRaised={token.sol_raised || 0}
              tokensSold={token.tokens_sold || 0}
              onTrade={(result) => {
                // Refresh token data after trade
                fetchTokenDetail();
              }}
            />
            
            {/* Trading Activity */}
            <TokenTradingActivity tokenId={token.id} />
            {/* Contract Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contract Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {token.mint_address && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Contract Address</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {token.mint_address}
                      </code>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(token.mint_address!, 'Contract address')}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Total Supply</div>
                  <div className="font-mono">{token.total_supply.toLocaleString()}</div>
                </div>
                
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Creation Fee</div>
                  <div className="font-mono">{token.creation_fee} SOL</div>
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            {(token.telegram_url || token.x_url) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Community</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {token.telegram_url && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={token.telegram_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Telegram
                      </a>
                    </Button>
                  )}
                  {token.x_url && (
                    <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                      <a href={token.x_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        X (Twitter)
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Creator Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {token.creator_wallet}
                  </code>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(token.creator_wallet, 'Creator address')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetail;
