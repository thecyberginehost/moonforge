import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';

export const MobileWalletButton = () => {
  const { connected, publicKey, connecting, select, wallets, wallet } = useWallet();
  const { logout } = useWalletAuth();

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleConnect = async () => {
    try {
      if (isMobile) {
        // For mobile, try to connect to Phantom directly
        const phantomAdapter = wallets.find(w => w.adapter.name === 'Phantom');
        if (phantomAdapter) {
          select(phantomAdapter.adapter.name as any);
          
          // Wait a bit and if still not connected, use deep link
          setTimeout(async () => {
            if (!connected && !connecting) {
              // Use the correct Phantom mobile URL
              const phantomUrl = `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}?ref=${encodeURIComponent(window.location.origin)}`;
              window.open(phantomUrl, '_blank');
            }
          }, 2000);
        }
      } else {
        // Desktop: select Phantom
        const phantomAdapter = wallets.find(w => w.adapter.name === 'Phantom');
        if (phantomAdapter) {
          select(phantomAdapter.adapter.name as any);
        }
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

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
    <Button 
      onClick={handleConnect}
      disabled={connecting}
      className="bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <Wallet className="h-4 w-4 mr-2" />
      {connecting ? 'Connecting...' : isMobile ? 'Connect Wallet' : 'Connect Phantom'}
    </Button>
  );
};