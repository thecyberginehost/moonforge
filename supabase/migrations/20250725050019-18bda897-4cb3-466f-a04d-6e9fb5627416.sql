-- Create forum categories table
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#10B981',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum posts table  
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'discussion', -- discussion, question, bug_report, feature_request
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum replies table
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_wallet TEXT NOT NULL,
  content TEXT NOT NULL,
  is_solution BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all forum tables
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for forum categories (public read)
CREATE POLICY "Anyone can view forum categories" 
ON public.forum_categories 
FOR SELECT 
USING (true);

-- Create RLS policies for forum posts
CREATE POLICY "Anyone can view forum posts" 
ON public.forum_posts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create forum posts" 
ON public.forum_posts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own posts" 
ON public.forum_posts 
FOR UPDATE 
USING (user_wallet IN (SELECT wallet_address FROM profiles WHERE wallet_address = forum_posts.user_wallet));

-- Create RLS policies for forum replies
CREATE POLICY "Anyone can view forum replies" 
ON public.forum_replies 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create forum replies" 
ON public.forum_replies 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own replies" 
ON public.forum_replies 
FOR UPDATE 
USING (user_wallet IN (SELECT wallet_address FROM profiles WHERE wallet_address = forum_replies.user_wallet));

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description, icon, color, sort_order) VALUES
('General Discussion', 'General conversations about the platform', '💬', '#10B981', 1),
('Questions & Help', 'Ask questions and get help from the community', '❓', '#3B82F6', 2),
('Bug Reports', 'Report bugs and technical issues', '🐛', '#EF4444', 3),
('Feature Requests', 'Suggest new features and improvements', '💡', '#F59E0B', 4),
('Trading Discussion', 'Discuss trading strategies and market insights', '📈', '#8B5CF6', 5),
('Token Showcase', 'Share and discuss your created tokens', '🚀', '#EC4899', 6);

-- Create function to update reply count when replies are added/removed
CREATE OR REPLACE FUNCTION public.update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts 
    SET reply_count = reply_count + 1,
        last_reply_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts 
    SET reply_count = reply_count - 1,
        updated_at = now()
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count updates
CREATE TRIGGER update_forum_post_reply_count
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_reply_count();

-- Create trigger for timestamp updates
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON public.forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();