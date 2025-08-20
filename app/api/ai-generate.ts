// FILE PATH: /api/ai-generate.ts (in your project root api folder)
// This handles AI token generation securely without exposing your OpenAI key

export const config = {
  runtime: 'edge',
};

interface TokenGenerationRequest {
  prompt?: string;
  theme?: string;
  style?: 'meme' | 'serious' | 'degen' | 'creative';
}

interface TokenSuggestion {
  name: string;
  symbol: string;
  description: string;
  theme: string;
  personality: string;
}

export default async function handler(request: Request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get the OpenAI API key from environment
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: TokenGenerationRequest = await request.json();
    const { prompt = '', theme = 'meme', style = 'degen' } = body;

    // Create the system prompt for token generation
    const systemPrompt = `You are a creative crypto token generator for a Solana pump.fun style platform. 
    Generate unique, catchy, and memorable token ideas that would appeal to the degen crypto community.
    
    Style guide for ${style}:
    - meme: Focus on humor, internet culture, trending memes
    - serious: Professional, utility-focused, problem-solving
    - degen: High-risk high-reward vibes, gambling references, YOLO culture
    - creative: Artistic, unique concepts, experimental ideas
    
    Return a JSON object with these fields:
    - name: Token name (max 32 chars, creative and memorable)
    - symbol: Token symbol (3-6 chars, all caps)
    - description: Token description (max 200 chars, engaging and fun)
    - theme: Main theme/category
    - personality: Token's personality traits (funny, edgy, wholesome, etc.)
    
    Make it original and avoid copying existing tokens.`;

    const userPrompt = prompt 
      ? `Create a token based on: ${prompt}`
      : `Create a random ${style} token with ${theme} theme`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9, // Higher for more creativity
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate token' }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    
    // Parse the AI response
    let suggestion: TokenSuggestion;
    try {
      suggestion = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback to a default suggestion
      suggestion = {
        name: 'DEGEN COIN',
        symbol: 'DEGEN',
        description: 'The ultimate degen play on Solana',
        theme: theme,
        personality: 'chaotic',
      };
    }

    // Validate and sanitize the response
    suggestion.name = suggestion.name.substring(0, 32);
    suggestion.symbol = suggestion.symbol.toUpperCase().substring(0, 6);
    suggestion.description = suggestion.description.substring(0, 200);

    // Return the suggestion with CORS headers
    return new Response(JSON.stringify(suggestion), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache', // Don't cache AI responses
      },
    });

  } catch (error) {
    console.error('AI generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}