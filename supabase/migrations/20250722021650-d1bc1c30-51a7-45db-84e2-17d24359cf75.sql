-- Create achievements system with token-specific milestones
CREATE TABLE public.achievement_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'milestone', 'trading', 'community', 'creator'
  icon TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#10B981',
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  criteria JSONB NOT NULL, -- Dynamic criteria for achievement
  reward_type TEXT, -- 'credits', 'boost_discount', 'vip_access'
  reward_value INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User achievements tracking
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  achievement_type_id UUID NOT NULL REFERENCES public.achievement_types(id),
  token_id UUID REFERENCES public.tokens(id), -- NULL for global achievements
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB, -- Store additional data like exact values
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_wallet, achievement_type_id, token_id) -- Prevent duplicates
);

-- Enable RLS
ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view achievement types" 
ON public.achievement_types 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage achievement types" 
ON public.achievement_types 
FOR ALL 
USING (true);

CREATE POLICY "Anyone can view user achievements" 
ON public.user_achievements 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert user achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- Insert milestone achievement types
INSERT INTO public.achievement_types (name, description, category, icon, badge_color, rarity, criteria, reward_type, reward_value) VALUES
-- Market Cap Milestones
('First Steps', 'Reach $1K market cap', 'milestone', '🚀', '#10B981', 'common', '{"type": "market_cap", "value": 1000}', 'credits', 5),
('Rising Star', 'Reach $5K market cap', 'milestone', '⭐', '#3B82F6', 'common', '{"type": "market_cap", "value": 5000}', 'credits', 10),
('Diamond Hands', 'Reach $10K market cap', 'milestone', '💎', '#8B5CF6', 'rare', '{"type": "market_cap", "value": 10000}', 'credits', 25),
('Moon Shot', 'Reach $50K market cap', 'milestone', '🌙', '#F59E0B', 'rare', '{"type": "market_cap", "value": 50000}', 'boost_discount', 20),
('To The Stars', 'Reach $100K market cap', 'milestone', '🌟', '#EF4444', 'epic', '{"type": "market_cap", "value": 100000}', 'vip_access', 1),
('Legendary Launch', 'Reach $500K market cap', 'milestone', '👑', '#DC2626', 'legendary', '{"type": "market_cap", "value": 500000}', 'vip_access', 1),

-- Bonding Curve Graduations
('Graduate', 'Successfully graduate from bonding curve', 'milestone', '🎓', '#10B981', 'rare', '{"type": "bonding_curve_graduation"}', 'credits', 50),
('DEX Master', 'Token graduates and maintains $100K+ on DEX', 'milestone', '🏆', '#F59E0B', 'epic', '{"type": "dex_graduation", "min_liquidity": 100000}', 'vip_access', 1),

-- Holder Milestones
('Community Builder', 'Reach 100 holders', 'milestone', '👥', '#3B82F6', 'common', '{"type": "holder_count", "value": 100}', 'credits', 15),
('Viral Token', 'Reach 500 holders', 'milestone', '🔥', '#8B5CF6', 'rare', '{"type": "holder_count", "value": 500}', 'credits', 30),
('Mass Adoption', 'Reach 1000 holders', 'milestone', '🌍', '#EF4444', 'epic', '{"type": "holder_count", "value": 1000}', 'boost_discount', 30),

-- Volume Milestones
('Active Trading', 'Reach $10K trading volume', 'milestone', '📈', '#10B981', 'common', '{"type": "volume_24h", "value": 10000}', 'credits', 20),
('High Volume', 'Reach $50K trading volume', 'milestone', '💰', '#F59E0B', 'rare', '{"type": "volume_24h", "value": 50000}', 'credits', 40),

-- Creator Achievements (Global)
('First Launch', 'Create your first token', 'creator', '🎯', '#10B981', 'common', '{"type": "token_count", "value": 1}', 'credits', 10),
('Serial Creator', 'Create 5 tokens', 'creator', '🔄', '#3B82F6', 'rare', '{"type": "token_count", "value": 5}', 'boost_discount', 15),
('Token Factory', 'Create 10 tokens', 'creator', '🏭', '#8B5CF6', 'epic', '{"type": "token_count", "value": 10}', 'vip_access', 1),

-- AI Usage Achievements
('AI Pioneer', 'Use AI tools 10 times', 'community', '🤖', '#10B981', 'common', '{"type": "ai_usage", "value": 10}', 'credits', 15),
('AI Master', 'Use AI tools 50 times', 'community', '🧠', '#8B5CF6', 'rare', '{"type": "ai_usage", "value": 50}', 'vip_access', 1);

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
  p_user_wallet TEXT,
  p_token_id UUID DEFAULT NULL,
  p_check_type TEXT DEFAULT 'all'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  achievement_record RECORD;
  token_record RECORD;
  user_stats RECORD;
BEGIN
  -- Get token data if token_id provided
  IF p_token_id IS NOT NULL THEN
    SELECT * INTO token_record FROM public.tokens WHERE id = p_token_id;
  END IF;

  -- Get user stats
  SELECT 
    COUNT(*) as token_count,
    COALESCE(SUM(t.volume_24h), 0) as total_volume
  INTO user_stats
  FROM public.tokens t
  WHERE t.creator_wallet = p_user_wallet;

  -- Check each achievement type
  FOR achievement_record IN 
    SELECT * FROM public.achievement_types 
    WHERE (p_check_type = 'all' OR category = p_check_type)
  LOOP
    -- Market cap achievements (token-specific)
    IF achievement_record.criteria->>'type' = 'market_cap' AND token_record IS NOT NULL THEN
      IF token_record.market_cap >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('market_cap', token_record.market_cap))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Holder count achievements (token-specific)
    IF achievement_record.criteria->>'type' = 'holder_count' AND token_record IS NOT NULL THEN
      IF token_record.holder_count >= (achievement_record.criteria->>'value')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('holder_count', token_record.holder_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Volume achievements (token-specific)
    IF achievement_record.criteria->>'type' = 'volume_24h' AND token_record IS NOT NULL THEN
      IF token_record.volume_24h >= (achievement_record.criteria->>'value')::NUMERIC THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('volume_24h', token_record.volume_24h))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Token count achievements (global)
    IF achievement_record.criteria->>'type' = 'token_count' THEN
      IF user_stats.token_count >= (achievement_record.criteria->>'value')::INTEGER THEN
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, 
                jsonb_build_object('token_count', user_stats.token_count))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;

    -- Bonding curve graduation (token-specific)
    IF achievement_record.criteria->>'type' = 'bonding_curve_graduation' AND token_record IS NOT NULL THEN
      -- This would be triggered when a token graduates (you'd call this function from your graduation logic)
      -- For now, we'll check if market cap is high enough to assume graduation
      IF token_record.market_cap >= 50000 THEN -- Assuming graduation threshold
        INSERT INTO public.user_achievements (user_wallet, achievement_type_id, token_id, metadata)
        VALUES (p_user_wallet, achievement_record.id, p_token_id, 
                jsonb_build_object('graduation_date', now()))
        ON CONFLICT (user_wallet, achievement_type_id, token_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_user_achievements_wallet ON public.user_achievements(user_wallet);
CREATE INDEX idx_user_achievements_token ON public.user_achievements(token_id);
CREATE INDEX idx_user_achievements_earned ON public.user_achievements(earned_at DESC);
CREATE INDEX idx_achievement_types_category ON public.achievement_types(category);