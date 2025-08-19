import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserProfile, useUpdateProfile, useCreateProfile } from '@/hooks/useUserProfile';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { User, Save, Camera } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { walletAddress } = useWalletAuth();
  const { data: profile } = useUserProfile(walletAddress);
  const updateProfile = useUpdateProfile();
  const createProfile = useCreateProfile();
  
  const [username, setUsername] = useState(profile?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  React.useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!walletAddress) return;

    const updates = {
      username: username.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    };

    if (profile) {
      await updateProfile.mutateAsync(updates);
    } else {
      await createProfile.mutateAsync({
        wallet_address: walletAddress,
        username: updates.username,
      });
    }
    
    onClose();
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg">
                  {username ? username.charAt(0).toUpperCase() : 
                   walletAddress ? formatWalletAddress(walletAddress) : '?'}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => {
                  // For now, just prompt for URL. In future, could add file upload
                  const url = prompt('Enter avatar image URL:');
                  if (url) setAvatarUrl(url);
                }}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Wallet: {walletAddress ? formatWalletAddress(walletAddress) : 'Not connected'}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                placeholder="Enter a unique display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                This will be shown instead of your wallet address in forums and throughout the platform.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL (optional)</Label>
              <Input
                id="avatar"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Profile Stats */}
          {profile && (
            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Profile Stats</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tokens Created</p>
                  <p className="font-medium">{profile.total_tokens_created}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Volume Traded</p>
                  <p className="font-medium">{profile.total_volume_traded.toFixed(2)} SOL</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={updateProfile.isPending || createProfile.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};