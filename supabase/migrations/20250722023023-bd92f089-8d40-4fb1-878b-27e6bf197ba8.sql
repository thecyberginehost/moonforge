-- Add only new trading achievements (avoiding existing names)
INSERT INTO public.achievement_types (name, description, category, icon, badge_color, rarity, criteria, reward_type, reward_value) VALUES

-- First Time Achievements
('First Blood', 'Make your first token purchase', 'trading', '🩸', '#10B981', 'common', '{"type": "first_purchase"}', 'credits', 10),
('Early Bird', 'Buy within first hour of token launch', 'trading', '🐦', '#3B82F6', 'rare', '{"type": "early_buy", "time_limit_hours": 1}', 'trading_discount', 5),
('Sniper Elite', 'Buy within first 10 minutes of launch', 'trading', '🎯', '#8B5CF6', 'epic', '{"type": "sniper_buy", "time_limit_minutes": 10}', 'trading_discount', 10),
('Genesis Investor', 'Buy a token under $1K market cap', 'trading', '🌱', '#F59E0B', 'rare', '{"type": "low_mcap_buy", "max_market_cap": 1000}', 'credits', 15),

-- Volume Milestones
('Small Fish', '$100 total trading volume', 'trading', '🐟', '#10B981', 'common', '{"type": "total_volume", "value": 100}', 'credits', 5),
('Dolphin Trader', '$1K total trading volume', 'trading', '🐬', '#3B82F6', 'common', '{"type": "total_volume", "value": 1000}', 'credits', 20),
('Whale Trader', '$10K total trading volume', 'trading', '🐋', '#8B5CF6', 'rare', '{"type": "total_volume", "value": 10000}', 'trading_discount', 15),
('Legendary Whale', '$50K total trading volume', 'trading', '🦈', '#F59E0B', 'epic', '{"type": "total_volume", "value": 50000}', 'vip_access', 1),
('Kraken Lord', '$100K+ total trading volume', 'trading', '🐙', '#DC2626', 'legendary', '{"type": "total_volume", "value": 100000}', 'vip_access', 1),

-- Trading Performance
('Paper Hands', 'Sell at 50%+ loss (badge of shame)', 'trading', '📄', '#EF4444', 'common', '{"type": "big_loss", "loss_percentage": 50}', NULL, 0),
('Diamond Hodler', 'Hold same token 30+ days', 'trading', '💎', '#3B82F6', 'rare', '{"type": "long_hold", "days": 30}', 'credits', 25),
('Profit Taker', 'Achieve 2x gains on any trade', 'trading', '💰', '#10B981', 'rare', '{"type": "profit_multiple", "multiplier": 2}', 'credits', 30),
('Moon Mission', 'Achieve 10x gains on any trade', 'trading', '🚀', '#DC2626', 'legendary', '{"type": "profit_multiple", "multiplier": 10}', 'vip_access', 1),
('Day Trader', 'Complete 10+ trades in one day', 'trading', '⚡', '#F59E0B', 'rare', '{"type": "daily_trades", "count": 10}', 'trading_discount', 20),

-- Risk & Discovery
('Token Hunter', 'Buy 25+ different tokens', 'trading', '🏹', '#8B5CF6', 'rare', '{"type": "unique_tokens", "count": 25}', 'credits', 40),
('Risk Taker', 'Buy 5+ tokens under $5K market cap', 'trading', '🎲', '#F59E0B', 'epic', '{"type": "risky_buys", "count": 5, "max_market_cap": 5000}', 'trading_discount', 25),
('Trend Spotter', 'Buy token that later does 10x', 'trading', '👁️', '#DC2626', 'legendary', '{"type": "trend_spot", "multiplier": 10}', 'vip_access', 1),
('Lucky Charm', '5 consecutive profitable trades', 'trading', '🍀', '#10B981', 'epic', '{"type": "winning_streak", "count": 5}', 'credits', 50),
('Degen Mode', 'Buy token within first minute of launch', 'trading', '😈', '#DC2626', 'legendary', '{"type": "ultra_snipe", "time_limit_seconds": 60}', 'vip_access', 1),

-- Portfolio Achievements
('Bag Holder', 'Hold 1M+ tokens of any coin', 'trading', '💼', '#3B82F6', 'rare', '{"type": "large_bag", "token_amount": 1000000}', 'credits', 35),
('Diversified Portfolio', 'Hold 50+ different tokens simultaneously', 'trading', '📊', '#8B5CF6', 'epic', '{"type": "portfolio_diversity", "token_count": 50}', 'trading_discount', 30),
('Portfolio King', 'Portfolio worth $25K+', 'trading', '👑', '#F59E0B', 'legendary', '{"type": "portfolio_value", "value": 25000}', 'vip_access', 1),
('Exit Liquidity', 'Buy token that goes to zero (RIP)', 'trading', '💀', '#6B7280', 'common', '{"type": "token_died"}', NULL, 0),

-- Community & Loyalty
('Loyal Fan', 'Buy from same creator 5+ times', 'community', '🤝', '#10B981', 'rare', '{"type": "creator_loyalty", "purchase_count": 5}', 'credits', 25),
('Creator Explorer', 'Trade tokens from 10+ different creators', 'community', '🌍', '#3B82F6', 'rare', '{"type": "creator_diversity", "creator_count": 10}', 'credits', 30),
('Creator Supporter', 'Buy $5K+ from single creator', 'community', '💝', '#8B5CF6', 'epic', '{"type": "creator_volume", "volume": 5000}', 'trading_discount', 15);