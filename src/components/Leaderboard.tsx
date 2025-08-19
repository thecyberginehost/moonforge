import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, TrendingUp, Users, DollarSign, Crown, Flame, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState("creators");
  const [topCreators, setTopCreators] = useState<any[]>([]);
  const [hotTokens, setHotTokens] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  const fetchLeaderboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch top creators based on token count and total volume
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('tokens')
        .select('creator_wallet, name, symbol, market_cap, holder_count')
        .order('created_at', { ascending: false });

      if (creatorsError) throw creatorsError;

      // Group by creator and calculate stats
      const creatorStats: any = {};
      creatorsData?.forEach((token: any) => {
        const wallet = token.creator_wallet;
        if (!creatorStats[wallet]) {
          creatorStats[wallet] = {
            wallet,
            name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
            tokens: 0,
            totalVolume: 0,
            totalHolders: 0,
            verified: false
          };
        }
        creatorStats[wallet].tokens += 1;
        creatorStats[wallet].totalVolume += token.market_cap || 0;
        creatorStats[wallet].totalHolders += token.holder_count || 1;
      });

      const creators = Object.values(creatorStats)
        .sort((a: any, b: any) => b.tokens - a.tokens)
        .slice(0, 10)
        .map((creator: any, index) => ({
          ...creator,
          rank: index + 1,
          successRate: Math.floor(Math.random() * 30) + 70, // Mock for now
          badge: index === 0 ? "🏆 Legendary" : index === 1 ? "💎 Diamond" : index === 2 ? "🔥 Fire" : "⭐ Elite"
        }));

      setTopCreators(creators);

      // Fetch hot tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (tokensError) throw tokensError;

      const tokens = tokensData?.map((token, index) => ({
        rank: index + 1,
        name: token.name,
        symbol: token.symbol,
        creator: `${token.creator_wallet.slice(0, 6)}...${token.creator_wallet.slice(-4)}`,
        marketCap: token.market_cap || 0,
        change24h: Math.random() * 200 + 10, // Mock for now
        volume24h: token.volume_24h || 0,
        holders: token.holder_count || 1,
        trending: index < 3
      })) || [];

      setHotTokens(tokens);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const handleFollowCreator = (creator: string) => {
    toast.success(`🎯 Now following ${creator}!`, {
      description: "You'll get notified when they launch new tokens"
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent mb-4">
            Hall of Fame
          </h1>
          <p className="text-muted-foreground text-lg">
            Top performers and hottest tokens on MoonForge
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-muted rounded-lg p-1">
            <Button 
              variant={activeTab === "creators" ? "default" : "ghost"}
              onClick={() => setActiveTab("creators")}
              className="rounded-md"
            >
              <Users className="w-4 h-4 mr-2" />
              Top Creators
            </Button>
            <Button 
              variant={activeTab === "tokens" ? "default" : "ghost"}
              onClick={() => setActiveTab("tokens")}
              className="rounded-md"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Hot Tokens
            </Button>
          </div>
        </div>

        {activeTab === "creators" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin mr-2" size={32} />
                <span className="text-lg">Loading leaderboard...</span>
              </div>
            ) : topCreators.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-xl font-semibold mb-2">No creators yet</h3>
                <p className="text-muted-foreground">Be the first to create a token and claim the top spot!</p>
              </div>
            ) : (
              <>
                {/* Top 3 Podium */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  {topCreators.slice(0, 3).map((creator, index) => (
                    <Card key={creator.rank} className={`relative overflow-hidden ${index === 0 ? 'md:order-2 transform md:scale-110' : index === 1 ? 'md:order-1' : 'md:order-3'}`}>
                      <div className={`absolute top-0 left-0 w-full h-2 ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' : 'bg-gradient-to-r from-amber-500 to-amber-700'}`} />
                      <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                          {getRankIcon(creator.rank)}
                        </div>
                        <Avatar className="w-16 h-16 mx-auto mb-4">
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                          <div className="flex items-center justify-center gap-2">
                            <h3 className="font-bold">{creator.name}</h3>
                            {creator.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <Badge variant="secondary">{creator.badge}</Badge>
                          <div className="text-sm space-y-1">
                            <p><span className="font-medium">{creator.tokens}</span> tokens created</p>
                            <p><span className="font-medium">${creator.totalVolume.toLocaleString()}</span> total volume</p>
                            <p><span className="font-medium">{creator.successRate}%</span> success rate</p>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full mt-3"
                            onClick={() => handleFollowCreator(creator.name)}
                          >
                            Follow Creator
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

            {/* Full Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Creator Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topCreators.map((creator) => (
                    <div key={creator.rank} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8">
                          {getRankIcon(creator.rank)}
                        </div>
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{creator.name}</span>
                            {creator.verified && <Crown className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">{creator.badge}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{creator.tokens}</div>
                          <div className="text-muted-foreground">Tokens</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">${(creator.totalVolume / 1000000).toFixed(1)}M</div>
                          <div className="text-muted-foreground">Volume</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{creator.successRate}%</div>
                          <div className="text-muted-foreground">Success</div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleFollowCreator(creator.name)}
                        >
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}

        {activeTab === "tokens" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin mr-2" size={32} />
                <span className="text-lg">Loading hot tokens...</span>
              </div>
            ) : hotTokens.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-xl font-semibold mb-2">No tokens yet</h3>
                <p className="text-muted-foreground">Create the first token to start the competition!</p>
              </div>
            ) : (
              <>
                {/* Hot Tokens Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {hotTokens.map((token) => (
                    <Card key={token.rank} className="relative overflow-hidden hover:shadow-xl transition-all">
                      {token.trending && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gradient-to-r from-red-500 to-orange-500 animate-pulse">
                            <Flame className="w-3 h-3 mr-1" />
                            HOT
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getRankIcon(token.rank)}
                            <div>
                              <h3 className="font-bold text-lg">{token.name}</h3>
                              <p className="text-sm text-muted-foreground">${token.symbol}</p>
                            </div>
                          </div>
                          <div className={`text-right ${token.change24h > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <div className="text-lg font-bold">+{token.change24h.toFixed(1)}%</div>
                            <div className="text-xs">24h</div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Market Cap</span>
                            <span className="font-medium">${token.marketCap.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">24h Volume</span>
                            <span className="font-medium">${token.volume24h.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Holders</span>
                            <span className="font-medium">{token.holders.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Creator</span>
                            <Badge variant="outline">{token.creator}</Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          <Button className="flex-1" size="sm">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Trade
                          </Button>
                          <Button variant="outline" size="sm">
                            <Zap className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {/* Achievement Badges */}
            <Card>
              <CardHeader>
                <CardTitle>Achievement Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">🏆</div>
                    <div className="font-medium">Legendary</div>
                    <div className="text-xs text-muted-foreground">$1M+ volume</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">💎</div>
                    <div className="font-medium">Diamond</div>
                    <div className="text-xs text-muted-foreground">90%+ success</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">🔥</div>
                    <div className="font-medium">Fire</div>
                    <div className="text-xs text-muted-foreground">10+ tokens</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl mb-2">⭐</div>
                    <div className="font-medium">Elite</div>
                    <div className="text-xs text-muted-foreground">Verified creator</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;