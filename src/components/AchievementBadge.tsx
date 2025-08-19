import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Achievement } from '@/hooks/useAchievements';

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  earnedAt?: string;
  tokenName?: string;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  size = 'md',
  showTooltip = true,
  earnedAt,
  tokenName,
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const rarityStyles = {
    common: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400',
    rare: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400',
    epic: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400',
    legendary: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 animate-pulse',
  };

  const badge = (
    <Badge 
      variant="outline" 
      className={`
        ${sizeClasses[size]} 
        ${rarityStyles[achievement.rarity]}
        flex items-center gap-1.5 font-medium border transition-all duration-200
        hover:scale-105 cursor-default
      `}
    >
      <span className="text-base">{achievement.icon}</span>
      <span>{achievement.name}</span>
      {achievement.rarity === 'legendary' && (
        <span className="text-xs">✨</span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{achievement.icon}</span>
              <div>
                <p className="font-semibold">{achievement.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {achievement.rarity} • {achievement.category}
                </p>
              </div>
            </div>
            <p className="text-sm">{achievement.description}</p>
            {tokenName && (
              <p className="text-xs text-muted-foreground">
                Earned for: {tokenName}
              </p>
            )}
            {earnedAt && (
              <p className="text-xs text-muted-foreground">
                Earned: {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
            {achievement.reward_type && achievement.reward_value && (
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                Reward: {achievement.reward_type === 'credits' ? `+${achievement.reward_value} credits` :
                         achievement.reward_type === 'boost_discount' ? `${achievement.reward_value}% boost discount` :
                         'VIP Access'}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AchievementBadge;