import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWalletAuth } from './useWalletAuth';

interface PlatformSignature {
  signature: string;
  payload: {
    walletAddress: string;
    tokenId: string;
    action: string;
    timestamp: number;
    nonce: string;
    platform: string;
  };
  validUntil: number;
}

export const usePlatformSignature = () => {
  const { walletAddress } = useWalletAuth();

  const generateSignature = useMutation({
    mutationFn: async ({ tokenId, action }: { tokenId: string; action: 'buy' | 'sell' | 'create' }): Promise<PlatformSignature> => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      const { data, error } = await supabase.functions.invoke('generate-platform-signature', {
        body: {
          walletAddress,
          tokenId,
          action
        }
      });

      if (error) {
        if (error.message?.includes('PLATFORM_ACCOUNT_REQUIRED')) {
          throw new Error('You must be registered on the platform to trade tokens. Please connect your wallet and create an account.');
        }
        throw error;
      }

      return data.platformSignature;
    },
  });

  const validateSignature = (signature: PlatformSignature): boolean => {
    // Check if signature is still valid
    const now = Date.now();
    return signature.validUntil > now;
  };

  return {
    generateSignature,
    validateSignature,
    isGenerating: generateSignature.isPending,
  };
};