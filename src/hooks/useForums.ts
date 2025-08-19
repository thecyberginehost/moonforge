import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWalletAuth } from './useWalletAuth';

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface ForumPost {
  id: string;
  category_id: string;
  user_wallet: string;
  title: string;
  content: string;
  post_type: 'discussion' | 'question' | 'bug_report' | 'feature_request';
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at: string | null;
  created_at: string;
  updated_at: string;
  category?: ForumCategory;
  user_profile?: {
    username: string;
    avatar_url?: string;
  };
}

export interface ForumReply {
  id: string;
  post_id: string;
  user_wallet: string;
  content: string;
  is_solution: boolean;
  created_at: string;
  updated_at: string;
  user_profile?: {
    username: string;
    avatar_url?: string;
  };
}

export const useForumCategories = () => {
  return useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      return data as ForumCategory[];
    },
  });
};

export const useForumPosts = (categoryId?: string, limit = 20) => {
  return useQuery({
    queryKey: ['forum-posts', categoryId, limit],
    queryFn: async () => {
      let query = supabase
        .from('forum_posts')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: posts, error } = await query;
      
      if (error) throw error;
      
      // Fetch related data separately
      const categoryIds = [...new Set(posts.map(p => p.category_id))];
      const userWallets = [...new Set(posts.map(p => p.user_wallet))];
      
      const [categoriesData, profilesData] = await Promise.all([
        supabase.from('forum_categories').select('*').in('id', categoryIds),
        supabase.from('profiles').select('username, avatar_url, wallet_address').in('wallet_address', userWallets)
      ]);
      
      return posts.map(post => ({
        ...post,
        category: categoriesData.data?.find(c => c.id === post.category_id),
        user_profile: profilesData.data?.find(p => p.wallet_address === post.user_wallet)
      })) as ForumPost[];
    },
  });
};

export const useForumPost = (postId: string) => {
  return useQuery({
    queryKey: ['forum-post', postId],
    queryFn: async () => {
      // Skip view count increment for now - will implement later if needed
      
      const { data: post, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (error) throw error;
      
      // Fetch related data separately
      const [categoryData, profileData] = await Promise.all([
        supabase.from('forum_categories').select('*').eq('id', post.category_id).single(),
        supabase.from('profiles').select('username, avatar_url, wallet_address').eq('wallet_address', post.user_wallet).single()
      ]);
      
      return {
        ...post,
        category: categoryData.data,
        user_profile: profileData.data
      } as ForumPost;
    },
    enabled: !!postId,
  });
};

export const useForumReplies = (postId: string) => {
  return useQuery({
    queryKey: ['forum-replies', postId],
    queryFn: async () => {
      const { data: replies, error } = await supabase
        .from('forum_replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch user profiles separately
      const userWallets = [...new Set(replies.map(r => r.user_wallet))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('username, avatar_url, wallet_address')
        .in('wallet_address', userWallets);
      
      return replies.map(reply => ({
        ...reply,
        user_profile: profilesData?.find(p => p.wallet_address === reply.user_wallet)
      })) as ForumReply[];
    },
    enabled: !!postId,
  });
};

export const useCreateForumPost = () => {
  const queryClient = useQueryClient();
  const { walletAddress } = useWalletAuth();

  return useMutation({
    mutationFn: async (post: {
      category_id: string;
      title: string;
      content: string;
      post_type: string;
    }) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          ...post,
          user_wallet: walletAddress,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Post created successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to create post: ${error.message}`);
    },
  });
};

export const useCreateForumReply = () => {
  const queryClient = useQueryClient();
  const { walletAddress } = useWalletAuth();

  return useMutation({
    mutationFn: async (reply: {
      post_id: string;
      content: string;
    }) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected');
      }

      const { data, error } = await supabase
        .from('forum_replies')
        .insert({
          ...reply,
          user_wallet: walletAddress,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['forum-replies', data.post_id] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast.success('Reply posted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to post reply: ${error.message}`);
    },
  });
};