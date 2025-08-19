import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WrapperTradeRequest {
  tokenId: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  walletAddress: string;
}

interface WrapperTradeResult {
  success: boolean;
  signature: string;
  tradeType: 'buy' | 'sell';
  originalAmount: number;
  tradeAmountAfterFees: number;
  totalFees: number;
  platformFee: number;
  creatorFee: number;
  executionPrice: number;
  slippage: number;
  dex: string;
  viaWrapper: boolean;
  tokensReceived?: number;
  solReceived?: number;
}

export const useWrapperTrade = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (request: WrapperTradeRequest): Promise<WrapperTradeResult> => {
      console.log('Executing wrapper trade:', request);

      const { data, error } = await supabase.functions.invoke('wrapper-trade', {
        body: request
      });

      if (error) {
        console.error('Wrapper trade error:', error);
        throw new Error(error.message || 'Failed to execute wrapper trade');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Wrapper trade failed');
      }

      return data;
    },
    onSuccess: (result: WrapperTradeResult, variables: WrapperTradeRequest) => {
      console.log('Wrapper trade successful:', result);

      // Show success message with fee breakdown
      const feeMessage = `Fees: Platform ${result.platformFee.toFixed(4)} SOL, Creator ${result.creatorFee.toFixed(4)} SOL`;
      
      if (variables.tradeType === 'buy') {
        toast.success(
          `Buy successful! Received ${result.tokensReceived?.toFixed(2)} tokens via Raydium. ${feeMessage}`,
          { duration: 5000 }
        );
      } else {
        toast.success(
          `Sell successful! Received ${result.solReceived?.toFixed(4)} SOL via Raydium. ${feeMessage}`,
          { duration: 5000 }
        );
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      queryClient.invalidateQueries({ queryKey: ['trading-activities'] });
      queryClient.invalidateQueries({ queryKey: ['user-portfolio', variables.walletAddress] });
      queryClient.invalidateQueries({ queryKey: ['creator-earnings'] });
    },
    onError: (error: Error, variables: WrapperTradeRequest) => {
      console.error('Wrapper trade failed:', error);
      
      if (error.message.includes('insufficient')) {
        toast.error('Insufficient balance for this trade');
      } else if (error.message.includes('slippage')) {
        toast.error('Trade failed due to high slippage. Try reducing your amount.');
      } else if (error.message.includes('graduated')) {
        toast.error('This token requires wrapper trading');
      } else {
        toast.error(error.message || 'Trade failed. Please try again.');
      }
    }
  });

  return {
    executeWrapperTrade: mutation.mutate,
    isExecutingWrapper: mutation.isPending,
    wrapperError: mutation.error,
  };
};