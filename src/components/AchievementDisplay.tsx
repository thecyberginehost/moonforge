import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAchievements } from '@/hooks/useAchievements';
import AchievementBadge from './AchievementBadge';
import { Trophy, Star, Target, Users } from 'lucide-react';

interface AchievementDisplayProps {
  walletAddress?: string;
  compact?: boolean;
}

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  walletAddress,
  compact = false,
}) => {
  const { 
    achievementTypes, 
    userAchievements, 
    isLoading, 
    getAchievementStats 
  } = useAchievements(walletAddress);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getAchievementStats(userAchievements || []);
  const totalPossible = achievementTypes?.length || 0;
  const completionPercentage = totalPossible > 0 ? (stats.total / totalPossible) * 100 : 0;

  if (compact) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">Achievements</span>
            </div>
            <Badge variant="outline">{stats.total}/{totalPossible}</Badge>
          </div>
          <Progress value={completionPercentage} className="mb-3" />
          <div className="flex flex-wrap gap-1">
            {userAchievements?.slice(0, 6).map((ua) => (
              <AchievementBadge
                key={ua.id}
                achievement={ua.achievement_types}
                size="sm"
                earnedAt={ua.earned_at}
                tokenName={ua.tokens?.name}
              />
            ))}
            {stats.total > 6 && (
              <Badge variant="outline" className="text-xs">
                +{stats.total - 6} more
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const categoryIcons = {
    milestone: Target,
    creator: Star,
    community: Users,
    trading: Trophy,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Achievements
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{stats.total}/{totalPossible} unlocked</span>
          <Progress value={completionPercentage} className="flex-1 max-w-32" />
          <span>{Math.round(completionPercentage)}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="earned" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="earned">
              Earned ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="milestone">
              Milestones ({stats.byCategory.milestone})
            </TabsTrigger>
            <TabsTrigger value="trading">
              Trading ({stats.byCategory.trading})
            </TabsTrigger>
            <TabsTrigger value="creator">
              Creator ({stats.byCategory.creator})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({totalPossible})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="space-y-4">
            {userAchievements && userAchievements.length > 0 ? (
              <div className="grid gap-3">
                {userAchievements.map((ua) => (
                  <div
                    key={ua.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ua.achievement_types.icon}</span>
                      <div>
                        <h4 className="font-medium">{ua.achievement_types.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {ua.achievement_types.description}
                        </p>
                        {ua.tokens && (
                          <p className="text-xs text-muted-foreground">
                            Token: {ua.tokens.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={
                        ua.achievement_types.rarity === 'legendary' ? 'border-red-300 text-red-700' :
                        ua.achievement_types.rarity === 'epic' ? 'border-purple-300 text-purple-700' :
                        ua.achievement_types.rarity === 'rare' ? 'border-blue-300 text-blue-700' :
                        'border-green-300 text-green-700'
                      }>
                        {ua.achievement_types.rarity}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(ua.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No achievements earned yet</p>
                <p className="text-sm">Create your first token to get started!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="milestone" className="space-y-4">
            <div className="grid gap-3">
              {achievementTypes
                ?.filter((at) => at.category === 'milestone')
                .map((achievement) => {
                  const earned = userAchievements?.some(
                    (ua) => ua.achievement_type_id === achievement.id
                  );
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        earned 
                          ? 'bg-card/50 border-green-200 dark:border-green-800' 
                          : 'bg-muted/30 opacity-60'
                      }`}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      {earned && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          ✓ Earned
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <div className="grid gap-3">
              {achievementTypes
                ?.filter((at) => at.category === 'trading')
                .map((achievement) => {
                  const earned = userAchievements?.some(
                    (ua) => ua.achievement_type_id === achievement.id
                  );
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        earned 
                          ? 'bg-card/50 border-green-200 dark:border-green-800' 
                          : 'bg-muted/30 opacity-60'
                      }`}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      {earned && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          ✓ Earned
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="creator" className="space-y-4">
            <div className="grid gap-3">
              {achievementTypes
                ?.filter((at) => at.category === 'creator')
                .map((achievement) => {
                  const earned = userAchievements?.some(
                    (ua) => ua.achievement_type_id === achievement.id
                  );
                  return (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        earned 
                          ? 'bg-card/50 border-green-200 dark:border-green-800' 
                          : 'bg-muted/30 opacity-60'
                      }`}
                    >
                      <span className="text-2xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      {earned && (
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          ✓ Earned
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-3">
              {achievementTypes?.map((achievement) => {
                const earned = userAchievements?.some(
                  (ua) => ua.achievement_type_id === achievement.id
                );
                const IconComponent = categoryIcons[achievement.category as keyof typeof categoryIcons] || Target;
                
                return (
                  <div
                    key={achievement.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      earned 
                        ? 'bg-card/50 border-green-200 dark:border-green-800' 
                        : 'bg-muted/30 opacity-60'
                    }`}
                  >
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{achievement.name}</h4>
                        <IconComponent className="w-3 h-3 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          {achievement.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    {earned ? (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        ✓ Earned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className={
                        achievement.rarity === 'legendary' ? 'border-red-300 text-red-700' :
                        achievement.rarity === 'epic' ? 'border-purple-300 text-purple-700' :
                        achievement.rarity === 'rare' ? 'border-blue-300 text-blue-700' :
                        'border-green-300 text-green-700'
                      }>
                        {achievement.rarity}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AchievementDisplay;