import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfileModal } from './UserProfileModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { User } from 'lucide-react';

export const UserProfileButton: React.FC = () => {
  const { walletAddress } = useWalletAuth();
  const { data: profile } = useUserProfile(walletAddress);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!walletAddress) return null;

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center space-x-2"
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="text-xs">
            {profile?.username 
              ? profile.username.charAt(0).toUpperCase()
              : <User className="h-3 w-3" />
            }
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">
          {profile?.username || formatWalletAddress(walletAddress)}
        </span>
      </Button>
      
      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};