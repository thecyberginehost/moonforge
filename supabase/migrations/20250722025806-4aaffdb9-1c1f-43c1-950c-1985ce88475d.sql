-- Fix database function security issues by adding search_path security definer
-- These fixes address the security warnings from the linter

-- Fix get_available_top_10_spots function
CREATE OR REPLACE FUNCTION public.get_available_top_10_spots()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  occupied_spots INTEGER;
BEGIN
  -- Count currently active top 10 boosts
  SELECT COUNT(*) INTO occupied_spots
  FROM public.trending_boosts
  WHERE boost_type = 'top_10_premium'
    AND expires_at > now()
    AND position IS NOT NULL;
  
  RETURN 10 - occupied_spots;
END;
$function$;

-- Fix assign_top_10_position function
CREATE OR REPLACE FUNCTION public.assign_top_10_position()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  next_position INTEGER;
  occupied_positions INTEGER[];
BEGIN
  -- Get all currently occupied positions
  SELECT ARRAY_AGG(position ORDER BY position) INTO occupied_positions
  FROM public.trending_boosts
  WHERE boost_type = 'top_10_premium'
    AND expires_at > now()
    AND position IS NOT NULL;
  
  -- Find the first available position from 1-10
  FOR i IN 1..10 LOOP
    IF occupied_positions IS NULL OR NOT (i = ANY(occupied_positions)) THEN
      RETURN i;
    END IF;
  END LOOP;
  
  -- No positions available
  RETURN NULL;
END;
$function$;

-- Fix reset_daily_credits function
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.creator_credits 
  SET daily_credits = 30, 
      last_reset = now(),
      updated_at = now()
  WHERE last_reset < CURRENT_DATE;
END;
$function$;

