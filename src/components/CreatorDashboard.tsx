import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Coins,
  Activity,
  Users,
  Eye,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Calendar,
  Share2
} from "lucide-react";
import AchievementDisplay from "@/components/AchievementDisplay";

const CreatorDashboard = () => {
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const [userTokens, setUserTokens] = useState<any[]>([]);
  const [boughtTokens, setBoughtTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && walletAddress) {
      fetchUserData();
    }
  }, [isAuthenticated, walletAddress]);

  const fetchUserData = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      // Fetch created tokens
      const { data: createdTokens, error: createdError } = await supabase
        .from('tokens')
        .select('*')
        .eq('creator_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;
      setUserTokens(createdTokens || []);

      // For now, we don't have a way to track bought tokens, so we'll leave this empty
      // In a real implementation, you'd need a user_token_holdings table or similar
      setBoughtTokens([]);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Connect Your Wallet</h1>
            <p className="text-muted-foreground">Connect your wallet to access your creator dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Creator Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your tokens and track your MoonForge journey
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Creator Section */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <CardTitle>Your Created Tokens</CardTitle>
                </div>
                <Badge variant="secondary">{userTokens.length}</Badge>
              </div>
              <CardDescription>
                Tokens you've launched on MoonForge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading your tokens...</p>
                </div>
              ) : userTokens.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚀</div>
                  <h3 className="text-lg font-semibold mb-2">Create your first token now!</h3>
                  <p className="text-muted-foreground mb-6">
                    Launch your meme coin and start your journey to the moon
                  </p>
                  <Link to="/">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Token
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTokens.slice(0, 3).map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {token.image_url ? (
                          <img src={token.image_url} alt={token.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                            {token.name?.charAt(0) || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{token.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">${token.symbol}</Badge>
                            <span>•</span>
                            <span>{token.holder_count || 1} holders</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${token.market_cap?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                      </div>
                    </div>
                  ))}
                  
                  {userTokens.length > 3 && (
                    <Button variant="ghost" className="w-full">
                      View All {userTokens.length} Tokens
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                  
                  <Link to="/">
                    <Button variant="outline" className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Create Another Token
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bought Tokens Section */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle>Your Token Holdings</CardTitle>
                </div>
                <Badge variant="secondary">{boughtTokens.length}</Badge>
              </div>
              <CardDescription>
                Tokens you've invested in
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading your holdings...</p>
                </div>
              ) : boughtTokens.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">💎</div>
                  <h3 className="text-lg font-semibold mb-2">Buy your first MoonForge token now!</h3>
                  <p className="text-muted-foreground mb-6">
                    Discover and invest in the next big meme coin
                  </p>
                  <Link to="/tokens">
                    <Button className="gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Browse Tokens
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* This will be populated when we have a way to track user holdings */}
                  {boughtTokens.map((token) => (
                    <div key={token.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <img src={token.image_url} alt={token.name} className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-medium">{token.name}</p>
                          <p className="text-xs text-muted-foreground">${token.symbol}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">+24.5%</p>
                        <p className="text-xs text-muted-foreground">24h</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Achievements Section */}
        <div className="mt-8">
          <AchievementDisplay walletAddress={walletAddress} compact />
        </div>

        {/* Quick Stats */}
        {userTokens.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Your MoonForge performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Coins className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{userTokens.length}</p>
                  <p className="text-xs text-muted-foreground">Tokens Created</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {userTokens.reduce((sum, token) => sum + (token.holder_count || 1), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Holders</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {userTokens.reduce((sum, token) => sum + (token.creation_fee || 0.02), 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">SOL Invested</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {userTokens.length > 0 ? Math.ceil((Date.now() - new Date(userTokens[userTokens.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Days Creating</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CreatorDashboard;