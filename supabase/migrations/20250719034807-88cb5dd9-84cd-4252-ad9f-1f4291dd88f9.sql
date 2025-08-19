
-- Create profiles table for wallet-based authentication
CREATE TABLE public.profiles (
  wallet_address TEXT NOT NULL PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_tokens_created INTEGER DEFAULT 0,
  total_volume_traded DECIMAL DEFAULT 0
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL Security;

-- Create policy for users to view all profiles (needed for leaderboards, etc.)
CREATE POLICY "Anyone can view profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

-- Create policy for users to insert their own profile
CREATE POLICY "Users can create their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (true);

-- Create index for performance
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);
CREATE INDEX idx_profiles_total_volume ON public.profiles(total_volume_traded DESC);