-- Fix has_unlimited_credits function
CREATE OR REPLACE FUNCTION public.has_unlimited_credits(user_wallet text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Check if user has active degen or legendary boost
  RETURN EXISTS (
    SELECT 1 
    FROM public.trending_boosts tb
    JOIN public.tokens t ON tb.token_id = t.id
    WHERE t.creator_wallet = user_wallet
      AND tb.boost_type IN ('degen', 'legendary')
      AND tb.expires_at > now()
  );
END;
$function$;

-- Fix get_user_credits function
CREATE OR REPLACE FUNCTION public.get_user_credits(user_wallet text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  current_credits INTEGER;
  has_unlimited BOOLEAN;
BEGIN
  -- Check if user has unlimited credits from degen boosts
  SELECT public.has_unlimited_credits(user_wallet) INTO has_unlimited;
  
  IF has_unlimited THEN
    RETURN 999999; -- Return high number to represent unlimited
  END IF;
  
  -- Otherwise return actual daily credits
  SELECT COALESCE(daily_credits, 30) INTO current_credits
  FROM public.creator_credits
  WHERE user_id = user_wallet;
  
  RETURN COALESCE(current_credits, 30);
END;
$function$;

-- Fix check_and_award_achievements function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_wallet text, p_token_id uuid DEFAULT NULL::uuid, p_check_type text DEFAULT 'all'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  achievement_record RECORD;
  token_record RECORD;
  user_stats RECORD;
  trading_stats RECORD;
  portfolio_stats RECORD;
BEGIN
  -- Get token data if token_id provided
  IF p_token_id IS NOT NULL THEN
    SELECT * INTO token_record FROM public.tokens WHERE id = p_token_id;
  END IF;

  -- Get user creation stats
  SELECT 
    COUNT(*) as token_count,
    COALESCE(SUM(t.volume_24h), 0) as total_volume
  INTO user_stats
  FROM public.tokens t
  WHERE t.creator_wallet = p_user_wallet;

  -- Get trading stats
  SELECT 
    COUNT(*) as total_trades,
    COUNT(DISTINCT token_id) as unique_tokens_traded,
    COALESCE(SUM(amount_sol), 0) as total_volume_traded,
    COUNT(CASE WHEN activity_type = 'buy' THEN 1 END) as total_buys,
    COUNT(CASE WHEN activity_type = 'sell' THEN 1 END) as total_sells,
    COUNT(CASE WHEN profit_percentage >= 100 THEN 1 END) as profit_2x_count,
    COUNT(CASE WHEN profit_percentage >= 900 THEN 1 END) as profit_10x_count,
    COUNT(CASE WHEN profit_percentage <= -50 THEN 1 END) as big_loss_count,
    MAX(created_at::date) as last_trade_date,
    COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as today_trades,
    COUNT(DISTINCT t.creator_wallet) as unique_creators_traded
  INTO trading_stats
  FROM public.trading_activities ta
  LEFT JOIN public.tokens t ON ta.token_id = t.id
  WHERE ta.user_wallet = p_user_wallet;

  -- Get portfolio stats
  SELECT 
    COUNT(*) as tokens_held,
    COALESCE(SUM(token_amount), 0) as total_tokens_held,
    MAX(token_amount) as largest_bag,
    COALESCE(SUM(total_invested), 0) as total_portfolio_value
  INTO portfolio_stats
  FROM public.user_portfolios
  WHERE user_wallet = p_user_wallet AND token_amount > 0;

  -- Check each achievement type
  FOR achievement_record IN 
    SELECT * FROM public.achievement_types 
    WHERE (p_check_type = 'all' OR category = p_check_type)
  LOOP
    
    -- MILESTONE ACHIEVEMENTS (existing logic)
    IF achievement_record.criteria->>'type' = 'market_cap' AND token_record IS NOT NULL THEN
      IF token_record.market_cap >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('market_cap', token_record.market_cap))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    IF achievement_record.criteria->>'type' = 'holder_count' AND token_record IS NOT NULL THEN
      IF token_record.holder_count >= (achievement_record.criteria->>'value')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('holder_count', token_record.holder_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    IF achievement_record.criteria->>'type' = 'volume_24h' AND token_record IS NOT NULL THEN
      IF token_record.volume_24h >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('volume_24h', token_record.volume_24h))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    IF achievement_record.criteria->>'type' = 'token_count' THEN
      IF user_stats.token_count >= (achievement_record.criteria->>'value')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('token_count', user_stats.token_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    IF achievement_record.criteria->>'type' = 'bonding_curve_graduation' AND token_record IS NOT NULL THEN
      IF token_record.market_cap >= 50000 THEN -- Assuming graduation threshold
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('graduation_date', now()))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- TRADING ACHIEVEMENTS
    
    -- First purchase
    IF achievement_record.criteria->>'type' = 'first_purchase' THEN
      IF trading_stats.total_buys >= 1 THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('first_purchase', true))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Total trading volume
    IF achievement_record.criteria->>'type' = 'total_volume' THEN
      IF trading_stats.total_volume_traded >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('total_volume', trading_stats.total_volume_traded))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Profit multiples
    IF achievement_record.criteria->>'type' = 'profit_multiple' THEN
      IF (achievement_record.criteria->>'multiplier')::INTEGER = 2 AND trading_stats.profit_2x_count >= 1 THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('profit_trades', trading_stats.profit_2x_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
      
      IF (achievement_record.criteria->>'multiplier')::INTEGER = 10 AND trading_stats.profit_10x_count >= 1 THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('profit_trades', trading_stats.profit_10x_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Big losses (Paper Hands)
    IF achievement_record.criteria->>'type' = 'big_loss' THEN
      IF trading_stats.big_loss_count >= 1 THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('loss_trades', trading_stats.big_loss_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Daily trades
    IF achievement_record.criteria->>'type' = 'daily_trades' THEN
      IF trading_stats.today_trades >= (achievement_record.criteria->>'count')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('daily_trades', trading_stats.today_trades))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Unique tokens traded
    IF achievement_record.criteria->>'type' = 'unique_tokens' THEN
      IF trading_stats.unique_tokens_traded >= (achievement_record.criteria->>'count')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('unique_tokens', trading_stats.unique_tokens_traded))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Portfolio diversity
    IF achievement_record.criteria->>'type' = 'portfolio_diversity' THEN
      IF portfolio_stats.tokens_held >= (achievement_record.criteria->>'token_count')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('tokens_held', portfolio_stats.tokens_held))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Large bag holder
    IF achievement_record.criteria->>'type' = 'large_bag' THEN
      IF portfolio_stats.largest_bag >= (achievement_record.criteria->>'token_amount')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('largest_bag', portfolio_stats.largest_bag))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Portfolio value
    IF achievement_record.criteria->>'type' = 'portfolio_value' THEN
      IF portfolio_stats.total_portfolio_value >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('portfolio_value', portfolio_stats.total_portfolio_value))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Creator diversity
    IF achievement_record.criteria->>'type' = 'creator_diversity' THEN
      IF trading_stats.unique_creators_traded >= (achievement_record.criteria->>'creator_count')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('unique_creators', trading_stats.unique_creators_traded))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

  END LOOP;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;