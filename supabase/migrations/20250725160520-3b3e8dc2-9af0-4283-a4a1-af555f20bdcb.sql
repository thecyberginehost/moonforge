-- Clean up all existing tokens and related data to start fresh

-- Delete related records first (foreign key dependencies)
DELETE FROM public.trending_boosts;
DELETE FROM public.creator_earnings;
DELETE FROM public.fee_transactions;
DELETE FROM public.trading_activities;
DELETE FROM public.user_portfolios;
DELETE FROM public.user_achievements WHERE token_id IS NOT NULL;
DELETE FROM public.community_rewards;
DELETE FROM public.platform_access_logs WHERE token_id IS NOT NULL;

-- Finally delete all tokens
DELETE FROM public.tokens;

-- Reset any sequences if needed (though UUID primary keys don't use sequences)
-- This ensures a completely clean slate for new token creation