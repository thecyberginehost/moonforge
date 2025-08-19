-- Create trading activity tracking table
CREATE TABLE public.trading_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  activity_type TEXT NOT NULL, -- 'buy', 'sell'
  amount_sol NUMERIC NOT NULL,
  token_amount NUMERIC NOT NULL,
  token_price NUMERIC NOT NULL,
  market_cap_at_time NUMERIC,
  profit_loss NUMERIC, -- For sells, the profit/loss amount
  profit_percentage NUMERIC, -- For sells, the profit/loss percentage
  time_since_launch_minutes INTEGER, -- Minutes since token was created
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user portfolio tracking table
CREATE TABLE public.user_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  token_id UUID NOT NULL REFERENCES public.tokens(id),
  token_amount NUMERIC NOT NULL DEFAULT 0,
  average_buy_price NUMERIC NOT NULL DEFAULT 0,
  total_invested NUMERIC NOT NULL DEFAULT 0,
  first_purchase_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_wallet, token_id)
);

-- Enable RLS
ALTER TABLE public.trading_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trading_activities
CREATE POLICY "Users can view their own trading activities" 
ON public.trading_activities 
FOR SELECT 
USING (user_wallet IN (
  SELECT wallet_address FROM profiles WHERE wallet_address = trading_activities.user_wallet
));

CREATE POLICY "System can insert trading activities" 
ON public.trading_activities 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update trading activities" 
ON public.trading_activities 
FOR UPDATE 
USING (true);

-- RLS Policies for user_portfolios
CREATE POLICY "Users can view their own portfolios" 
ON public.user_portfolios 
FOR SELECT 
USING (user_wallet IN (
  SELECT wallet_address FROM profiles WHERE wallet_address = user_portfolios.user_wallet
));

CREATE POLICY "System can manage user portfolios" 
ON public.user_portfolios 
FOR ALL 
USING (true);

-- Indexes for performance
CREATE INDEX idx_trading_activities_user ON public.trading_activities(user_wallet);
CREATE INDEX idx_trading_activities_token ON public.trading_activities(token_id);
CREATE INDEX idx_trading_activities_created ON public.trading_activities(created_at DESC);
CREATE INDEX idx_user_portfolios_user ON public.user_portfolios(user_wallet);
CREATE INDEX idx_user_portfolios_token ON public.user_portfolios(token_id);

-- Update timestamp triggers
CREATE TRIGGER update_trading_activities_updated_at
BEFORE UPDATE ON public.trading_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_portfolios_updated_at
BEFORE UPDATE ON public.user_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();