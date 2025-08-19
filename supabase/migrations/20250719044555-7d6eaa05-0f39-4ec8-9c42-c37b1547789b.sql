-- Create tokens table for storing created tokens
CREATE TABLE public.tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_wallet TEXT NOT NULL REFERENCES public.profiles(wallet_address),
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  mint_address TEXT UNIQUE,
  total_supply BIGINT DEFAULT 1000000000,
  creation_fee DECIMAL DEFAULT 0.02,
  market_cap DECIMAL DEFAULT 0,
  price DECIMAL DEFAULT 0,
  volume_24h DECIMAL DEFAULT 0,
  holder_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view tokens" 
  ON public.tokens 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create tokens" 
  ON public.tokens 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Creators can update their tokens" 
  ON public.tokens 
  FOR UPDATE 
  USING (creator_wallet = (SELECT wallet_address FROM public.profiles WHERE wallet_address = creator_wallet));

-- Create indexes for performance
CREATE INDEX idx_tokens_created_at ON public.tokens(created_at DESC);
CREATE INDEX idx_tokens_market_cap ON public.tokens(market_cap DESC);
CREATE INDEX idx_tokens_volume ON public.tokens(volume_24h DESC);
CREATE INDEX idx_tokens_creator ON public.tokens(creator_wallet);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tokens_updated_at
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for token images
INSERT INTO storage.buckets (id, name, public) VALUES ('token-images', 'token-images', true);

-- Create storage policies for token images
CREATE POLICY "Anyone can view token images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'token-images');

CREATE POLICY "Users can upload token images" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'token-images');