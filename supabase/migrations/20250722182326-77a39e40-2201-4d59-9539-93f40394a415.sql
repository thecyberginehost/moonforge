-- Add bonding curve address column to tokens table
ALTER TABLE public.tokens 
ADD COLUMN bonding_curve_address text;

-- Add index for bonding curve lookups
CREATE INDEX idx_tokens_bonding_curve_address ON public.tokens(bonding_curve_address);

-- Update existing tokens to have null bonding curve address (they use old system)
-- New tokens created with the bonding curve will have this field populated