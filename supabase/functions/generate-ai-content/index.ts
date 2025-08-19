import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      'https://llvakqunvvheajwejpzm.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdmFrcXVudnZoZWFqd2VqcHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4OTYxNjksImV4cCI6MjA2ODQ3MjE2OX0.B4G2bqu9muRFuviZRt7bs80UUVEVy5nbO0p55z7vmlQ'
    );

    const { type, prompt, context, imageUrl: inputImageUrl, trendData } = await req.json();

    if (!type || !prompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and prompt' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating AI content:', { type, prompt, inputImageUrl });

    if (type === 'trend-based-token') {
      // Generate complete token package based on trends
      return await generateTrendBasedToken(openAIApiKey, supabase, trendData);
    }

    if (type === 'image') {
      // Generate image using DALL-E
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: `Create a professional crypto token logo for: ${prompt}. Make it clean, modern, and suitable for a cryptocurrency. Style should be minimalist with bold colors.`,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      const imageData = await imageResponse.json();
      
      if (!imageResponse.ok) {
        throw new Error(`OpenAI Image API error: ${imageData.error?.message || 'Unknown error'}`);
      }

      const imageUrl = imageData.data[0].url;

      // Download and store image in Supabase Storage with hashed filename
      const imageBlob = await fetch(imageUrl).then(r => r.blob());
      
      // Create a secure hash for the filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const hashInput = `${prompt}-${timestamp}-${randomString}`;
      
      // Generate SHA-256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(hashInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Use first 16 characters of hash + extension for filename
      const hashedFileName = `${hashHex.substring(0, 16)}.png`;
      
      console.log(`Storing image with hashed filename: ${hashedFileName}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('token-images')
        .upload(hashedFileName, imageBlob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false, // Don't overwrite if exists (very unlikely with hash)
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // If filename collision (extremely unlikely), try with longer hash
        if (uploadError.message?.includes('already exists')) {
          const longerFileName = `${hashHex.substring(0, 24)}-${randomString}.png`;
          const { data: retryUploadData, error: retryUploadError } = await supabase.storage
            .from('token-images')
            .upload(longerFileName, imageBlob, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false,
            });
          
          if (retryUploadError) {
            console.error('Retry storage upload error:', retryUploadError);
            // Return the original URL if storage fails
            return new Response(
              JSON.stringify({ imageUrl }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          const { data: retryPublicUrlData } = supabase.storage
            .from('token-images')
            .getPublicUrl(longerFileName);

          return new Response(
            JSON.stringify({ imageUrl: retryPublicUrlData.publicUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Return the original URL if storage fails
        return new Response(
          JSON.stringify({ imageUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(hashedFileName);

      console.log(`Generated secure image URL: ${publicUrlData.publicUrl}`);

      return new Response(
        JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'background-removal') {
      // Handle background removal using gpt-image-1 model
      if (!inputImageUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing imageUrl for background removal' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`Processing background removal for image: ${inputImageUrl}`);

      try {
        // Use GPT-4 Vision to describe the image first
        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Describe this image in detail, focusing on the main subject/object. Be specific about colors, style, and key visual elements. This description will be used to recreate the image with a transparent background.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: inputImageUrl
                    }
                  }
                ]
              }
            ],
            max_tokens: 500,
          }),
        });

        const visionData = await visionResponse.json();
        
        if (!visionResponse.ok) {
          throw new Error(`Vision API error: ${visionData.error?.message || 'Unknown error'}`);
        }

        const imageDescription = visionData.choices[0].message.content;
        console.log('Image description:', imageDescription);

        // Generate new image with transparent background using gpt-image-1
        const backgroundRemovalResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: `Create an exact replica of this image with a completely transparent background: ${imageDescription}. The main subject should be identical but isolated with no background whatsoever. Make sure the background is fully transparent/removed.`,
            n: 1,
            size: '1024x1024',
            quality: 'high',
            background: 'transparent',
            output_format: 'png'
          }),
        });

        const backgroundRemovalData = await backgroundRemovalResponse.json();
        
        if (!backgroundRemovalResponse.ok) {
          console.error('Background removal API error:', backgroundRemovalData);
          throw new Error(`Background removal API error: ${backgroundRemovalData.error?.message || 'Unknown error'}`);
        }

        // gpt-image-1 returns base64 data directly
        const base64Image = backgroundRemovalData.data[0].b64_json;
        
        // Convert base64 to blob
        const binaryString = atob(base64Image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const processedImageBlob = new Blob([bytes], { type: 'image/png' });
        
        // Create a secure hash for the filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const hashInput = `bg-removed-${inputImageUrl}-${timestamp}-${randomString}`;
        
        // Generate SHA-256 hash
        const encoder = new TextEncoder();
        const data = encoder.encode(hashInput);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        const hashedFileName = `bg-${hashHex.substring(0, 16)}.png`;
        
        console.log(`Storing background-removed image with filename: ${hashedFileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('token-images')
          .upload(hashedFileName, processedImageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Background removal storage upload error:', uploadError);
          // Return base64 data URL if storage fails
          return new Response(
            JSON.stringify({ imageUrl: `data:image/png;base64,${base64Image}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from('token-images')
          .getPublicUrl(hashedFileName);

        console.log(`Generated background-removed image URL: ${publicUrlData.publicUrl}`);

        return new Response(
          JSON.stringify({ imageUrl: publicUrlData.publicUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Background removal failed:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to remove background', details: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

    } else if (type === 'description') {
      // Generate token description using GPT-4
      const descriptionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert cryptocurrency marketing copywriter who creates compelling, viral-worthy token descriptions. Your descriptions should:
              
              - Be engaging and energetic without being overly hype-focused
              - Highlight community aspects and real utility
              - Use modern crypto terminology naturally
              - Create FOMO while being authentic
              - Be between 100-300 characters
              - Avoid obvious scam language
              - Make it sound like a legitimate project with viral potential
              - Include relevant emojis for social media appeal`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.8,
        }),
      });

      const descriptionData = await descriptionResponse.json();
      
      if (!descriptionResponse.ok) {
        throw new Error(`OpenAI Chat API error: ${descriptionData.error?.message || 'Unknown error'}`);
      }

      const description = descriptionData.choices[0].message.content.trim();
      
      return new Response(
        JSON.stringify({ description }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (type === 'suggestions') {
      // Generate name/symbol suggestions using GPT-4
      const suggestionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert cryptocurrency naming and branding specialist. You understand viral meme culture, crypto twitter psychology, and what makes tokens memorable and marketable.

NAMING PRINCIPLES:
- Keep names short, punchy, and memorable (3-10 characters)
- Use current crypto/meme trends and cultural references
- Consider pronunciation and how it sounds when spoken
- Think about hashtag potential and social media virality
- Avoid generic crypto terms like "moon," "safe," "baby" unless contextually clever

SYMBOL GUIDELINES:
- 3-5 characters maximum for optimal exchange compatibility
- Avoid confusion with existing major tokens
- Make it pronounceable and tweetable
- Consider ticker tape readability

Generate creative, marketable suggestions that would resonate with the current crypto community. Focus on originality and viral potential.`
            },
            {
              role: 'user',
              content: prompt.includes('Generate ticker symbols for token named:') 
                ? `Generate 5 creative ticker symbols specifically for the token named: ${prompt.replace('Generate ticker symbols for token named: ', '')}. The symbols should be 3-4 characters, relate to the token name, and be memorable. Return as JSON with array "symbols".`
                : `Generate 5 creative token names and their corresponding ticker symbols for: ${prompt}. Context: ${context || 'fun meme cryptocurrency that could go viral'}. Each name should have a matching symbol that relates to it. Return as JSON with arrays "names" and "symbols" where names[0] matches symbols[0], etc.`
            }
          ],
          max_tokens: 500,
          temperature: 0.8,
        }),
      });

      const suggestionsData = await suggestionsResponse.json();
      
      if (!suggestionsResponse.ok) {
        throw new Error(`OpenAI Chat API error: ${suggestionsData.error?.message || 'Unknown error'}`);
      }

      try {
        const content = suggestionsData.choices[0].message.content;
        console.log('Raw OpenAI response:', content);
        
        // Try to extract JSON from the content if it's wrapped in markdown or other text
        let jsonContent = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonContent = jsonMatch[0];
        }
        
        const suggestions = JSON.parse(jsonContent);
        
        // Handle different response types
        if (prompt.includes('Generate ticker symbols for token named:')) {
          // For symbol-only requests, validate symbols array
          if (!suggestions.symbols || !Array.isArray(suggestions.symbols)) {
            throw new Error('Invalid symbols format from OpenAI');
          }
        } else {
          // For name+symbol requests, validate both arrays and ensure they match
          if (!suggestions.names || !suggestions.symbols || !Array.isArray(suggestions.names) || !Array.isArray(suggestions.symbols)) {
            throw new Error('Invalid suggestions format from OpenAI');
          }
          
          // Ensure arrays are the same length for proper pairing
          const minLength = Math.min(suggestions.names.length, suggestions.symbols.length);
          suggestions.names = suggestions.names.slice(0, minLength);
          suggestions.symbols = suggestions.symbols.slice(0, minLength);
        }
        
        return new Response(
          JSON.stringify(suggestions),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.log('Fallback: Generating random suggestions based on prompt');
        
        // Handle fallback differently based on request type
        if (prompt.includes('Generate ticker symbols for token named:')) {
          const tokenName = prompt.replace('Generate ticker symbols for token named: ', '');
          const nameUpper = tokenName.toUpperCase().replace(/\s+/g, '');
          const fallbackSymbols = [
            nameUpper.substring(0, 4),
            nameUpper.substring(0, 3) + 'X',
            nameUpper.substring(0, 3) + '1',
            nameUpper.substring(0, 2) + 'TK',
            nameUpper.substring(0, 3) + 'Z'
          ];
          
          return new Response(
            JSON.stringify({ symbols: fallbackSymbols }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Generate more varied fallback suggestions based on the prompt
          const timestamp = Date.now().toString().slice(-3);
          const themes = {
            doge: [
              { name: `SuperDoge`, symbol: 'SDGE' },
              { name: `MegaDoge`, symbol: 'MDGE' },
              { name: `DogeMoon`, symbol: 'DMOON' },
              { name: `AlphaDoge`, symbol: 'ADOG' },
              { name: `GigaDoge`, symbol: 'GDOG' }
            ],
            pepe: [
              { name: `GigaPepe`, symbol: 'GPEPE' },
              { name: `PepeMoon`, symbol: 'PMOON' },
              { name: `UltraPepe`, symbol: 'UPEPE' },
              { name: `MegaPepe`, symbol: 'MPEPE' },
              { name: `AlphaPepe`, symbol: 'APEPE' }
            ],
            moon: [
              { name: `MoonShot`, symbol: 'MOON' },
              { name: `LunarCoin`, symbol: 'LUNAR' },
              { name: `MoonForge`, symbol: 'MFRG' },
              { name: `StellarRise`, symbol: 'STAR' },
              { name: `CosmicCoin`, symbol: 'COSMIC' }
            ],
            rocket: [
              { name: `RocketFuel`, symbol: 'FUEL' },
              { name: `BlastOff`, symbol: 'BLAST' },
              { name: `ThrusterX`, symbol: 'THRX' },
              { name: `LaunchPad`, symbol: 'LAUNCH' },
              { name: `BoosterCoin`, symbol: 'BOOST' }
            ],
          };
          
          const promptLower = prompt.toLowerCase();
          let fallbackPairs = [
            { name: `ViralCoin`, symbol: 'VIRAL' },
            { name: `MemeForge`, symbol: 'MFRG' },
            { name: `PumpMaster`, symbol: 'PUMP' },
            { name: `DegenCoin`, symbol: 'DEGEN' },
            { name: `BasedToken`, symbol: 'BASED' }
          ];
          
          // Choose theme-based names if prompt matches
          for (const [theme, pairs] of Object.entries(themes)) {
            if (promptLower.includes(theme)) {
              fallbackPairs = pairs;
              break;
            }
          }
          
          const fallbackNames = fallbackPairs.map(pair => pair.name);
          const fallbackSymbols = fallbackPairs.map(pair => pair.symbol);
          
          return new Response(
            JSON.stringify({
              names: fallbackNames,
              symbols: fallbackSymbols
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid type. Use "image", "background-removal", "suggestions", or "trend-based-token"' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Error generating AI content:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateTrendBasedToken(openAIApiKey: string, supabase: any, trendData: any) {
  console.log('Generating trend-based token with data:', trendData);

  // Add randomness and uniqueness factors to prevent repetition
  const timestamp = Date.now();
  const randomSeed = Math.random().toString(36).substring(2, 8);
  const uniqueModifiers = ['quantum', 'cosmic', 'ultra', 'mega', 'hyper', 'prime', 'elite', 'alpha', 'phantom', 'nexus'];
  const randomModifier = uniqueModifiers[Math.floor(Math.random() * uniqueModifiers.length)];
  
  // Create a comprehensive prompt based on current trends with uniqueness
  const trendPrompt = `Based on current crypto market trends, generate a COMPLETELY UNIQUE token concept:

CURRENT TRENDS:
- Trending tokens: ${trendData?.trendingTokens?.join(', ') || 'AI, Gaming, Memes'}
- Viral memes: ${trendData?.viralMemes?.join(', ') || 'Pepe, Doge, Space themes'}
- Market sentiment: ${trendData?.sentiment || 'bullish'}
- Hot categories: ${trendData?.topCategories?.join(', ') || 'animals, space, tech'}

UNIQUENESS REQUIREMENTS:
- Must be 100% ORIGINAL (never seen before)
- Incorporate this unique modifier: "${randomModifier}"
- Random creativity seed: "${randomSeed}"
- Timestamp for uniqueness: ${timestamp}
- Combine 2-3 trend elements in a fresh, unexpected way
- Avoid overused crypto names and concepts

Generate a token that would be perfectly positioned for viral success right now.
Make it feel completely new and innovative, not a copy of existing concepts.

Return JSON with:
{
  "name": "TokenName",
  "symbol": "SYMB", 
  "description": "Brief compelling description",
  "imagePrompt": "Detailed prompt for logo generation",
  "category": "primary category",
  "reasoning": "Why this unique token concept would go viral now"
}`;

  try {
    // Generate token concept
    const conceptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a crypto trend expert who creates viral token concepts. Focus on current trends, memability, and viral potential. Always return valid JSON.'
          },
          {
            role: 'user',
            content: trendPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.9,
      }),
    });

    const conceptData = await conceptResponse.json();
    if (!conceptResponse.ok) {
      throw new Error(`Concept generation failed: ${conceptData.error?.message}`);
    }

    let tokenConcept;
    try {
      const content = conceptData.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      tokenConcept = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      // Fallback token concept
      tokenConcept = {
        name: "TrendMaster",
        symbol: "TREND",
        description: "The token that follows all the hottest crypto trends",
        imagePrompt: "A futuristic crystal ball showing trending crypto symbols",
        category: "trending",
        reasoning: "Captures the essence of following market trends"
      };
    }

    // Generate the logo image
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Create a modern crypto token logo: ${tokenConcept.imagePrompt}. Style: clean, professional, vibrant colors, suitable for cryptocurrency branding. No text in the image.`,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }),
    });

    const imageData = await imageResponse.json();
    if (!imageResponse.ok) {
      throw new Error(`Image generation failed: ${imageData.error?.message}`);
    }

    // Store the image
    const imageUrl = imageData.data[0].url;
    const imageBlob = await fetch(imageUrl).then(r => r.blob());
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const hashedFileName = `trend-${timestamp}-${randomString}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('token-images')
      .upload(hashedFileName, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    let finalImageUrl = imageUrl;
    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from('token-images')
        .getPublicUrl(hashedFileName);
      finalImageUrl = publicUrlData.publicUrl;
    }

    return new Response(
      JSON.stringify({
        ...tokenConcept,
        imageUrl: finalImageUrl,
        success: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trend-based token generation failed:', error);
    
    // Return fallback token
    return new Response(
      JSON.stringify({
        name: "TrendCoin",
        symbol: "TREND",
        description: "The hottest new meme token following current trends",
        imageUrl: "",
        category: "meme",
        reasoning: "Fallback trendy token concept",
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
