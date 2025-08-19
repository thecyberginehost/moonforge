import { useWallet } from '@solana/wallet-adapter-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useWalletAuth = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const queryClient = useQueryClient();
  
  const walletAddress = publicKey?.toString();

  // Query to get user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    enabled: !!walletAddress && connected,
  });

  // Mutation to create or update profile
  const createOrUpdateProfile = useMutation({
    mutationFn: async (walletAddress: string) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: walletAddress,
          last_active: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', walletAddress] });
    },
  });

  // Auto-create profile when wallet connects
  useEffect(() => {
    if (connected && walletAddress && !profile && !isLoading) {
      createOrUpdateProfile.mutate(walletAddress);
    }
  }, [connected, walletAddress, profile, isLoading]);

  // Update last active when connected
  useEffect(() => {
    if (connected && walletAddress && profile) {
      const updateLastActive = async () => {
        await supabase
          .from('profiles')
          .update({ last_active: new Date().toISOString() })
          .eq('wallet_address', walletAddress);
      };
      
      updateLastActive();
    }
  }, [connected, walletAddress, profile]);

  const logout = () => {
    disconnect();
    queryClient.clear();
  };

  return {
    isConnected: connected,
    walletAddress,
    profile,
    isLoading,
    logout,
    isAuthenticated: connected && !!walletAddress,
  };
};