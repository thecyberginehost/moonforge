-- Create platform access logs table for tracking authorized platform interactions
CREATE TABLE public.platform_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet TEXT NOT NULL,
  token_id UUID REFERENCES public.tokens(id),
  action TEXT NOT NULL CHECK (action IN ('buy', 'sell', 'create')),
  signature_hash TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "System can manage platform access logs" 
ON public.platform_access_logs 
FOR ALL 
USING (true);

CREATE POLICY "Users can view their own platform access logs" 
ON public.platform_access_logs 
FOR SELECT 
USING (user_wallet IN (
  SELECT profiles.wallet_address 
  FROM profiles 
  WHERE profiles.wallet_address = platform_access_logs.user_wallet
));

-- Add creator control fields to tokens table
ALTER TABLE public.tokens 
ADD COLUMN IF NOT EXISTS platform_signature TEXT,
ADD COLUMN IF NOT EXISTS signature_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX idx_platform_access_logs_user_wallet ON public.platform_access_logs(user_wallet);
CREATE INDEX idx_platform_access_logs_token_id ON public.platform_access_logs(token_id);
CREATE INDEX idx_tokens_signature_expires ON public.tokens(signature_expires_at);

-- Function to validate platform signatures
CREATE OR REPLACE FUNCTION public.validate_platform_signature(
  p_token_id UUID,
  p_signature TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Get token with signature
  SELECT platform_signature, signature_expires_at 
  INTO token_record
  FROM public.tokens 
  WHERE id = p_token_id;
  
  -- Check if signature exists and hasn't expired
  IF token_record.platform_signature IS NULL OR 
     token_record.signature_expires_at IS NULL OR
     token_record.signature_expires_at < now() THEN
    RETURN FALSE;
  END IF;
  
  -- Validate signature matches
  RETURN token_record.platform_signature = p_signature;
END;
$$;

-- Function to check creator rate limits
CREATE OR REPLACE FUNCTION public.check_creator_rate_limit(
  p_creator_wallet TEXT
) RETURNS TABLE(
  allowed BOOLEAN,
  reason TEXT,
  tokens_created_today INTEGER,
  daily_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tokens_today INTEGER;
  user_credits INTEGER;
  daily_limit INTEGER := 5;
BEGIN
  -- Get user's current credits
  SELECT public.get_user_credits(p_creator_wallet) INTO user_credits;
  
  -- Check basic credit availability
  IF user_credits <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Daily credits exhausted', 0, daily_limit;
    RETURN;
  END IF;
  
  -- Count tokens created today
  SELECT COUNT(*)::INTEGER INTO tokens_today
  FROM public.tokens
  WHERE creator_wallet = p_creator_wallet
    AND created_at >= CURRENT_DATE;
  
  -- Check daily limit
  IF tokens_today >= daily_limit THEN
    RETURN QUERY SELECT FALSE, 'Daily token limit reached', tokens_today, daily_limit;
    RETURN;
  END IF;
  
  -- Check cooldown (1 hour between token creations)
  IF EXISTS (
    SELECT 1 FROM public.tokens
    WHERE creator_wallet = p_creator_wallet
      AND created_at > now() - INTERVAL '1 hour'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Cooldown period active (1 hour between tokens)', tokens_today, daily_limit;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT TRUE, 'Allowed', tokens_today, daily_limit;
END;
$$;