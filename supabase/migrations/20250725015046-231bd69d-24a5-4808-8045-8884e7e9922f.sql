-- Add platform_identifier column to tokens table for tracking vanity addresses
ALTER TABLE public.tokens 
ADD COLUMN platform_identifier TEXT DEFAULT NULL;