-- Add optional social media links to tokens table
ALTER TABLE public.tokens 
ADD COLUMN telegram_url TEXT,
ADD COLUMN x_url TEXT;