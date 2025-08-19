import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AchievementDisplay from '@/components/AchievementDisplay';
import Navigation from '@/components/Navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { supabase } from '@/integrations/supabase/client';
import { User, Edit2, Trophy, Coins, Activity, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export const Profile = () => {
  const { walletAddress: urlWalletAddress } = useParams();
  const { walletAddress: currentUserWallet } = useWalletAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    avatar_url: ''
  });

  // Use URL wallet address or current user's wallet
  const profileWallet = urlWalletAddress || currentUserWallet;
  const { data: profile, refetch } = useUserProfile(profileWallet);
  
  const isOwnProfile = currentUserWallet === profileWallet;

  // If no wallet address and not logged in, redirect to home
  if (!profileWallet) {
    return <Navigate to="/" replace />;
  }

  const handleEditClick = () => {
    setEditForm({
      username: profile?.username || '',
      avatar_url: profile?.avatar_url || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: currentUserWallet,
          username: editForm.username || null,
          avatar_url: editForm.avatar_url || null,
          last_active: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Profile updated successfully');
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-2xl">
                      {profile?.username 
                        ? profile.username.charAt(0).toUpperCase()
                        : <User className="h-8 w-8" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="username">Display Name</Label>
                          <Input
                            id="username"
                            value={editForm.username}
                            onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                            placeholder="Enter display name"
                            className="w-64"
                          />
                        </div>
                        <div>
                          <Label htmlFor="avatar">Avatar URL</Label>
                          <Input
                            id="avatar"
                            value={editForm.avatar_url}
                            onChange={(e) => setEditForm({...editForm, avatar_url: e.target.value})}
                            placeholder="Enter avatar URL"
                            className="w-64"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveProfile} size="sm">
                            Save Changes
                          </Button>
                          <Button 
                            onClick={() => setIsEditing(false)} 
                            variant="outline" 
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-bold">
                          {profile?.username || formatWalletAddress(profileWallet)}
                        </h1>
                        <p className="text-muted-foreground font-mono text-sm">
                          {formatWalletAddress(profileWallet)}
                        </p>
                        {profile?.created_at && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            Joined {formatDate(profile.created_at)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {isOwnProfile && !isEditing && (
                  <Button onClick={handleEditClick} variant="outline" size="sm">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Profile Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {profile?.total_tokens_created || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Tokens Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">
                      {profile?.total_volume_traded ? 
                        `${parseFloat(profile.total_volume_traded.toString()).toFixed(2)} SOL` : 
                        '0 SOL'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Volume Traded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Achievements</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Content Tabs */}
          <Tabs defaultValue="achievements" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="achievements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Achievements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AchievementDisplay walletAddress={profileWallet} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Activity tracking coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};