-- Clear all fake token data since they're not real coins
DELETE FROM public.trending_boosts;
DELETE FROM public.creator_earnings;
DELETE FROM public.community_rewards;
DELETE FROM public.fee_transactions;
DELETE FROM public.tokens;