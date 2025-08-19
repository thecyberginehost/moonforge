import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAchievements } from './useAchievements';
import { useCreatorControls } from './useCreatorControls';

export interface TokenData {
  name: string;
  symbol: string;
  image: string;
  description?: string;
  telegram_url?: string;
  x_url?: string;
}

export const useTokenCreation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { checkAchievements } = useAchievements();
  const { signTransaction, sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();
  const { creatorLimits, consumeCredit } = useCreatorControls();

  const createToken = useMutation({
    mutationFn: async ({ tokenData, walletAddress, initialBuyIn = 0, freeze = false }: { 
      tokenData: TokenData; 
      walletAddress: string;
      initialBuyIn?: number;
      freeze?: boolean;
    }) => {
      // Check creator limits before proceeding
      if (!creatorLimits.allowed) {
        throw new Error(`Creator limit: ${creatorLimits.reason}`);
      }

      console.log('Starting token creation with creator controls validated');

      // Step 1: Get transaction from backend
      const { data, error } = await supabase.functions.invoke('create-bonding-curve-token', {
        body: {
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description || 'A new token created with Moonforge',
          imageUrl: tokenData.image,
          telegram: tokenData.telegram_url,
          twitter: tokenData.x_url,
          creatorWallet: walletAddress,
          initialBuyIn,
          signedTransaction: null, // Will be updated when we have payment integration
        },
      });

      if (error) throw error;

      // Step 2: If backend returns a transaction, sign and send it
      if (data.requiresSignature && data.transaction) {
        if (!signTransaction || !sendTransaction) {
          throw new Error('Wallet not connected for signing');
        }

        try {
          console.log('Deserializing transaction...');
          // Deserialize transaction
          const transactionBuffer = new Uint8Array(data.transaction);
          const transaction = Transaction.from(transactionBuffer);
          
          console.log('Signing transaction...');
          // Sign transaction with user's wallet
          const signedTransaction = await signTransaction(transaction);
          
          console.log('Sending transaction...');
          // Send transaction
          const signature = await sendTransaction(signedTransaction, connection);
          
          console.log('Transaction sent successfully:', signature);
          
          // Wait for confirmation before declaring success
          console.log('Waiting for transaction confirmation...');
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          
          if (confirmation.value.err) {
            console.error('Transaction failed on blockchain:', confirmation.value.err);
            throw new Error(`Blockchain transaction failed: ${JSON.stringify(confirmation.value.err)}`);
          }

          console.log('Transaction confirmed successfully');
          
          // Return the confirmation result along with token data
          return {
            ...data,
            signature,
            confirmed: true
          };
          
        } catch (txError) {
          console.error('Transaction error:', txError);
          // Check if it's a partial success (token created but transaction pending)
          if (data.token) {
            console.log('Token was created but transaction may be pending');
            return {
              ...data,
              signature: null,
              confirmed: false,
              partialSuccess: true,
              error: txError.message
            };
          }
          throw txError;
        }
      }

      // If no transaction required, return the data directly
      return data;
    },
    onSuccess: (data) => {
      // Consume creator credit after successful creation
      consumeCredit.mutate();

      if (data.confirmed || data.partialSuccess) {
        let message = data.confirmed 
          ? "Token created successfully! 🎉" 
          : "Token created! Transaction may still be processing...";
          
        // Add initial investment info if applicable
        if (data.initialBuyIn > 0) {
          if (data.initialTradeResult?.error) {
            message += ` Initial investment of ${data.initialBuyIn} SOL failed: ${data.initialTradeResult.error}`;
            toast.warning(message);
          } else {
            message += ` Initial investment of ${data.initialBuyIn} SOL completed!`;
            toast.success(message);
          }
        } else {
          toast.success(message);
        }
        
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['tokens'] });
        queryClient.invalidateQueries({ queryKey: ['recent-tokens'] });
        queryClient.invalidateQueries({ queryKey: ['creator-tokens'] });
        
        // Check for creator achievements
        if (data.token?.id && data.token?.creator_wallet) {
          checkAchievements({
            userWallet: data.token.creator_wallet,
            tokenId: data.token.id,
            checkType: 'creator'
          });
        }
        
        // Navigate to token success page
        if (data.token?.id) {
          navigate(`/token-success/${data.token.id}`);
        }
      } else {
        toast.info("Token creation initiated. Please check back in a moment.");
      }
    },
    onError: (error) => {
      console.error('Token creation error:', error);
      toast.error(`Failed to create token: ${error.message}`);
      setIsCreating(false);
    },
  });

  const handleTokenCreation = async (tokenData: TokenData, initialBuyIn: number = 0, freeze: boolean = false) => {
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenData.name || !tokenData.symbol) {
      toast.error('Please provide token name and symbol');
      return;
    }

    if (initialBuyIn < 0) {
      toast.error('Initial buy-in amount must be non-negative');
      return;
    }

    // Check creator limits
    if (!creatorLimits.allowed) {
      toast.error(`Cannot create token: ${creatorLimits.reason}`);
      return;
    }

    setIsCreating(true);
    
    try {
      await createToken.mutateAsync({
        tokenData,
        walletAddress: publicKey.toString(),
        initialBuyIn,
        freeze,
      });
    } catch (error) {
      console.error('Creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createToken: handleTokenCreation,
    isCreating: createToken.isPending || isCreating,
    error: createToken.error,
    creatorLimits,
  };
};