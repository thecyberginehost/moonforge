import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useWalletConfig = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateWalletAddresses = async () => {
    setIsUpdating(true);
    try {
      console.log('Calling update-wallet-config function...');
      
      const { data, error } = await supabase.functions.invoke('update-wallet-config', {
        body: {}
      });

      if (error) {
        console.error('Function call error:', error);
        throw error;
      }

      console.log('Update result:', data);
      toast.success('Wallet addresses updated successfully!');
      return data;
    } catch (error) {
      console.error('Failed to update wallet addresses:', error);
      toast.error('Failed to update wallet addresses');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateWalletAddresses,
    isUpdating
  };
};