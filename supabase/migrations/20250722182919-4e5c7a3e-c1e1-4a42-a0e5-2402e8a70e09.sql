-- Delete all data in correct order to avoid foreign key constraints
-- First delete dependent records
DELETE FROM public.user_achievements;
DELETE FROM public.trending_boosts;
DELETE FROM public.fee_transactions;
DELETE FROM public.creator_earnings;
DELETE FROM public.community_rewards;
DELETE FROM public.trading_activities;
DELETE FROM public.user_portfolios;

-- Then delete tokens
DELETE FROM public.tokens;

-- Reset related chat/AI data if needed
DELETE FROM public.copilot_messages;