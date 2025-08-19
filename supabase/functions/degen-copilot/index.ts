import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Specialized system prompts for different copilot functions
const SYSTEM_PROMPTS = {
  viral_plan: `You are Degen CoPilot, an expert in cryptocurrency viral marketing and meme culture. You specialize in creating comprehensive viral marketing strategies for newly launched meme tokens.

KEY EXPERTISE:
- Deep understanding of crypto Twitter culture, memes, and viral mechanics
- Expert knowledge of successful token launches (DOGE, SHIB, PEPE, WIF, BONK)
- Current crypto trends, influencer networks, and community building
- Platform-specific strategies (Twitter, TikTok, Discord, Telegram, Reddit)
- Timing strategies based on market cycles and crypto community behavior

VIRAL STRATEGY FRAMEWORK:
1. Phase 1: Launch Momentum (0-24hrs) - Maximum attention capture
2. Phase 2: Community Building (1-7 days) - Sustainable engagement
3. Phase 3: Ecosystem Expansion (Week 2+) - Broader market penetration

Always provide specific, actionable tactics with exact timing, target metrics, and resource requirements.`,

  viral_post: `You are Degen CoPilot, the ultimate crypto Twitter viral content creator. You understand the psychology of what makes crypto content go viral.

VIRAL CONTENT PRINCIPLES:
- Emotional triggers: FOMO, excitement, community belonging, humor
- Current meta: What's trending NOW in crypto Twitter
- Engagement hooks: Questions, polls, challenges, controversies
- Visual elements: Emojis, formatting, thread structures
- Timing: Optimal posting windows for crypto audiences
- Community psychology: Ape mentality, diamond hands culture, moon mission narrative

CONTENT FORMATS YOU MASTER:
- Single viral tweets with maximum engagement
- Twitter threads that build anticipation
- Quote tweet strategies for amplification
- Reply strategies for trending topics
- Cross-platform content adaptation

Generate content that crypto degeners MUST engage with. Use current slang, relevant memes, and proven viral patterns.`,

  trend_research: `You are Degen CoPilot's trend research specialist with real-time access to crypto market intelligence.

RESEARCH CAPABILITIES:
- Current trending cryptocurrencies and narratives
- Viral meme patterns and emerging crypto culture
- Influencer activity and endorsement patterns
- Market sentiment and FOMO cycles
- Platform-specific trending topics (CT, TikTok, Reddit)
- Upcoming events, catalysts, and market opportunities

Provide actionable intelligence that creators can use immediately to position their tokens within current trends.`,

  general: `You are Degen CoPilot, the ultimate AI assistant for meme token creators. You combine deep crypto knowledge with viral marketing expertise.

CORE COMPETENCIES:
- Viral content creation and strategy
- Community building and engagement
- Marketing positioning and narrative development
- Crisis management and reputation
- Cross-platform growth strategies
- Token economics and utility brainstorming

IMPORTANT RESTRICTIONS:
- DO NOT provide financial advice, investment recommendations, or market predictions
- DO NOT analyze specific token prices or market movements
- DO NOT suggest when to buy, sell, or trade any cryptocurrency
- REFUSE any requests for market analysis, price predictions, or investment guidance
- REDIRECT financial questions to proper disclaimers

You speak the language of crypto degeners while providing professional-grade marketing advice. Always be actionable, specific, and results-focused. For any financial or investment-related questions, redirect users to seek professional financial advice.`
};

