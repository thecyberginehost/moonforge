-- Delete existing tokens and all related data to start fresh
-- Delete in correct order to avoid foreign key constraints

-- Delete related data first
DELETE FROM public.user_achievements WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.trending_boosts WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.fee_transactions WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.creator_earnings WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.community_rewards WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.trading_activities WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

DELETE FROM public.user_portfolios WHERE token_id IN (
  SELECT id FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago')
);

-- Finally delete the tokens themselves
DELETE FROM public.tokens WHERE name IN ('Prime Penguin Astronauts', 'PhantomTamago');