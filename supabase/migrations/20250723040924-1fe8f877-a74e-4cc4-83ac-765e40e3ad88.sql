-- Fix multiple permissive policies by making system policies more specific
-- System policies should only handle INSERT/UPDATE/DELETE, not SELECT

-- Fix platform_access_logs: Make system policy exclude SELECT
DROP POLICY IF EXISTS "System can modify platform access logs" ON public.platform_access_logs;

-- Separate policies for INSERT, UPDATE, DELETE only (no SELECT overlap)
CREATE POLICY "System can insert platform access logs" ON public.platform_access_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update platform access logs" ON public.platform_access_logs
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "System can delete platform access logs" ON public.platform_access_logs
FOR DELETE USING (true);

-- Fix user_portfolios: Make system policy exclude SELECT
DROP POLICY IF EXISTS "System can modify user portfolios" ON public.user_portfolios;

-- Separate policies for INSERT, UPDATE, DELETE only (no SELECT overlap)
CREATE POLICY "System can insert user portfolios" ON public.user_portfolios
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update user portfolios" ON public.user_portfolios
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "System can delete user portfolios" ON public.user_portfolios
FOR DELETE USING (true);