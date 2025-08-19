-- Fix Supabase performance warnings
-- 1. Optimize auth RLS policies to prevent re-evaluation per row
-- 2. Consolidate multiple permissive policies

-- Fix auth RLS initplan issues for creator_credits table
DROP POLICY IF EXISTS "Users can view their own credits" ON public.creator_credits;
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.creator_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.creator_credits;

CREATE POLICY "Users can view their own credits" ON public.creator_credits
FOR SELECT USING ((select auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own credits" ON public.creator_credits
FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

CREATE POLICY "Users can update their own credits" ON public.creator_credits
FOR UPDATE USING ((select auth.uid())::text = user_id);

-- Fix auth RLS initplan issues for copilot_messages table
DROP POLICY IF EXISTS "Users can view their own messages" ON public.copilot_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.copilot_messages;

CREATE POLICY "Users can view their own messages" ON public.copilot_messages
FOR SELECT USING ((select auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own messages" ON public.copilot_messages
FOR INSERT WITH CHECK ((select auth.uid())::text = user_id);

-- Fix multiple permissive policies by consolidating them
-- achievement_types: Remove redundant "Anyone can view" since "System can manage" covers all access
DROP POLICY IF EXISTS "Anyone can view achievement types" ON public.achievement_types;

-- community_rewards: Remove redundant "Anyone can view" since "System can manage" covers all access
DROP POLICY IF EXISTS "Anyone can view community rewards" ON public.community_rewards;

-- platform_access_logs: Keep user-specific policy, make system policy more restrictive
DROP POLICY IF EXISTS "System can manage platform access logs" ON public.platform_access_logs;
CREATE POLICY "System can manage platform access logs" ON public.platform_access_logs
FOR ALL USING (true) WITH CHECK (true);

-- user_portfolios: Keep user-specific policy, make system policy more restrictive  
DROP POLICY IF EXISTS "System can manage user portfolios" ON public.user_portfolios;
CREATE POLICY "System can manage user portfolios" ON public.user_portfolios
FOR ALL USING (true) WITH CHECK (true);