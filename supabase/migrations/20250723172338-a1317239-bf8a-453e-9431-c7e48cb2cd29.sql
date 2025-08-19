-- Update wallet configurations with real addresses from secrets
UPDATE public.wallet_config 
SET 
  wallet_address = (SELECT value FROM vault.secrets WHERE name = 'PLATFORM_WALLET_ADDRESS' LIMIT 1),
  updated_at = now()
WHERE wallet_type = 'platform' AND is_active = true;

UPDATE public.wallet_config 
SET 
  wallet_address = (SELECT value FROM vault.secrets WHERE name = 'PRIZE_POOL_WALLET_ADDRESS' LIMIT 1),
  updated_at = now()
WHERE wallet_type = 'prize_pool' AND is_active = true;

UPDATE public.wallet_config 
SET 
  wallet_address = (SELECT value FROM vault.secrets WHERE name = 'RESERVES_WALLET_ADDRESS' LIMIT 1),
  updated_at = now()
WHERE wallet_type = 'reserves' AND is_active = true;