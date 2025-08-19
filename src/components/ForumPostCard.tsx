import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ForumPost } from '@/hooks/useForums';
import { MessageSquare, Eye, Pin, Lock, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ForumPostCardProps {
  post: ForumPost;
  onClick: () => void;
  showCategory?: boolean;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  onClick,
  showCategory = true,
}) => {
  const getPostTypeColor = (type: string) => {
    switch (type) {
      case 'question': return 'bg-blue-100 text-blue-800';
      case 'bug_report': return 'bg-red-100 text-red-800';
      case 'feature_request': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPostTypeLabel = (type: string) => {
    switch (type) {
      case 'question': return 'Question';
      case 'bug_report': return 'Bug Report';
      case 'feature_request': return 'Feature Request';
      default: return 'Discussion';
    }
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 ${
        post.is_pinned ? 'ring-2 ring-primary/20' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {post.is_pinned && (
                <Pin className="h-4 w-4 text-primary" />
              )}
              {post.is_locked && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge 
                variant="secondary" 
                className={getPostTypeColor(post.post_type)}
              >
                {getPostTypeLabel(post.post_type)}
              </Badge>
              {showCategory && post.category && (
                <Badge 
                  variant="outline"
                  style={{ borderColor: post.category.color }}
                >
                  {post.category.icon} {post.category.name}
                </Badge>
              )}
            </div>
            
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">
              {post.title}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {post.content}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.user_profile?.avatar_url} />
              <AvatarFallback className="text-xs">
                {post.user_profile?.username 
                  ? post.user_profile.username.charAt(0).toUpperCase()
                  : formatWalletAddress(post.user_wallet)
                }
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">
                {post.user_profile?.username || formatWalletAddress(post.user_wallet)}
              </p>
              <p className="text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{post.view_count}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-4 w-4" />
              <span>{post.reply_count}</span>
            </div>
            {post.last_reply_at && (
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(post.last_reply_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};