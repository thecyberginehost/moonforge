import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { TrendingUp, ExternalLink, Copy, Crown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRecentTokens } from "@/hooks/useTokens";
import { toast } from "sonner";

interface LaunchData {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  marketCap: string;
  change24h: number;
  image: string;
}

const RecentLaunches = () => {
  const { data: tokens, isLoading, error } = useRecentTokens();
  
  // Convert real tokens to LaunchData format
  const launches = tokens?.map(token => ({
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    creator: `${token.creator_wallet.slice(0, 6)}...${token.creator_wallet.slice(-4)}`,
    marketCap: token.market_cap > 0 ? `$${(token.market_cap / 1000).toFixed(0)}K` : '$0',
    change24h: Math.random() * 100 + 10, // Will be replaced with real data later
    image: token.image_url ? '🎨' : '🚀'
  })) || [];

  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 5);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-gradient">
            Recent Pumps
          </h2>
          <p className="text-muted-foreground mb-4">
            Fresh launches from the community
          </p>
          <div className="text-sm text-accent">
            Refreshing in {timeLeft}s...
          </div>
        </div>

        {/* Regular Recent Launches */}
        <div className="mb-8">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Recent Launches</h3>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span className="text-sm sm:text-base">Loading recent launches...</span>
            </div>
          ) : launches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4">🚀</div>
              <p className="text-lg">No tokens launched yet</p>
              <p className="text-sm mt-2">Be the first to create a meme token!</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load recent launches</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {launches.map((launch) => (
                <Card key={launch.id} className="border-border/50 hover:shadow-neon transition-all duration-300 hover:scale-105">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3 sm:gap-4 mb-4">
                      <div className="text-3xl sm:text-4xl">{launch.image}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg truncate">{launch.name}</h3>
                        <p className="text-sm text-muted-foreground">${launch.symbol}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0" asChild>
                        <Link to={`/token/${launch.id}`}>
                          <ExternalLink size={16} />
                        </Link>
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Market Cap</span>
                        <span className="font-medium">{launch.marketCap}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">24h Change</span>
                        <span className="font-medium text-accent flex items-center gap-1">
                          <TrendingUp size={14} />
                          +{launch.change24h}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Creator</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs">{launch.creator}</span>
                          <Button variant="ghost" size="icon" className="h-4 w-4">
                            <Copy size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="electric" size="sm" className="flex-1" asChild>
                        <Link to={`/token/${launch.id}`}>
                          Trade Now
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="sm:w-auto">
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-8 sm:mt-12">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/tokens">
              View All Launches
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default RecentLaunches;