import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { LogOut, Wallet } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { MobileWalletButton } from './MobileWalletButton';

export const WalletButton = () => {
  const { connected, publicKey } = useWallet();
  const { logout } = useWalletAuth();

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Use mobile wallet button for mobile devices
  if (isMobile) {
    return <MobileWalletButton />;
  }

  // Desktop wallet connection
  if (connected && publicKey) {
    const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          {shortAddress}
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={logout}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-md !h-10 !px-4 !py-2 !text-sm !font-medium !transition-colors" />
  );
};