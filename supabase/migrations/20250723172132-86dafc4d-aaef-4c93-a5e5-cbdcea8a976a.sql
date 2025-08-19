-- Update fee configuration with corrected percentages
UPDATE public.fee_config 
SET 
  platform_fee_bps = 100,    -- 1%
  creator_fee_bps = 70,       -- 0.7%
  prize_pool_fee_bps = 20,    -- 0.2%
  reserves_fee_bps = 10,      -- 0.1%
  updated_at = now()
WHERE is_active = true;