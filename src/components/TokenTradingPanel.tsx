
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { TrendingUp, TrendingDown, Loader2, DollarSign, Shield, ExternalLink } from "lucide-react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useTrading } from "@/hooks/useTrading";
import { Token } from "@/hooks/useTokens";
import { toast } from "sonner";

interface TokenTradingPanelProps {
  token: Token;
}

const TokenTradingPanel = ({ token }: TokenTradingPanelProps) => {
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const { executeTrade, isTrading } = useTrading();

  const handleBuy = async () => {
    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    await executeTrade({
      tokenId: token.id,
      tradeType: 'buy',
      amount: amount,
      walletAddress: walletAddress,
      slippage: 5,
      isGraduated: hasGraduated,
    });

    setBuyAmount("");
  };

  const handleSell = async () => {
    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet first');
      return;
    }

    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    await executeTrade({
      tokenId: token.id,
      tradeType: 'sell',
      amount: amount,
      walletAddress: walletAddress,
      slippage: 5,
      isGraduated: hasGraduated,
    });

    setSellAmount("");
  };

  const currentPrice = token.price || 0.001;
  const estimatedTokens = buyAmount ? (parseFloat(buyAmount) / currentPrice) * 0.98 : 0;
  const estimatedSOL = sellAmount ? (parseFloat(sellAmount) * currentPrice) * 0.98 : 0;
  
  // Check if token has graduated (market cap >= 100k)
  const hasGraduated = token.market_cap >= 100000;
  
  // Check if token is app-created (has mint address)
  const isAppToken = !!token.mint_address;
  
  // Debug logging
  console.log('Trading Panel Debug:', {
    isAuthenticated,
    isTrading,
    buyAmount,
    isAppToken,
    hasGraduated,
    walletAddress,
    tokenMintAddress: token.mint_address
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Trade {token.symbol}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Current Price: {currentPrice.toFixed(6)} SOL
        </div>
      </CardHeader>
      <CardContent>
        {/* Security & Trading Status */}
        {!isAppToken && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <Shield className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              This token was not created through our platform. Trading is restricted for security.
            </AlertDescription>
          </Alert>
        )}
        
        {hasGraduated && (
          <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              🎉 This token has graduated to Raydium! Trading via wrapper contract - creators and platform continue earning fees.
            </AlertDescription>
          </Alert>
        )}
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Sell
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyAmount">Amount (SOL)</Label>
              <Input
                id="buyAmount"
                type="number"
                placeholder="0.0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                disabled={isTrading}
                step="0.001"
                min="0"
              />
              {buyAmount && (
                <p className="text-xs text-muted-foreground">
                  ≈ {estimatedTokens.toFixed(2)} {token.symbol} (after 2% fee)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <div>Trading Fee: 2% (Auto-distributed)</div>
                <div>• Platform: 1% | Creator: 0.7% | Community: 0.2% | Liquidity: 0.1%</div>
              </div>
            </div>
            
            {/* Buy Button with Clear Status Messages */}
            {!isAuthenticated ? (
              <Button className="w-full" variant="outline" disabled>
                Connect Wallet to Buy
              </Button>
            ) : !isAppToken ? (
              <Button className="w-full" variant="outline" disabled>
                Trading Not Available
              </Button>
            ) : hasGraduated ? (
              <Button 
                onClick={handleBuy}
                disabled={isTrading}
                className="w-full"
                variant="default"
              >
                {isTrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Buy via Wrapper
                  </>
                )}
              </Button>
            ) : !buyAmount ? (
              <Button className="w-full" variant="outline" disabled>
                Enter Amount to Buy
              </Button>
            ) : (
              <Button 
                onClick={handleBuy}
                disabled={isTrading}
                className="w-full"
                variant="default"
              >
                {isTrading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Buy {token.symbol}
                  </>
                )}
              </Button>
            )}
          </TabsContent>
          
          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellAmount">Amount ({token.symbol})</Label>
              <Input
                id="sellAmount"
                type="number"
                placeholder="0.0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                disabled={isTrading}
                step="0.01"
                min="0"
              />
              {sellAmount && (
                <p className="text-xs text-muted-foreground">
                  ≈ {estimatedSOL.toFixed(6)} SOL (after 2% fee)
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                <div>Trading Fee: 2% (Auto-distributed)</div>
                <div>• Platform: 1% | Creator: 0.7% | Community: 0.2% | Liquidity: 0.1%</div>
              </div>
            </div>
            
            <Button 
              onClick={handleSell}
              disabled={!isAuthenticated || isTrading || !sellAmount || !isAppToken}
              className="w-full"
              variant="destructive"
            >
              {isTrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : hasGraduated ? (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Sell via Wrapper
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Sell {token.symbol}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
        
        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Connect your wallet to start trading
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenTradingPanel;
