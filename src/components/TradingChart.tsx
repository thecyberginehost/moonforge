import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

interface TradingData {
  timestamp: string;
  price: number;
  volume: number;
  marketCap: number;
  type: 'buy' | 'sell';
}

interface TradingChartProps {
  tokenId: string;
  tokenName: string;
  currentPrice: number;
}

export const TradingChart = ({ tokenId, tokenName, currentPrice }: TradingChartProps) => {
  const [chartData, setChartData] = useState<TradingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1H' | '6H' | '24H' | 'ALL'>('6H');
  const [chartType, setChartType] = useState<'price' | 'volume'>('price');

  useEffect(() => {
    fetchTradingData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`trading-${tokenId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_activities',
          filter: `token_id=eq.${tokenId}`
        },
        (payload) => {
          console.log('New trade:', payload);
          // Add new trade to chart data
          if (payload.new) {
            const newTrade: TradingData = {
              timestamp: payload.new.created_at,
              price: payload.new.token_price,
              volume: payload.new.amount_sol,
              marketCap: payload.new.market_cap_at_time || 0,
              type: payload.new.activity_type
            };
            setChartData(prev => [...prev, newTrade].slice(-100)); // Keep last 100 trades
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId, timeframe]);

  const fetchTradingData = async () => {
    setLoading(true);
    try {
      // Calculate time filter based on timeframe
      const now = new Date();
      let timeFilter = new Date();
      
      switch (timeframe) {
        case '1H':
          timeFilter.setHours(now.getHours() - 1);
          break;
        case '6H':
          timeFilter.setHours(now.getHours() - 6);
          break;
        case '24H':
          timeFilter.setDate(now.getDate() - 1);
          break;
        case 'ALL':
          timeFilter = new Date(0); // All time
          break;
      }

      const { data: trades, error } = await supabase
        .from('trading_activities')
        .select('*')
        .eq('token_id', tokenId)
        .gte('created_at', timeFilter.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching trading data:', error);
        return;
      }

      const formattedData: TradingData[] = trades?.map(trade => ({
        timestamp: trade.created_at,
        price: trade.token_price,
        volume: trade.amount_sol,
        marketCap: trade.market_cap_at_time || 0,
        type: trade.activity_type as 'buy' | 'sell'
      })) || [];

      setChartData(formattedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatPrice = (value: number) => {
    if (value < 0.000001) return value.toExponential(2);
    if (value < 0.01) return value.toFixed(6);
    return value.toFixed(4);
  };

  const getPriceChange = () => {
    if (chartData.length < 2) return { change: 0, percentage: 0 };
    
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const percentage = ((change / firstPrice) * 100);
    
    return { change, percentage };
  };

  const { change, percentage } = getPriceChange();
  const isPositive = change >= 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Live Trading Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <CardTitle>Live Trading Chart</CardTitle>
            <Badge variant={isPositive ? 'default' : 'destructive'} className="ml-2">
              {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {isPositive ? '+' : ''}{percentage.toFixed(2)}%
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={chartType === 'price' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('price')}
                className="rounded-r-none"
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                variant={chartType === 'volume' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('volume')}
                className="rounded-l-none"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Timeframe Buttons */}
            <div className="flex items-center border rounded-md">
              {(['1H', '6H', '24H', 'ALL'] as const).map((tf) => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeframe(tf)}
                  className="rounded-none first:rounded-l-md last:rounded-r-md"
                >
                  {tf}
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Current Price: </span>
            <span className="font-mono font-medium">${formatPrice(currentPrice)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Trades: </span>
            <span className="font-medium">{chartData.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">24h Change: </span>
            <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}${change.toFixed(6)} ({percentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Activity className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No trading data yet</p>
              <p className="text-xs text-muted-foreground">
                Chart will update as trades happen
              </p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'price' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={formatPrice}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Time: ${formatTime(value as string)}`}
                    formatter={(value: number, name: string) => [
                      name === 'price' ? `$${formatPrice(value)}` : value,
                      name === 'price' ? 'Price' : name
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                  />
                  <ReferenceLine 
                    y={currentPrice} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5" 
                    label={{ value: "Current", position: "right" }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value.toFixed(2)} SOL`}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip 
                    labelFormatter={(value) => `Time: ${formatTime(value as string)}`}
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toFixed(4)} SOL`,
                      props.payload.type === 'buy' ? 'Buy Volume' : 'Sell Volume'
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar 
                    dataKey="volume"
                    fill="hsl(var(--primary))"
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};