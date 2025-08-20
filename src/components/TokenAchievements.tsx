// src/components/TokenAchievements.tsx
// Display achievements for a token

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTokenAchievements } from '@/hooks/useTokenAchievements';
import { Trophy, Zap, Users, TrendingUp, MessageCircle, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TokenAchievementsProps {
  tokenId: string;
  compact?: boolean;
}

const categoryIcons = {
  speed: Zap,
  community: Users,
  trading: TrendingUp,
  social: MessageCircle,
  milestone: Target,
};

export const TokenAchievements = ({ tokenId, compact = false }: TokenAchievementsProps) => {
  const {
    achievements,
    totalPoints,
    totalDiscount,
    weeklyAchievements,
    nextMilestone,
    isLoading,
    showNewAchievement,
    setShowNewAchievement,
  } = useTokenAchievements(tokenId);

  if (isLoading) {
    return <div className="animate-pulse">Loading achievements...</div>;
  }

  const earnedAchievements = achievements.filter(a => a.earned);
  const availableAchievements = achievements.filter(a => !a.earned);

  if (compact) {
    // Compact view for token cards
    return (
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="text-sm">
          {earnedAchievements.length}/{achievements.length} Achievements
        </span>
        {totalDiscount > 0 && (
          <Badge variant="secondary" className="text-xs">
            -{(totalDiscount / 100).toFixed(2)}% fees
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements
            </div>
            <div className="text-sm font-normal">
              {totalPoints} points • {(totalDiscount / 100).toFixed(2)}% fee discount
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Next Milestone */}
          {nextMilestone && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Next: {nextMilestone.name}</span>
                <span className="text-muted-foreground">
                  {nextMilestone.progress?.toFixed(0)}%
                </span>
              </div>
              <Progress value={nextMilestone.progress} className="h-2" />
            </div>
          )}

          {/* Earned Achievements */}
          {earnedAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Earned ({earnedAchievements.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {earnedAchievements.map((achievement) => {
                  const Icon = categoryIcons[achievement.category as keyof typeof categoryIcons] || Trophy;
                  const isWeekly = weeklyAchievements.includes(achievement.id);
                  
                  return (
                    <TooltipProvider key={achievement.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={`
                              p-3 rounded-lg border text-center cursor-pointer
                              ${isWeekly ? 'border-yellow-500 bg-yellow-500/10' : 'bg-muted/50'}
                              hover:bg-muted transition-colors
                            `}
                          >
                            <div className="text-2xl mb-1">{achievement.icon}</div>
                            <div className="text-xs font-medium truncate">
                              {achievement.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              +{achievement.points}pts
                            </div>
                            {isWeekly && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                2x Weekly
                              </Badge>
                            )}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">{achievement.name}</div>
                            <div className="text-sm">{achievement.description}</div>
                            {achievement.fee_discount_bps > 0 && (
                              <div className="text-sm text-green-500">
                                -{(achievement.fee_discount_bps / 100).toFixed(2)}% fees
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Achievements */}
          {availableAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Available ({availableAchievements.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableAchievements.slice(0, 6).map((achievement) => {
                  const isWeekly = weeklyAchievements.includes(achievement.id);
                  
                  return (
                    <TooltipProvider key={achievement.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`
                              p-3 rounded-lg border text-center opacity-50
                              ${isWeekly ? 'border-yellow-500/50' : 'border-border'}
                            `}
                          >
                            <div className="text-2xl mb-1 grayscale">{achievement.icon}</div>
                            <div className="text-xs font-medium truncate">
                              {achievement.name}
                            </div>
                            {achievement.progress > 0 && (
                              <Progress 
                                value={achievement.progress} 
                                className="h-1 mt-1" 
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">{achievement.name}</div>
                            <div className="text-sm">{achievement.description}</div>
                            {achievement.progress > 0 && (
                              <div className="text-sm">
                                Progress: {achievement.progress.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Achievement Popup */}
      <AnimatePresence>
        {showNewAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed bottom-4 right-4 z-50"
            onClick={() => setShowNewAchievement(null)}
          >
            <Card className="border-yellow-500 bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="text-5xl animate-bounce">
                    {showNewAchievement.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Achievement Unlocked!</h3>
                    <p className="text-xl font-semibold">{showNewAchievement.name}</p>
                    <p className="text-sm text-muted-foreground">
                      +{showNewAchievement.points} points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};