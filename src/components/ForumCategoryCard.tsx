import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ForumCategory } from '@/hooks/useForums';
import { MessageSquare, Clock } from 'lucide-react';

interface ForumCategoryCardProps {
  category: ForumCategory;
  postCount?: number;
  lastActivity?: string;
  onClick: () => void;
}

export const ForumCategoryCard: React.FC<ForumCategoryCardProps> = ({
  category,
  postCount = 0,
  lastActivity,
  onClick,
}) => {
  return (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-2 rounded-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{category.name}</h3>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {postCount} posts
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <MessageSquare className="h-4 w-4" />
            <span>{postCount} discussion{postCount !== 1 ? 's' : ''}</span>
          </div>
          
          {lastActivity && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(lastActivity).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};