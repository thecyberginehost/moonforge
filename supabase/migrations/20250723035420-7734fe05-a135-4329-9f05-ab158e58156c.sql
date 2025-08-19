-- Test achievement system integration
-- This migration adds some debugging to ensure achievements work properly

-- Add a test function to manually trigger achievements (for debugging)
CREATE OR REPLACE FUNCTION public.test_achievement_system(p_user_wallet text, p_token_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  achievement_count_before INTEGER;
  achievement_count_after INTEGER;
BEGIN
  -- Get achievement count before
  SELECT COUNT(*) INTO achievement_count_before
  FROM public.user_achievements
  WHERE user_wallet = p_user_wallet;

  -- Run achievement check
  PERFORM public.check_and_award_achievements(p_user_wallet, p_token_id, 'all');

  -- Get achievement count after
  SELECT COUNT(*) INTO achievement_count_after
  FROM public.user_achievements
  WHERE user_wallet = p_user_wallet;

  -- Return result
  SELECT json_build_object(
    'user_wallet', p_user_wallet,
    'token_id', p_token_id,
    'achievements_before', achievement_count_before,
    'achievements_after', achievement_count_after,
    'new_achievements', achievement_count_after - achievement_count_before,
    'success', true
  ) INTO result;

  RETURN result;
END;
$function$;

-- Create an index for better performance on user achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_wallet_type 
ON public.user_achievements(user_wallet, achievement_type_id);

-- Create an index for achievement checking performance  
CREATE INDEX IF NOT EXISTS idx_trading_activities_user_profit 
ON public.trading_activities(user_wallet, profit_percentage) 
WHERE profit_percentage IS NOT NULL;