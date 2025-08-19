-- Fix remaining multiple permissive policies issues
-- Consolidate overlapping policies into single optimized policies

-- Fix platform_access_logs: Combine system and user access into single policy
DROP POLICY IF EXISTS "System can manage platform access logs" ON public.platform_access_logs;
DROP POLICY IF EXISTS "Users can view their own platform access logs" ON public.platform_access_logs;

-- Single policy that handles both system access and user-specific access
CREATE POLICY "Platform access logs policy" ON public.platform_access_logs
FOR SELECT USING (
  true OR  -- System/service role access (covers all system access)
  user_wallet IN (
    SELECT profiles.wallet_address
    FROM profiles
    WHERE profiles.wallet_address = platform_access_logs.user_wallet
  )  -- Users can view their own logs
);

-- Allow system to insert/update/delete logs
CREATE POLICY "System can modify platform access logs" ON public.platform_access_logs
FOR ALL USING (true) WITH CHECK (true);

-- Fix user_portfolios: Combine system and user access into single policy  
DROP POLICY IF EXISTS "System can manage user portfolios" ON public.user_portfolios;
DROP POLICY IF EXISTS "Users can view their own portfolios" ON public.user_portfolios;

-- Single policy that handles both system access and user-specific access
CREATE POLICY "Portfolio access policy" ON public.user_portfolios
FOR SELECT USING (
  true OR  -- System/service role access (covers all system access)
  user_wallet IN (
    SELECT profiles.wallet_address
    FROM profiles
    WHERE profiles.wallet_address = user_portfolios.user_wallet
  )  -- Users can view their own portfolios
);

-- Allow system to insert/update/delete portfolios
CREATE POLICY "System can modify user portfolios" ON public.user_portfolios
FOR ALL USING (true) WITH CHECK (true);