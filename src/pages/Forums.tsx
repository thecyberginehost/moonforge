import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ForumCategoryCard } from '@/components/ForumCategoryCard';
import { ForumPostCard } from '@/components/ForumPostCard';
import { CreatePostModal } from '@/components/CreatePostModal';
import { useForumCategories, useForumPosts } from '@/hooks/useForums';
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { MessageSquare, Plus, Search, Filter, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export const Forums = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { walletAddress } = useWalletAuth();
  const { data: categories = [] } = useForumCategories();
  const { data: posts = [] } = useForumPosts(categoryId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState('all');

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedPostType === 'all' || post.post_type === selectedPostType;
    return matchesSearch && matchesType;
  });

  const handleCreatePost = () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to create a post');
      return;
    }
    setIsCreatePostOpen(true);
  };

  const selectedCategory = categories.find(cat => cat.id === categoryId);

  const postTypeCounts = {
    all: posts.length,
    discussion: posts.filter(p => p.post_type === 'discussion').length,
    question: posts.filter(p => p.post_type === 'question').length,
    bug_report: posts.filter(p => p.post_type === 'bug_report').length,
    feature_request: posts.filter(p => p.post_type === 'feature_request').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <MessageSquare className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">
                {selectedCategory ? selectedCategory.name : 'Community Forums'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {selectedCategory 
                ? selectedCategory.description 
                : 'Connect, discuss, and help build the future of meme coin trading'
              }
            </p>
          </div>
          <Button onClick={handleCreatePost} className="gap-2">
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </div>

        {/* Navigation Breadcrumb */}
        {selectedCategory && (
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/forums')}
              className="text-primary hover:text-primary/80"
            >
              ← Back to All Categories
            </Button>
          </div>
        )}

        {!categoryId ? (
          /* Category Overview */
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const categoryPosts = posts.filter(p => p.category_id === category.id);
              const latestPost = categoryPosts[0];
              
              return (
                <ForumCategoryCard
                  key={category.id}
                  category={category}
                  postCount={categoryPosts.length}
                  lastActivity={latestPost?.created_at}
                  onClick={() => navigate(`/forums/${category.id}`)}
                />
              );
            })}
          </div>
        ) : (
          /* Posts in Category */
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter by:</span>
              </div>
            </div>

            {/* Post Type Tabs */}
            <Tabs value={selectedPostType} onValueChange={setSelectedPostType}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" className="gap-1">
                  All
                  <Badge variant="secondary" className="text-xs">
                    {postTypeCounts.all}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="discussion" className="gap-1">
                  Discussion
                  <Badge variant="secondary" className="text-xs">
                    {postTypeCounts.discussion}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="question" className="gap-1">
                  Questions
                  <Badge variant="secondary" className="text-xs">
                    {postTypeCounts.question}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="bug_report" className="gap-1">
                  Bugs
                  <Badge variant="secondary" className="text-xs">
                    {postTypeCounts.bug_report}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="feature_request" className="gap-1">
                  Features
                  <Badge variant="secondary" className="text-xs">
                    {postTypeCounts.feature_request}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedPostType} className="mt-6">
                {filteredPosts.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPosts.map((post) => (
                      <ForumPostCard
                        key={post.id}
                        post={post}
                        showCategory={false}
                        onClick={() => navigate(`/forums/${categoryId}/post/${post.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No posts found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm 
                        ? 'Try adjusting your search terms'
                        : 'Be the first to start a discussion in this category!'
                      }
                    </p>
                    <Button onClick={handleCreatePost}>
                      Create First Post
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Create Post Modal */}
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          categoryId={categoryId}
        />
      </div>
    </div>
  );
};