-- Add bonding curve columns to tokens table
ALTER TABLE public.tokens 
ADD COLUMN IF NOT EXISTS sol_raised NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_sold NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_graduated BOOLEAN DEFAULT false;

-- Update existing tokens to initialize bonding curve values
UPDATE public.tokens 
SET sol_raised = 0, tokens_sold = 0, is_graduated = false 
WHERE sol_raised IS NULL OR tokens_sold IS NULL OR is_graduated IS NULL;