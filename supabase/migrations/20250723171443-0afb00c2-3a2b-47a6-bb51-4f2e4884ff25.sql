-- Add program configuration table
CREATE TABLE IF NOT EXISTS public.program_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL UNIQUE,
  program_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  network TEXT NOT NULL DEFAULT 'devnet',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active program configs
CREATE POLICY "Program configs are publicly readable" 
ON public.program_config 
FOR SELECT 
USING (is_active = true);

-- Add fee configuration table
CREATE TABLE IF NOT EXISTS public.fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_bps INTEGER NOT NULL DEFAULT 100, -- 1%
  creator_fee_bps INTEGER NOT NULL DEFAULT 7,     -- 0.07%
  prize_pool_fee_bps INTEGER NOT NULL DEFAULT 2,  -- 0.02%
  reserves_fee_bps INTEGER NOT NULL DEFAULT 1,    -- 0.01%
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active fee configs
CREATE POLICY "Fee configs are publicly readable" 
ON public.fee_config 
FOR SELECT 
USING (is_active = true);

-- Insert default configurations
INSERT INTO public.program_config (program_name, program_id, network) 
VALUES ('bonding_curve', '11111111111111111111111111111111', 'devnet');

INSERT INTO public.fee_config (platform_fee_bps, creator_fee_bps, prize_pool_fee_bps, reserves_fee_bps) 
VALUES (100, 7, 2, 1);

-- Add wallet addresses for fee distribution
CREATE TABLE IF NOT EXISTS public.wallet_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_type TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active wallet configs
CREATE POLICY "Wallet configs are publicly readable" 
ON public.wallet_config 
FOR SELECT 
USING (is_active = true);

-- Insert default wallet configurations (will be updated with real addresses)
INSERT INTO public.wallet_config (wallet_type, wallet_address) VALUES
('platform', '11111111111111111111111111111111'),
('prize_pool', '11111111111111111111111111111111'),
('reserves', '11111111111111111111111111111111');

-- Function to get active program ID
CREATE OR REPLACE FUNCTION public.get_active_program_id(p_program_name text DEFAULT 'bonding_curve')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  program_id_result text;
BEGIN
  SELECT program_id INTO program_id_result
  FROM public.program_config
  WHERE program_name = p_program_name 
    AND is_active = true
  LIMIT 1;
  
  RETURN COALESCE(program_id_result, '11111111111111111111111111111111');
END;
$function$;

-- Function to get active fee configuration
CREATE OR REPLACE FUNCTION public.get_active_fee_config()
RETURNS TABLE(
  platform_fee_bps integer,
  creator_fee_bps integer,
  prize_pool_fee_bps integer,
  reserves_fee_bps integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    fc.platform_fee_bps,
    fc.creator_fee_bps,
    fc.prize_pool_fee_bps,
    fc.reserves_fee_bps
  FROM public.fee_config fc
  WHERE fc.is_active = true
  ORDER BY fc.created_at DESC
  LIMIT 1;
END;
$function$;

-- Function to get wallet address by type
CREATE OR REPLACE FUNCTION public.get_wallet_address(p_wallet_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wallet_address_result text;
BEGIN
  SELECT wallet_address INTO wallet_address_result
  FROM public.wallet_config
  WHERE wallet_type = p_wallet_type 
    AND is_active = true
  LIMIT 1;
  
  RETURN wallet_address_result;
END;
$function$;