
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { DollarSign, TrendingUp, Clock, Coins } from "lucide-react";
import { useCreatorEarnings, useTotalCreatorEarnings } from "@/hooks/useCreatorEarnings";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const CreatorEarningsPanel = () => {
  const { walletAddress } = useWalletAuth();
  const { data: earnings = [], isLoading, refetch } = useCreatorEarnings(walletAddress);
  const { data: totals, refetch: refetchTotals } = useTotalCreatorEarnings(walletAddress);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async (tokenId?: string) => {
    if (!walletAddress) return;
    
    const claimableAmount = tokenId 
      ? earnings.find(e => e.token_id === tokenId)?.claimable_amount || 0
      : totals?.totalClaimable || 0;

    if (claimableAmount <= 0) {
      toast.error('No earnings available to claim');
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke('claim-earnings', {
        body: {
          creatorWallet: walletAddress,
          tokenId,
        },
      });

      if (error) throw error;

      toast.success(`Successfully claimed ${data.transaction.amount} SOL!`);
      
      // Refresh data
      refetch();
      refetchTotals();
    } catch (error) {
      console.error('Claim error:', error);
      toast.error(error.message || "Failed to claim earnings");
    } finally {
      setClaiming(false);
    }
  };

  if (!walletAddress) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect your wallet to view earnings</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading earnings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Creator Earnings Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totals?.totalEarned.toFixed(6) || '0.000000'} SOL
              </div>
              <div className="text-sm text-muted-foreground">Total Earned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totals?.totalClaimable.toFixed(6) || '0.000000'} SOL
              </div>
              <div className="text-sm text-muted-foreground">Available to Claim</div>
            </div>
            <div className="text-center">
              <Button 
                onClick={() => handleClaim()}
                disabled={!totals?.totalClaimable || totals.totalClaimable <= 0 || claiming}
                className="w-full"
              >
                <Coins className="mr-2 h-4 w-4" />
                {claiming ? 'Claiming...' : 'Claim All Earnings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Token Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Earnings by Token
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No earnings yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create tokens and earn 0.7% from every trade!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.map((earning) => (
                <div 
                  key={earning.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">Token ID: {earning.token_id.slice(0, 8)}...</div>
                    <div className="text-sm text-muted-foreground">
                      Last updated: {new Date(earning.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {Number(earning.total_earned).toFixed(6)} SOL
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Claimable: {Number(earning.claimable_amount).toFixed(6)} SOL
                      </div>
                    </div>
                    {Number(earning.claimable_amount) > 0 && (
                      <Button 
                        size="sm"
                        onClick={() => handleClaim(earning.token_id)}
                        disabled={claiming}
                      >
                        {claiming ? '...' : 'Claim'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fee Structure Info */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Distribution Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Trading Fee:</span>
              <span className="font-medium">2%</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>• Creator Share:</span>
              <span className="font-medium">0.7% (35%)</span>
            </div>
            <div className="flex justify-between">
              <span>• Platform Fee:</span>
              <span className="font-medium">1.0% (50%)</span>
            </div>
            <div className="flex justify-between">
              <span>• Community Pool:</span>
              <span className="font-medium">0.2% (10%)</span>
            </div>
            <div className="flex justify-between">
              <span>• Liquidity Pool:</span>
              <span className="font-medium">0.1% (5%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorEarningsPanel;
