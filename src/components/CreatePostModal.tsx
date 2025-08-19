// FILE PATH: src/components/CreatePostModal.tsx
// ACTION: REPLACE the existing file completely
// FIXES: Truncated form rendering at line 70

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForumCategories, useCreateForumPost } from '@/hooks/useForums';
import { Plus } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId?: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  categoryId,
}) => {
  const { data: categories = [] } = useForumCategories();
  const createPost = useCreateForumPost();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categoryId || '');
  const [postType, setPostType] = useState('discussion');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim() || !selectedCategoryId) {
      return;
    }

    await createPost.mutateAsync({
      category_id: selectedCategoryId,
      title: title.trim(),
      content: content.trim(),
      post_type: postType,
    });

    // Reset form
    setTitle('');
    setContent('');
    setPostType('discussion');
    if (!categoryId) setSelectedCategoryId('');
    
    onClose();
  };

  const postTypeOptions = [
    { value: 'discussion', label: 'General Discussion', description: 'General conversation or topic' },
    { value: 'question', label: 'Question', description: 'Ask for help or advice' },
    { value: 'bug_report', label: 'Bug Report', description: 'Report a technical issue' },
    { value: 'feature_request', label: 'Feature Request', description: 'Suggest a new feature' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Post
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection - FIXED: This section was cut off */}
          {!categoryId && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Post Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Post Type</Label>
            <Select value={postType} onValueChange={setPostType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {postTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a clear, descriptive title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/200 characters
            </p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Share your thoughts, ask your question, or describe the issue in detail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              maxLength={5000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {content.length}/5000 characters
            </p>
          </div>

          {/* Tips */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium mb-2">💡 Tips for a great post:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Use a clear, descriptive title</li>
              <li>• Provide enough context for others to understand and help</li>
              <li>• For bug reports, include steps to reproduce the issue</li>
              <li>• Be respectful and constructive in your communication</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!title.trim() || !content.trim() || !selectedCategoryId || createPost.isPending}
            >
              {createPost.isPending ? 'Creating...' : 'Create Post'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};