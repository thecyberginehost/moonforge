-- Update the boost_type constraint to match the new boost options
ALTER TABLE public.trending_boosts 
DROP CONSTRAINT trending_boosts_boost_type_check;

ALTER TABLE public.trending_boosts 
ADD CONSTRAINT trending_boosts_boost_type_check 
CHECK (boost_type IN ('basic', 'premium', 'viral', 'degen', 'legendary'));

-- Add a function to check if user has unlimited credits from active degen boosts
CREATE OR REPLACE FUNCTION public.has_unlimited_credits(user_wallet TEXT)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the creator_credits system to handle unlimited credits
CREATE OR REPLACE FUNCTION public.get_user_credits(user_wallet TEXT)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance on boost queries
CREATE INDEX IF NOT EXISTS idx_trending_boosts_expires_at 
ON public.trending_boosts(expires_at);

CREATE INDEX IF NOT EXISTS idx_trending_boosts_creator_boost_type 
ON public.trending_boosts(creator_wallet, boost_type);

CREATE INDEX IF NOT EXISTS idx_trending_boosts_boost_type 
ON public.trending_boosts(boost_type);