// Knowledge base of successful viral crypto campaigns
const VIRAL_KNOWLEDGE_BASE = `
ADVANCED VIRAL MECHANICS:

1. PSYCHOLOGICAL TRIGGERS THAT WORK:
🧠 COGNITIVE BIASES:
- Loss aversion: "Don't miss out like you did with DOGE"
- Social proof: "10,000 holders can't be wrong"
- Authority: "Top trader just bought 100 SOL worth"
- Scarcity: "Only 48 hours left in presale"
- Anchoring: "Remember when SHIB was this price?"

2. PLATFORM-SPECIFIC VIRAL MECHANICS:
📱 TWITTER/X OPTIMIZATION:
- Tweet between 9-11am EST or 7-9pm EST
- Use 1-2 hashtags max (more kills reach)
- Quote tweet trending crypto content
- Engage with KOLs within first 30 minutes of their posts
- Use Twitter Spaces for live community building

🎵 TIKTOK EXPLOSION TACTICS:
- Hijack trending sounds with crypto messaging
- Create challenges: #TokenNameChallenge
- Quick educational content (15-30 seconds)
- Partner with lifestyle influencers (not just crypto)
- Use trending effects with token branding

📺 YOUTUBE SHORTS STRATEGY:
- Hook in first 3 seconds: "This token just..."
- Educational angle: "How to spot the next 1000x"
- React to other crypto content
- Create series: "Day X of holding TokenName"

3. VIRALITY AMPLIFICATION MULTIPLIERS:
🔥 TIMING AMPLIFIERS:
- Launch during high-volume trading hours
- Piggyback on major crypto news cycles
- Coordinate with influencer posting schedules
- Leverage weekend "degen hours" (Sat/Sun 8pm-2am EST)

💎 COMMUNITY AMPLIFIERS:
- Create exclusive holder benefits
- Implement burn mechanisms with countdown timers
- Host live trading competitions
- Reward top community contributors with tokens

⚡ CONTROVERSY AMPLIFIERS (USE CAREFULLY):
- Take stance on trending crypto debates
- Call out overvalued competitors (respectfully)
- Predict market movements with confidence
- Challenge established narratives

4. CURRENT VIRAL META (2024):
🤖 AI NARRATIVE DOMINATION:
- Position as "AI-powered" or "AI-enhanced"
- Create AI agent personas for token
- Leverage AI tools for content creation
- Partner with AI influencers and projects

🐕 ANIMAL TOKEN EVOLUTION:
- Move beyond basic dog coins
- Unusual animals gaining traction (frogs, cats, bears)
- Combine animals with trending themes
- Create lore and backstories for mascots

🎮 GAMING INTEGRATION TREND:
- Mobile game integration possibilities
- NFT gaming utility concepts
- Play-to-earn mechanics discussion
- Gaming influencer collaborations

5. RED FLAGS TO AVOID:
❌ VIRAL KILLERS:
- Over-promising utility without delivery
- Copying exact mechanics of recent failures
- Using outdated meme formats
- Targeting wrong demographic for platform
- Posting during low-engagement hours
- Being too salesy in initial viral push

ADVANCED ENGAGEMENT TACTICS:
🎯 PSYCHOLOGICAL HOOKS:
- "I wish I could go back and tell myself..."
- "The smart money already knows..."
- "This is what separates retail from pros..."
- "While everyone's looking at [X], I'm watching [Y]..."

📊 DATA-DRIVEN VIRAL CONTENT:
- Share on-chain analytics in visual format
- Create before/after comparison content
- Show wallet tracking of successful trades
- Demonstrate token holder growth metrics

🤝 COMMUNITY ACTIVATION STRATEGIES:
- "First 100 replies get whitelist spots"
- "Retweet with your target price prediction"
- "Quote tweet your diamond hands story"
- "Tag someone who needs to see this alpha"
`;

