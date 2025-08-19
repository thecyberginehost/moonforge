import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

interface TradingActivity {
  id: string;
  user_wallet: string;
  activity_type: string;
  amount_sol: number;
  token_amount: number;
  token_price: number;
  created_at: string;
  time_since_launch_minutes: number | null;
  profit_loss?: number | null;
  profit_percentage?: number | null;
  market_cap_at_time?: number | null;
  token_id: string;
  updated_at: string;
}

interface TokenTradingActivityProps {
  tokenId: string;
}

const TokenTradingActivity = ({ tokenId }: TokenTradingActivityProps) => {
  const [activities, setActivities] = useState<TradingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTradingActivities();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('trading-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_activities',
          filter: `token_id=eq.${tokenId}`
        },
        (payload) => {
          const newActivity = payload.new as TradingActivity;
          setActivities(prev => [newActivity, ...prev].slice(0, 20)); // Keep latest 20
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId]);

  const fetchTradingActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_activities')
        .select('*')
        .eq('token_id', tokenId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching trading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatWallet = (wallet: string) => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading trading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No trades yet</p>
            <p className="text-xs">Be the first to trade this token!</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {activity.user_wallet.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatWallet(activity.user_wallet)}
                        </span>
                        <Badge 
                          variant={activity.activity_type === 'buy' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <div className="flex items-center gap-1">
                            {activity.activity_type === 'buy' ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {activity.activity_type.toUpperCase()}
                          </div>
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(activity.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {activity.amount_sol.toFixed(3)} SOL
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.token_amount.toFixed(0)} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenTradingActivity;