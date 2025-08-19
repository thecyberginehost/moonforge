import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWalletConfig } from '@/hooks/useWalletConfig';

export const WalletConfigUpdate = () => {
  const { updateWalletAddresses, isUpdating } = useWalletConfig();

  const handleUpdate = async () => {
    try {
      await updateWalletAddresses();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Wallet Configuration</h3>
      <p className="text-sm text-gray-600 mb-4">
        Update wallet addresses from environment variables
      </p>
      <Button 
        onClick={handleUpdate}
        disabled={isUpdating}
      >
        {isUpdating ? 'Updating...' : 'Update Wallet Addresses'}
      </Button>
    </div>
  );
};