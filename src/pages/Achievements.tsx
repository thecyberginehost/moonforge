import React from 'react';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import AchievementDisplay from '@/components/AchievementDisplay';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, Star, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Achievements: React.FC = () => {
  const { walletAddress, isConnected } = useWalletAuth();

  if (!isConnected || !walletAddress) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-3xl font-bold mb-2">Achievements</h1>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view your achievements and progress
            </p>
            <Button asChild>
              <Link to="/">Connect Wallet</Link>
            </Button>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Achievement Center
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your milestones and unlock exclusive rewards
          </p>
        </div>

        {/* Achievement Categories Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <Target className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="font-semibold text-sm">Milestones</h3>
              <p className="text-xs text-muted-foreground">Market cap & graduation goals</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold text-sm">Trading</h3>
              <p className="text-xs text-muted-foreground">Volume & performance achievements</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Star className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold text-sm">Creator</h3>
              <p className="text-xs text-muted-foreground">Token creation achievements</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-4">
              <Award className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <h3 className="font-semibold text-sm">Community</h3>
              <p className="text-xs text-muted-foreground">AI usage & platform engagement</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Achievement Display */}
        <AchievementDisplay walletAddress={walletAddress} />

        {/* Achievement Rewards Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-500" />
              Achievement Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">C</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Credits</h4>
                  <p className="text-xs text-muted-foreground">Extra AI generation credits</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">%</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Boost Discounts</h4>
                  <p className="text-xs text-muted-foreground">Reduced boost pricing</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">T</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Trading Discounts</h4>
                  <p className="text-xs text-muted-foreground">Lower trading fees</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                  <span className="text-purple-600 font-bold text-sm">V</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm">VIP Access</h4>
                  <p className="text-xs text-muted-foreground">Exclusive smart contract AI</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="text-center bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-2">Ready to Earn More Achievements?</h3>
            <p className="text-muted-foreground mb-4">
              Create tokens, trade actively, and unlock exclusive rewards
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link to="/create">Create Token</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/tokens">Start Trading</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
};

export default Achievements;