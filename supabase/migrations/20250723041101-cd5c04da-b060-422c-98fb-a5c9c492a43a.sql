-- Fix performance INFO warnings
-- 1. Add missing foreign key index (IMPORTANT for performance)
-- 2. Remove some truly unused/redundant indexes to reduce overhead

-- Fix unindexed foreign key - this is important for achievement queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_type_id 
ON public.user_achievements(achievement_type_id);

-- Remove some unused indexes that are redundant or unlikely to be used
-- Keep important ones for future scaling, remove truly unnecessary ones

-- Remove redundant user-specific indexes (we have better composite indexes)
DROP INDEX IF EXISTS public.idx_trading_activities_user;
DROP INDEX IF EXISTS public.idx_user_portfolios_user;

-- Remove date indexes that are covered by created_at default ordering  
DROP INDEX IF EXISTS public.idx_user_achievements_earned;
DROP INDEX IF EXISTS public.idx_profiles_created_at;
DROP INDEX IF EXISTS public.idx_trading_activities_created;
DROP INDEX IF EXISTS public.idx_fee_transactions_created_at;

-- Remove unused feature-specific indexes that aren't implemented yet
DROP INDEX IF EXISTS public.idx_tokens_bonding_curve_address;
DROP INDEX IF EXISTS public.idx_tokens_signature_expires;
DROP INDEX IF EXISTS public.idx_platform_access_logs_user_wallet;
DROP INDEX IF EXISTS public.idx_platform_access_logs_token_id;

-- Keep these important indexes for future use:
-- - idx_tokens_market_cap (for sorting by market cap)
-- - idx_tokens_volume (for sorting by volume)  
-- - idx_achievement_types_category (for filtering achievements)
-- - idx_profiles_total_volume (for leaderboards)
-- - idx_trending_boosts_* (for boost features)
-- - idx_creator_earnings_creator (for creator dashboard)
-- - idx_fee_transactions_creator (for creator earnings)
-- - idx_user_achievements_wallet_type (for achievement queries)
-- - idx_trading_activities_user_profit (for achievement calculations)