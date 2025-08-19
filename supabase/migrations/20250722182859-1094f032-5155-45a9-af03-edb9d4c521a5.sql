-- Delete all existing tokens to start fresh
DELETE FROM public.tokens;

-- Reset any related data
DELETE FROM public.trading_activities;
DELETE FROM public.user_portfolios;
DELETE FROM public.creator_earnings;
DELETE FROM public.community_rewards;
DELETE FROM public.trending_boosts;
DELETE FROM public.fee_transactions;

-- Reset sequences if needed (optional)
-- This ensures clean slate for new token creation