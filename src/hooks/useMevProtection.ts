import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWalletAuth } from './useWalletAuth';
import { toast } from 'sonner';

interface MEVProtectionOptions {
  bundleType?: 'flash' | 'priority' | 'standard';
  tokenAddress?: string;
  expectedPrice?: number;
  maxSlippage?: number;
  tradeSize?: number;
  antiSandwich?: boolean;
}

interface MEVProtectionResult {
  success: boolean;
  bundleId?: string;
  signatures?: string[];
  protectionLevel?: string;
  estimatedSavings?: string;
  error?: string;
}

export const useMevProtection = () => {
  const { walletAddress } = useWalletAuth();

  const protectTransaction = useMutation({
    mutationFn: async ({ 
      transactions, 
      options = {} 
    }: { 
      transactions: string[]; 
      options?: MEVProtectionOptions 
    }): Promise<MEVProtectionResult> => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      const {
        bundleType = 'standard',
        tokenAddress,
        expectedPrice,
        maxSlippage = 5,
        tradeSize,
        antiSandwich = true
      } = options;

      console.log(`Requesting MEV protection for ${transactions.length} transactions`);
      
      const { data, error } = await supabase.functions.invoke('mev-protection', {
        body: {
          transactions,
          userWallet: walletAddress,
          bundleType,
          tokenAddress,
          expectedPrice,
          maxSlippage,
          tradeSize,
          options: {
            antiSandwich,
            priorityFeeMultiplier: bundleType === 'flash' ? 3 : bundleType === 'priority' ? 2 : 1.5,
            skipPreflightCheck: false
          }
        }
      });

      if (error) {
        // Handle specific MEV protection errors
        if (error.message?.includes('Transaction blocked for MEV protection')) {
          const errorData = typeof error === 'object' ? error : {};
          throw new Error(`MEV Protection: ${errorData.reason || 'High risk detected'}`);
        }
        throw error;
      }

      return {
        success: data.success,
        bundleId: data.result?.bundleId,
        signatures: data.result?.signatures,
        protectionLevel: data.protectionLevel,
        estimatedSavings: data.estimatedSavings
      };
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Transaction protected! ${data.estimatedSavings || ''}`
        );
      }
    },
    onError: (error: Error) => {
      if (error.message.includes('MEV Protection:')) {
        toast.warning(error.message, {
          duration: 8000
        });
      } else {
        toast.error(`MEV protection failed: ${error.message}`);
      }
    },
  });

  const calculateProtectionLevel = (tradeSize: number, tokenVolume?: number): 'flash' | 'priority' | 'standard' => {
    // Automatically suggest protection level based on trade characteristics
    if (tradeSize > 20 || (tokenVolume && tokenVolume > 10000)) {
      return 'flash'; // High value trades need maximum protection
    } else if (tradeSize > 5 || (tokenVolume && tokenVolume > 1000)) {
      return 'priority'; // Medium value trades need enhanced protection
    }
    return 'standard'; // Standard protection for smaller trades
  };

  const estimateProtectionCost = (bundleType: 'flash' | 'priority' | 'standard', transactionCount: number = 1): string => {
    const baseFees = {
      flash: 0.002, // ~0.002 SOL per transaction
      priority: 0.001, // ~0.001 SOL per transaction
      standard: 0.0005 // ~0.0005 SOL per transaction
    };
    
    const totalCost = baseFees[bundleType] * transactionCount;
    return `~${totalCost.toFixed(4)} SOL`;
  };

  return {
    protectTransaction,
    calculateProtectionLevel,
    estimateProtectionCost,
    isProtecting: protectTransaction.isPending,
  };
};