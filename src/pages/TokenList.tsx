
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Skull,
  Search,
  Filter,
  Users,
  DollarSign,
  Activity,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

type FilterType = "trending" | "new" | "fast-risers" | "slow-risers" | "epic-fails";

const TokenList = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const filters = [
    { id: "trending", label: "Trending", icon: TrendingUp, color: "text-green-500" },
    { id: "new", label: "New", icon: Clock, color: "text-blue-500" },
    { id: "fast-risers", label: "Fast Risers", icon: Zap, color: "text-yellow-500" },
    { id: "slow-risers", label: "Slow Risers", icon: TrendingDown, color: "text-orange-500" },
    { id: "epic-fails", label: "Epic Fails", icon: Skull, color: "text-red-500" }
  ];

  useEffect(() => {
    fetchTokens();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tokens, activeFilter, searchQuery]);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...tokens];

    // Apply search filter - now includes mint_address
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.description?.toLowerCase().includes(query) ||
        token.mint_address?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case "trending":
        // Sort by a combination of volume and holder count
        filtered.sort((a, b) => {
          const scoreA = (a.volume_24h || 0) * 0.7 + (a.holder_count || 1) * 0.3;
          const scoreB = (b.volume_24h || 0) * 0.7 + (b.holder_count || 1) * 0.3;
          return scoreB - scoreA;
        });
        break;
      case "new":
        // Already sorted by created_at desc
        break;
      case "fast-risers":
        // Sort by market cap (simulating fast risers)
        filtered.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        break;
      case "slow-risers":
        // Sort by holder count (steady growth)
        filtered.sort((a, b) => (b.holder_count || 1) - (a.holder_count || 1));
        break;
      case "epic-fails":
        // Sort by lowest market cap or volume
        filtered.sort((a, b) => (a.market_cap || 0) - (b.market_cap || 0));
        break;
    }

    setFilteredTokens(filtered);
  };

  const getFilterDescription = () => {
    switch (activeFilter) {
      case "trending":
        return "Tokens with the highest volume and engagement";
      case "new":
        return "Recently launched tokens on MoonForge";
      case "fast-risers":
        return "Tokens showing rapid growth in market cap";
      case "slow-risers":
        return "Tokens with steady, sustainable growth";
      case "epic-fails":
        return "Tokens that didn't quite make it to the moon";
      default:
        return "";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const tokenDate = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const copyContractAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Contract address copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Token Discovery
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore and invest in the hottest meme coins on MoonForge
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol, contract address, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const IconComponent = filter.icon;
              return (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? "default" : "outline"}
                  onClick={() => setActiveFilter(filter.id as FilterType)}
                  className="gap-2"
                >
                  <IconComponent className={`h-4 w-4 ${activeFilter === filter.id ? 'text-white' : filter.color}`} />
                  {filter.label}
                </Button>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {getFilterDescription()}
          </p>
        </div>

        {/* Token Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading tokens...</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">No tokens found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search terms" : "No tokens match the current filter"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <Card key={token.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {token.image_url ? (
                        <img 
                          src={token.image_url} 
                          alt={token.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg">
                          {token.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{token.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Badge variant="outline">${token.symbol}</Badge>
                          <span className="text-xs">{formatTimeAgo(token.created_at)}</span>
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {token.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {token.description}
                    </p>
                  )}

                  {/* Contract Address */}
                  {token.mint_address && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                      <code className="flex-1 truncate">{token.mint_address}</code>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={() => copyContractAddress(token.mint_address)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        <span>Market Cap</span>
                      </div>
                      <p className="font-medium">${(token.market_cap || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Holders</span>
                      </div>
                      <p className="font-medium">{(token.holder_count || 1).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Activity className="h-3 w-3" />
                        <span>Volume 24h</span>
                      </div>
                      <p className="font-medium">${(token.volume_24h || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Price</span>
                      </div>
                      <p className="font-medium">${(token.price || 0).toFixed(6)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm" asChild>
                      <Link to={`/token/${token.id}`}>
                        Buy Token
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/token/${token.id}`}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!loading && filteredTokens.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" onClick={fetchTokens}>
              Load More Tokens
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenList;
