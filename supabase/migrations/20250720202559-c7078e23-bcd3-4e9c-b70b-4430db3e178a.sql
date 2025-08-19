-- Create creator earnings tracking table
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_wallet TEXT NOT NULL REFERENCES public.profiles(wallet_address),
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  total_earned DECIMAL NOT NULL DEFAULT 0,
  claimable_amount DECIMAL NOT NULL DEFAULT 0,
  total_claimed DECIMAL NOT NULL DEFAULT 0,
  last_claim_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_wallet, token_id)
);

-- Create fee transactions log table
CREATE TABLE public.fee_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  total_fee DECIMAL NOT NULL,
  platform_fee DECIMAL NOT NULL,
  creator_fee DECIMAL NOT NULL,
  community_fee DECIMAL NOT NULL,
  liquidity_fee DECIMAL NOT NULL,
  creator_wallet TEXT NOT NULL REFERENCES public.profiles(wallet_address),
  trader_wallet TEXT NOT NULL,
  trade_amount DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community rewards pool table
CREATE TABLE public.community_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  total_pool DECIMAL NOT NULL DEFAULT 0,
  distributed_amount DECIMAL NOT NULL DEFAULT 0,
  remaining_pool DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token_id)
);

-- Enable Row Level Security
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rewards ENABLE ROW LEVEL SECURITY;

-- Creator earnings policies
CREATE POLICY "Creators can view their own earnings" 
  ON public.creator_earnings 
  FOR SELECT 
  USING (creator_wallet IN (SELECT wallet_address FROM public.profiles WHERE wallet_address = creator_wallet));

CREATE POLICY "Anyone can insert creator earnings" 
  ON public.creator_earnings 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update creator earnings" 
  ON public.creator_earnings 
  FOR UPDATE 
  USING (true);

-- Fee transactions policies (read-only for transparency)
CREATE POLICY "Anyone can view fee transactions" 
  ON public.fee_transactions 
  FOR SELECT 
  USING (true);

CREATE POLICY "System can insert fee transactions" 
  ON public.fee_transactions 
  FOR INSERT 
  WITH CHECK (true);

-- Community rewards policies
CREATE POLICY "Anyone can view community rewards" 
  ON public.community_rewards 
  FOR SELECT 
  USING (true);

CREATE POLICY "System can manage community rewards" 
  ON public.community_rewards 
  FOR ALL 
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_creator_earnings_creator ON public.creator_earnings(creator_wallet);
CREATE INDEX idx_creator_earnings_token ON public.creator_earnings(token_id);
CREATE INDEX idx_fee_transactions_token ON public.fee_transactions(token_id);
CREATE INDEX idx_fee_transactions_creator ON public.fee_transactions(creator_wallet);
CREATE INDEX idx_fee_transactions_created_at ON public.fee_transactions(created_at DESC);
CREATE INDEX idx_community_rewards_token ON public.community_rewards(token_id);

-- Create triggers for updated_at
CREATE TRIGGER update_creator_earnings_updated_at
  BEFORE UPDATE ON public.creator_earnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_rewards_updated_at
  BEFORE UPDATE ON public.community_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();