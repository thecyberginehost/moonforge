
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ExternalLink, DollarSign, Users, Activity, TrendingUp } from "lucide-react";

interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    description?: string;
    image_url?: string;
    market_cap: number;
    price: number;
    volume_24h: number;
    holder_count: number;
    created_at: string;
  };
}

const TokenCard = ({ token }: TokenCardProps) => {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const tokenDate = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - tokenDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
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

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Market Cap</span>
            </div>
            <p className="font-medium">${token.market_cap.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>Holders</span>
            </div>
            <p className="font-medium">{token.holder_count.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span>Volume 24h</span>
            </div>
            <p className="font-medium">${token.volume_24h.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>Price</span>
            </div>
            <p className="font-medium">${token.price.toFixed(6)}</p>
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
              Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenCard;
