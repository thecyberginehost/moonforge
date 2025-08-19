-- Update fee configuration for new structure
-- Before graduation: 1% platform, 0.5% creator, 0.3% prize pool, 0.2% reserves
-- After graduation: 1% creator, 0.5% platform, 0.3% prize pool, 0.2% reserves

-- Update the current active fee config
UPDATE public.fee_config 
SET 
  platform_fee_bps = 100,  -- 1%
  creator_fee_bps = 50,     -- 0.5%
  prize_pool_fee_bps = 30,  -- 0.3%
  reserves_fee_bps = 20     -- 0.2%
WHERE is_active = true;

-- Create function to get appropriate fee config based on graduation status
CREATE OR REPLACE FUNCTION public.get_fee_config_by_graduation(is_graduated BOOLEAN DEFAULT FALSE)
RETURNS TABLE(platform_fee_bps INTEGER, creator_fee_bps INTEGER, prize_pool_fee_bps INTEGER, reserves_fee_bps INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF is_graduated THEN
    -- Post-graduation: 0.5% platform, 1% creator, 0.3% prize pool, 0.2% reserves
    RETURN QUERY SELECT 50, 100, 30, 20;
  ELSE
    -- Pre-graduation: 1% platform, 0.5% creator, 0.3% prize pool, 0.2% reserves  
    RETURN QUERY SELECT 100, 50, 30, 20;
  END IF;
END;
$$;