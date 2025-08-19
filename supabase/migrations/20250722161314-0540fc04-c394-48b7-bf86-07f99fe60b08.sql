-- Add Moonforge Telegram Access Achievements
INSERT INTO public.achievement_types (
  name, description, category, icon, badge_color, rarity, criteria, reward_type, reward_value
) VALUES 
(
  'Moonforge Inner Circle - Creator',
  'Gain exclusive access to the Moonforge Telegram for creators who build successful communities',
  'Exclusive Access',
  'crown',
  '#8B5CF6',
  'legendary',
  '{"type": "telegram_creator", "market_cap": 25000, "holder_count": 20}',
  'telegram_access',
  1
),
(
  'Moonforge Inner Circle - Trader', 
  'Gain exclusive access to the Moonforge Telegram for skilled traders',
  'Exclusive Access',
  'trending-up',
  '#8B5CF6', 
  'legendary',
  '{"type": "telegram_trader", "total_volume": 2500, "profitable_trades": 5, "unique_tokens": 5}',
  'telegram_access',
  1
),
(
  'Moonforge Elite VIP',
  'Ultra-exclusive VIP access to the highest tier of Moonforge community privileges',
  'VIP Access',
  'diamond',
  '#FFD700',
  'mythic',
  '{"type": "telegram_vip", "graduation": true, "trading_profits": 10000, "leaderboard_days": 7}',
  'vip_telegram_access', 
  1
);

-- Update the check_and_award_achievements function to handle Telegram access achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_wallet TEXT, p_token_id UUID DEFAULT NULL, p_check_type TEXT DEFAULT 'all')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  achievement_record RECORD;
  token_record RECORD;
  user_stats RECORD;
  trading_stats RECORD;
  portfolio_stats RECORD;
  profitable_trades_count INTEGER;
  unique_profitable_tokens INTEGER;
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

  -- Get trading stats with profitable trades across unique tokens
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

  -- Get count of profitable trades across unique tokens (for Telegram trader achievement)
  SELECT 
    COUNT(DISTINCT token_id) as unique_profitable_tokens
  INTO unique_profitable_tokens
  FROM public.trading_activities
  WHERE user_wallet = p_user_wallet 
    AND profit_percentage > 0;

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
    
    -- TELEGRAM ACCESS ACHIEVEMENTS
    
    -- Moonforge Inner Circle - Creator
    IF achievement_record.criteria->>'type' = 'telegram_creator' AND token_record IS NOT NULL THEN
      IF token_record.market_cap >= (achievement_record.criteria->>'market_cap')::NUMERIC 
         AND token_record.holder_count >= (achievement_record.criteria->>'holder_count')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('market_cap', token_record.market_cap, 'holder_count', token_record.holder_count, 'telegram_access', true))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Moonforge Inner Circle - Trader  
    IF achievement_record.criteria->>'type' = 'telegram_trader' THEN
      -- Check if user meets volume OR profitable trades criteria
      IF trading_stats.total_volume_traded >= (achievement_record.criteria->>'total_volume')::NUMERIC 
         OR (unique_profitable_tokens >= (achievement_record.criteria->>'unique_tokens')::INTEGER 
             AND trading_stats.profit_2x_count + trading_stats.profit_10x_count >= (achievement_record.criteria->>'profitable_trades')::INTEGER) THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('total_volume', trading_stats.total_volume_traded, 'profitable_trades', unique_profitable_tokens, 'telegram_access', true))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Moonforge Elite VIP (for now, just graduation - will add leaderboard tracking later)
    IF achievement_record.criteria->>'type' = 'telegram_vip' AND token_record IS NOT NULL THEN
      IF token_record.market_cap >= 50000 THEN -- Bonding curve graduation
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('graduation_date', now(), 'vip_access', true))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;
    
    -- EXISTING MILESTONE ACHIEVEMENTS (keep all existing logic)
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

    -- TRADING ACHIEVEMENTS (keep all existing logic)
    
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
$$;