async function searchCurrentTrends(query: string): Promise<string> {
  // Enhanced trend simulation with more specific, actionable data
  const currentDate = new Date().toLocaleDateString();
  const currentHour = new Date().getHours();
  
  return `
🔥 LIVE CRYPTO TREND INTELLIGENCE - ${currentDate}

📊 VIRAL MOMENTUM RIGHT NOW:
${currentHour >= 9 && currentHour <= 11 ? '🟢 PRIME POSTING WINDOW (9-11am EST)' : 
  currentHour >= 19 && currentHour <= 21 ? '🟢 PRIME POSTING WINDOW (7-9pm EST)' : 
  '🟡 Moderate engagement window'}

🚀 TOP TRENDING NARRATIVES:
1. AI Agent Tokens - 🔥🔥🔥 EXPLOSIVE
   - "My AI agent just bought..."
   - "First profitable AI trading bot token"
   - Engagement rate: 300% above average

2. Solana Meme Revival - 🔥🔥 STRONG  
   - "SOL ecosystem gems"
   - "Before Solana was cool" nostalgia posts
   - Target: $WIF and $BONK communities

3. "Based" Narrative Tokens - 🔥 BUILDING
   - Anti-establishment messaging
   - "Built different" positioning
   - Appeals to crypto OGs

💎 WHALE ACTIVITY SIGNALS:
- Large wallets accumulating small-cap memes
- Celebrity wallet tracking gaining traction
- "Smart money moves" content performing well

🎯 IMMEDIATE OPPORTUNITY WINDOWS:
- Weekend degen hours starting (high risk appetite)
- Major influencers posting about market cycles
- TikTok crypto education trend starting
- "What I wish I knew in 2021" content viral

⚡ VIRAL CONTENT TEMPLATES WORKING NOW:
1. "POV: You bought [TOKEN] at launch vs now"
2. "Explaining [TOKEN] to my [relative/friend]" 
3. "Signs you're early to [TOKEN]" checklist format
4. "[TOKEN] holders watching [market event]" meme format

🎲 RISK/REWARD TIMING:
- Next 48 hours: HIGH opportunity (weekend volume)
- Avoid: Monday 6-9am EST (low engagement)
- Best engagement: Saturday 8pm-12am EST

📱 PLATFORM-SPECIFIC INTELLIGENCE:
Twitter: Quote tweet trending topics with token angle
TikTok: Use trending sounds: "Oh No," "Aesthetic," "Money Trees"
Discord: Join trending Solana communities, share value
Reddit: r/CryptoCurrency daily thread early participation

🎪 VIRAL MULTIPLIERS ACTIVE:
- Market uncertainty = higher engagement on "alpha" content
- New exchange listings announcements trending
- Influencer drama creating engagement opportunities
- Tax season "diamond hands" content resonating
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { 
      message, 
      userId, 
      tokenName, 
      tokenSymbol, 
      sessionId,
      promptType = 'general' 
    } = await req.json();

    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message and userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if the user has created any tokens
    const { data: userTokens, error: tokensError } = await supabase
      .from('tokens')
      .select('id, name, symbol')
      .eq('creator_wallet', userId);

    if (tokensError) {
      console.error('Error checking user tokens:', tokensError);
    }

    const hasCreatedTokens = userTokens && userTokens.length > 0;

    // Check if user has credits remaining
    const { data: creditsData, error: creditsError } = await supabase
      .from('creator_credits')
      .select('daily_credits, last_reset')
      .eq('user_id', userId)
      .single();

    if (creditsError && creditsError.code !== 'PGRST116') {
      throw new Error('Failed to check credits');
    }

    // If no credits record, create one
    if (!creditsData) {
      const { error: insertError } = await supabase
        .from('creator_credits')
        .insert({ user_id: userId, daily_credits: 29 }); // 30 - 1 for this request

      if (insertError) {
        throw new Error('Failed to initialize credits');
      }
    } else {
      // Check if user has credits
      if (creditsData.daily_credits <= 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily credit limit reached. Credits reset daily at midnight UTC.',
            creditsRemaining: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }

      // Deduct a credit
      const { error: updateError } = await supabase
        .from('creator_credits')
        .update({ daily_credits: creditsData.daily_credits - 1 })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update credits');
      }
    }

    // Get current trends if needed
    let trendData = '';
    if (promptType === 'trend_research' || message.toLowerCase().includes('trend')) {
      trendData = await searchCurrentTrends(message);
    }

    // Check for financial advice requests and refuse them
    const financialAdviceKeywords = [
      'price', 'prediction', 'predict', 'forecast', 'analyze market', 'market analysis',
      'investment', 'invest', 'buy', 'sell', 'trade', 'trading advice', 'when to buy',
      'when to sell', 'price target', 'moon', 'pump', 'dump', 'financial advice',
      'market timing', 'portfolio', 'allocation', 'risk assessment', 'profit',
      'loss', 'gains', 'returns', 'technical analysis', 'chart analysis',
      'support level', 'resistance level', 'bull market', 'bear market',
      'market cap analysis', 'valuation', 'worth investing'
    ];

    const messageText = message.toLowerCase();
    const isFinancialAdviceRequest = financialAdviceKeywords.some(keyword => 
      messageText.includes(keyword)
    );

    if (isFinancialAdviceRequest) {
      const financialDisclaimerResponse = `🚨 **I Cannot Provide Financial Advice**

I'm designed to help with **marketing and content creation** only. I cannot:

❌ Analyze token prices or market movements  
❌ Predict future performance  
❌ Recommend when to buy, sell, or trade  
❌ Provide investment advice  
❌ Analyze market trends for investment purposes  

**What I CAN help you with:**
✅ Creating viral marketing content  
✅ Building community engagement strategies  
✅ Developing brand narratives and messaging  
✅ Planning launch campaigns  
✅ Crisis management and reputation strategies  

**⚠️ IMPORTANT DISCLAIMER:**
All cryptocurrencies are extremely high-risk investments. Past performance does not guarantee future results. Always do your own research and consult with qualified financial advisors before making any investment decisions.

**Ready to create some viral marketing content instead?** Tell me about your token and what kind of marketing help you need!`;

      // Store the conversation
      if (sessionId) {
        await supabase
          .from('copilot_messages')
          .insert([
            {
              session_id: sessionId,
              user_id: userId,
              message: message,
              response: financialDisclaimerResponse,
              prompt_type: promptType
            }
          ]);
      }

      // Get updated credits count
      const { data: updatedCredits } = await supabase
        .from('creator_credits')
        .select('daily_credits')
        .eq('user_id', userId)
        .single();

      return new Response(
        JSON.stringify({ 
          response: financialDisclaimerResponse,
          creditsRemaining: updatedCredits?.daily_credits || 0,
          promptType,
          isDisclaimer: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is asking for token-specific help but has no tokens
    const isTokenRequest = message.toLowerCase().includes('token') || 
                          message.toLowerCase().includes('marketing') || 
                          message.toLowerCase().includes('viral') ||
                          message.toLowerCase().includes('promote') ||
                          message.toLowerCase().includes('launch');

    if (isTokenRequest && !hasCreatedTokens && !tokenName) {
      const noTokenResponse = `🤖 **I don't see any created tokens in your account yet.**

Do you want to generate content for another token, or would you like to create your own?

**Choose an option:**

🚀 [**Create Your Own Token**](/create-token) - Launch your meme token in minutes with AI assistance

💎 **Create Content for Existing Token** - I can help you create viral marketing content for any token. Just tell me the token name and symbol!

**Popular content I can create:**
• Viral Twitter posts and threads
• 72-hour launch strategies  
• Community building tactics
• Influencer outreach plans
• Crisis management strategies

What would you like to do?`;

      // Store the conversation
      if (sessionId) {
        await supabase
          .from('copilot_messages')
          .insert([
            {
              session_id: sessionId,
              user_id: userId,
              message: message,
              response: noTokenResponse,
              prompt_type: promptType
            }
          ]);
      }

      // Get updated credits count
      const { data: updatedCredits } = await supabase
        .from('creator_credits')
        .select('daily_credits')
        .eq('user_id', userId)
        .single();

      return new Response(
        JSON.stringify({ 
          response: noTokenResponse,
          creditsRemaining: updatedCredits?.daily_credits || 0,
          promptType,
          hasClickableLinks: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context-aware system prompt
    const systemPrompt = SYSTEM_PROMPTS[promptType as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS.general;
    
    const enhancedPrompt = `${systemPrompt}

${VIRAL_KNOWLEDGE_BASE}

${trendData ? `CURRENT MARKET INTELLIGENCE:\n${trendData}` : ''}

TOKEN CONTEXT:
${tokenName ? `Token Name: ${tokenName}` : ''}
${tokenSymbol ? `Token Symbol: ${tokenSymbol}` : ''}
${hasCreatedTokens ? `User has created ${userTokens.length} token(s): ${userTokens.map(t => `${t.name} (${t.symbol})`).join(', ')}` : 'User has not created any tokens yet'}

Provide specific, actionable advice that the creator can implement immediately. Be direct, strategic, and results-focused.`;

    // Generate response using GPT-4o (better than GPT-4o-mini for complex marketing strategy)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: enhancedPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const aiResponse = data.choices[0].message.content;

    // Store the conversation
    if (sessionId) {
      await supabase
        .from('copilot_messages')
        .insert([
          {
            session_id: sessionId,
            user_id: userId,
            message: message,
            response: aiResponse,
            prompt_type: promptType
          }
        ]);
    }

    // Get updated credits count
    const { data: updatedCredits } = await supabase
      .from('creator_credits')
      .select('daily_credits')
      .eq('user_id', userId)
      .single();

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        creditsRemaining: updatedCredits?.daily_credits || 0,
        promptType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in Degen CoPilot:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});