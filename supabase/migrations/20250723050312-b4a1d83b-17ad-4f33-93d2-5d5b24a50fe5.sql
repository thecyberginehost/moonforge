-- Function to initialize creator credits for new users
CREATE OR REPLACE FUNCTION public.initialize_creator_credits(
  p_user_wallet TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert new creator credits record if it doesn't exist
  INSERT INTO public.creator_credits (user_id, daily_credits, last_reset, created_at, updated_at)
  VALUES (p_user_wallet, 30, now(), now(), now())
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;