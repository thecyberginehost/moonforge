-- Create table to track trending boost purchases
CREATE TABLE public.trending_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID NOT NULL,
  creator_wallet TEXT NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('1_hour', '12_hours', '24_hours', '1_week', 'top_10_premium')),
  duration_hours INTEGER NOT NULL,
  price_sol NUMERIC NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  position INTEGER NULL, -- Only for top_10_premium, tracks position 1-10
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trending_boosts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view trending boosts" 
ON public.trending_boosts 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create trending boosts" 
ON public.trending_boosts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update trending boosts" 
ON public.trending_boosts 
FOR UPDATE 
USING (true);

-- Create function to get available top 10 spots
CREATE OR REPLACE FUNCTION public.get_available_top_10_spots()
RETURNS INTEGER AS $$
DECLARE
  occupied_spots INTEGER;
BEGIN
  -- Count currently active top 10 boosts
  SELECT COUNT(*) INTO occupied_spots
  FROM public.trending_boosts
  WHERE boost_type = 'top_10_premium'
    AND expires_at > now()
    AND position IS NOT NULL;
  
  RETURN 10 - occupied_spots;
END;
$$ LANGUAGE plpgsql;

-- Create function to assign next available position
CREATE OR REPLACE FUNCTION public.assign_top_10_position()
RETURNS INTEGER AS $$
DECLARE
  next_position INTEGER;
  occupied_positions INTEGER[];
BEGIN
  -- Get all currently occupied positions
  SELECT ARRAY_AGG(position ORDER BY position) INTO occupied_positions
  FROM public.trending_boosts
  WHERE boost_type = 'top_10_premium'
    AND expires_at > now()
    AND position IS NOT NULL;
  
  -- Find the first available position from 1-10
  FOR i IN 1..10 LOOP
    IF occupied_positions IS NULL OR NOT (i = ANY(occupied_positions)) THEN
      RETURN i;
    END IF;
  END LOOP;
  
  -- No positions available
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_trending_boosts_updated_at
BEFORE UPDATE ON public.trending_boosts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();