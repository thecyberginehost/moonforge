import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, Loader2, DollarSign, Info, Zap } from "lucide-react";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useBondingCurve, formatPrice, formatMarketCap, formatTokenAmount } from "@/hooks/useBondingCurve";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAchievements } from "@/hooks/useAchievements";

interface BondingCurvePanelProps {
  tokenId: string;
  tokenSymbol: string;
  tokenName: string;
  currentSolRaised: number;
  tokensSold: number;
  onTrade?: (result: any) => void;
}

const BondingCurvePanel = ({ 
  tokenId, 
  tokenSymbol, 
  tokenName, 
  currentSolRaised, 
  tokensSold,
  onTrade 
}: BondingCurvePanelProps) => {
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const { isAuthenticated, walletAddress } = useWalletAuth();
  const { signTransaction, sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();
  const { checkAchievements } = useAchievements();
  
  const { state, calculateBuy, calculateSell } = useBondingCurve(currentSolRaised, tokensSold);

  // Calculate trade previews
  const buyPreview = useMemo(() => {
    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0) return null;
    try {
      return calculateBuy(amount);
    } catch {
      return null;
    }
  }, [buyAmount, calculateBuy]);

  const sellPreview = useMemo(() => {
    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0) return null;
    try {
      return calculateSell(amount);
    } catch {
      return null;
    }
  }, [sellAmount, calculateSell]);

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

    if (!buyPreview) {
      toast.error('Invalid trade calculation');
      return;
    }

    setIsTrading(true);
    try {
      console.log('🚀 Initiating Helius Sender buy:', {
        tokenId,
        walletAddress,
        solAmount: amount
      });

      // Call the bonding curve buy function (uses Helius Sender)
      const { data, error } = await supabase.functions.invoke('bonding-curve-buy', {
        body: {
          tokenId,
          walletAddress,
          solAmount: amount
        }
      });

      if (error) {
        console.error('Helius Sender buy error:', error);
        toast.error(`Buy failed: ${error.message}`);
        return;
      }

      // Check if transaction was already sent via Helius Sender
      if (data?.signature && !data?.requiresSignature) {
        console.log('✅ Transaction sent via Helius Sender:', data.signature);
        toast.success(`✅ Successfully bought ${data.trade.tokensOut.toFixed(2)} ${tokenSymbol} for ${amount} SOL! ${data.tipAmount ? `(Tip: ${data.tipAmount} SOL)` : ''}`);
        
        // Call onTrade callback to refresh data
        onTrade?.(data.trade);
        setBuyAmount("");
        
        // Check for achievements after successful trade
        if (walletAddress) {
          checkAchievements({
            userWallet: walletAddress,
            tokenId,
            checkType: 'trading'
          });
        }
        return;
      }

      // Fallback: If Sender failed, transaction needs to be signed
      if (data?.requiresSignature && data?.transaction) {
        console.log('🎯 Sender fallback - Buy transaction prepared, signing with wallet...');
        
        if (!signTransaction || !sendTransaction) {
          throw new Error('Wallet not connected for signing');
        }

        try {
          // Deserialize and sign the transaction
          const transactionBuffer = new Uint8Array(data.transaction);
          const transaction = Transaction.from(transactionBuffer);
          
          console.log('Signing buy transaction...');
          const signedTransaction = await signTransaction(transaction);
          
          console.log('Sending buy transaction...');
          const signature = await sendTransaction(signedTransaction, connection);
          
          console.log('Buy transaction sent:', signature);
          
          // Wait for confirmation
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          
          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          // Execute the actual buy with the platform
          const { data: executeData, error: executeError } = await supabase.functions.invoke('execute-bonding-curve-buy', {
            body: {
              tokenId,
              walletAddress,
              solAmount: amount,
              signedTransaction: Array.from(signedTransaction.serialize()),
              platformSignature: data.platformSignature
            }
          });

          if (executeError) {
            throw new Error(`Execution failed: ${executeError.message}`);
          }

          toast.success(`✅ Successfully bought ${executeData.trade.tokensOut.toFixed(2)} ${tokenSymbol} for ${amount} SOL!`);
          
          // Call onTrade callback to refresh data
          onTrade?.(executeData.trade);
          setBuyAmount("");
          
          // Check for achievements after successful trade
          if (walletAddress) {
            checkAchievements({
              userWallet: walletAddress,
              tokenId,
              checkType: 'trading'
            });
          }
        } catch (txError) {
          console.error('Transaction signing/sending error:', txError);
          throw new Error(`Transaction failed: ${txError.message}`);
        }
      } else {
        toast.error('Failed to prepare buy transaction');
      }
    } catch (error: any) {
      console.error('Buy error:', error);
      toast.error(error?.message || 'Failed to prepare buy transaction');
    } finally {
      setIsTrading(false);
    }
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

    if (!sellPreview) {
      toast.error('Invalid trade calculation');
      return;
    }

    setIsTrading(true);
    try {
      console.log('🚀 Initiating smart contract sell:', {
        tokenId,
        walletAddress,
        tokenAmount: amount
      });

      // Call the new bonding curve sell function (smart contract)
      const { data, error } = await supabase.functions.invoke('bonding-curve-sell', {
        body: {
          tokenId,
          walletAddress,
          tokenAmount: amount
        }
      });

      if (error) {
        console.error('Smart contract sell error:', error);
        toast.error(`Sell failed: ${error.message}`);
        return;
      }

      if (data?.requiresSignature && data?.transaction) {
        console.log('🎯 Sell transaction prepared, signing with wallet...');
        
        if (!signTransaction || !sendTransaction) {
          throw new Error('Wallet not connected for signing');
        }

        try {
          // Deserialize and sign the transaction
          const transactionBuffer = new Uint8Array(data.transaction);
          const transaction = Transaction.from(transactionBuffer);
          
          console.log('Signing sell transaction...');
          const signedTransaction = await signTransaction(transaction);
          
          console.log('Sending sell transaction...');
          const signature = await sendTransaction(signedTransaction, connection);
          
          console.log('Sell transaction sent:', signature);
          
          // Wait for confirmation
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          
          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          // Execute the actual sell with the platform
          const { data: executeData, error: executeError } = await supabase.functions.invoke('execute-bonding-curve-sell', {
            body: {
              tokenId,
              walletAddress,
              tokenAmount: amount,
              signedTransaction: Array.from(signedTransaction.serialize()),
              platformSignature: data.platformSignature
            }
          });

          if (executeError) {
            throw new Error(`Execution failed: ${executeError.message}`);
          }

          toast.success(`✅ Successfully sold ${amount} ${tokenSymbol} for ${executeData.trade.solOut.toFixed(6)} SOL!`);
          
          // Call onTrade callback to refresh data
          onTrade?.(executeData.trade);
          setSellAmount("");
          
          // Check for achievements after successful trade
          if (walletAddress) {
            checkAchievements({
              userWallet: walletAddress,
              tokenId,
              checkType: 'trading'
            });
          }
        } catch (txError) {
          console.error('Transaction signing/sending error:', txError);
          throw new Error(`Transaction failed: ${txError.message}`);
        }
      } else {
        toast.error('Failed to prepare sell transaction');
      }
    } catch (error: any) {
      console.error('Sell error:', error);
      toast.error(error?.message || 'Failed to prepare sell transaction');
    } finally {
      setIsTrading(false);
    }
  };

  // Quick buy amounts
  const quickBuyAmounts = [0.1, 0.5, 1, 5];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Bonding Curve Trading
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {state.isGraduated ? 'Graduated' : 'Active Curve'}
          </Badge>
          <span>Price: {formatPrice(state.currentPrice)} SOL</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Graduation Alert */}
        {state.isGraduated && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              This token has graduated! Trading is now on Raydium DEX.
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
            {/* Quick Buy Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickBuyAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBuyAmount(amount.toString())}
                  disabled={isTrading || state.isGraduated}
                  className="text-xs"
                >
                  {amount} SOL
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyAmount">Amount (SOL)</Label>
              <Input
                id="buyAmount"
                type="number"
                placeholder="0.0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                disabled={isTrading || state.isGraduated}
                step="0.001"
                min="0"
              />
            </div>

            {/* Buy Preview */}
            {buyPreview && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>You'll receive:</span>
                    <span className="font-mono">{formatTokenAmount(buyPreview.tokensOut)} {tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price after:</span>
                    <span className="font-mono">{formatPrice(buyPreview.priceAfter)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market cap after:</span>
                    <span className="font-mono">{formatMarketCap(buyPreview.marketCapAfter)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Price impact:</span>
                    <span>{(((buyPreview.priceAfter - state.currentPrice) / state.currentPrice) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Buy Button */}
            {!isAuthenticated ? (
              <Button className="w-full" variant="outline" disabled>
                Connect Wallet to Buy
              </Button>
            ) : state.isGraduated ? (
              <Button className="w-full" variant="outline" disabled>
                Trade on Raydium
              </Button>
            ) : !buyAmount ? (
              <Button className="w-full" variant="outline" disabled>
                Enter Amount to Buy
              </Button>
            ) : (
              <Button 
                onClick={handleBuy}
                disabled={isTrading || !buyPreview}
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
                    Buy {tokenSymbol}
                  </>
                )}
              </Button>
            )}
          </TabsContent>
          
          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellAmount">Amount ({tokenSymbol})</Label>
              <Input
                id="sellAmount"
                type="number"
                placeholder="0.0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                disabled={isTrading || state.isGraduated}
                step="0.01"
                min="0"
              />
            </div>

            {/* Sell Preview */}
            {sellPreview && (
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>You'll receive:</span>
                    <span className="font-mono">{Math.abs(sellPreview.solIn).toFixed(4)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Price after:</span>
                    <span className="font-mono">{formatPrice(sellPreview.priceAfter)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market cap after:</span>
                    <span className="font-mono">{formatMarketCap(sellPreview.marketCapAfter)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Price impact:</span>
                    <span>{(((sellPreview.priceAfter - state.currentPrice) / state.currentPrice) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleSell}
              disabled={!isAuthenticated || isTrading || !sellAmount || !sellPreview || state.isGraduated}
              className="w-full"
              variant="destructive"
            >
              {isTrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Sell {tokenSymbol}
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Info Section */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="font-medium">Bonding Curve Info:</div>
            <div>• Price increases with each buy</div>
            <div>• No slippage protection needed</div>
            <div>• Instant liquidity via formula</div>
            <div>• Graduates at {formatMarketCap(100000)} market cap</div>
          </div>
        </div>

        {!isAuthenticated && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Connect your wallet to start trading on the bonding curve
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BondingCurvePanel;