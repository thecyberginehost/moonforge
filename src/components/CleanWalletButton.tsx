
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Wallet, LogOut, ChevronDown, User } from 'lucide-react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useNavigate } from 'react-router-dom';

export const CleanWalletButton = () => {
  const { connected, publicKey, connecting, select, wallets } = useWallet();
  const { logout } = useWalletAuth();
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      // Try to connect to Phantom first
      const phantomAdapter = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomAdapter) {
        select(phantomAdapter.adapter.name as any);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  if (connected && publicKey) {
    const shortAddress = `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`;
    
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            {shortAddress}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border border-border">
          <DropdownMenuItem 
            onClick={() => navigate('/profile')} 
            className="cursor-pointer"
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      disabled={connecting}
      className="flex items-center gap-2"
    >
      <Wallet className="h-4 w-4" />
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
};
