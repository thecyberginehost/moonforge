-- Create creator_credits table for tracking daily AI usage
CREATE TABLE public.creator_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  daily_credits INTEGER NOT NULL DEFAULT 30,
  last_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.creator_credits ENABLE ROW LEVEL SECURITY;

-- Create policies for creator_credits
CREATE POLICY "Users can view their own credits" 
ON public.creator_credits 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own credits" 
ON public.creator_credits 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own credits" 
ON public.creator_credits 
FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Create copilot_messages table for conversation history
CREATE TABLE public.copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  prompt_type TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for copilot_messages
CREATE POLICY "Users can view their own messages" 
ON public.copilot_messages 
FOR SELECT 
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own messages" 
ON public.copilot_messages 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Create trigger for automatic timestamp updates on creator_credits
CREATE TRIGGER update_creator_credits_updated_at
BEFORE UPDATE ON public.creator_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on copilot_messages
CREATE TRIGGER update_copilot_messages_updated_at
BEFORE UPDATE ON public.copilot_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to reset daily credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.creator_credits 
  SET daily_credits = 30, 
      last_reset = now(),
      updated_at = now()
  WHERE last_reset < CURRENT_DATE;
END;
$$;