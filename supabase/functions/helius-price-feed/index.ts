import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getHeliusApiKey(): string {
  const key = Deno.env.get("HELIUS_DATA_API_KEY");
  if (!key) throw new Error("Missing HELIUS_DATA_API_KEY");
  return key;
}

interface TokenPriceData {
  mint: string;
  price: number;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  lastUpdated: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mintAddress = url.searchParams.get('mint');
    const tokenIds = url.searchParams.get('tokens'); // Comma-separated list

    if (!mintAddress && !tokenIds) {
      return new Response(
        JSON.stringify({ error: 'Missing mint or tokens parameter' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const heliusKey = getHeliusApiKey();
    const supa = getSupa();

    if (mintAddress) {
      // Single token price feed
      const priceData = await fetchTokenPrice(mintAddress, heliusKey);
      
      // Update token in database
      await supa
        .from('tokens')
        .update({
          price: priceData.price,
          market_cap: priceData.marketCap,
          volume_24h: priceData.volume24h,
          updated_at: new Date().toISOString()
        })
        .eq('mint_address', mintAddress);

      return new Response(
        JSON.stringify({ success: true, data: priceData }),
        { headers: corsHeaders }
      );
    } else {
      // Multiple tokens price feed
      const mints = tokenIds!.split(',').filter(Boolean);
      const priceDataArray = await Promise.all(
        mints.map(mint => fetchTokenPrice(mint, heliusKey))
      );

      // Bulk update tokens in database
      for (const priceData of priceDataArray) {
        await supa
          .from('tokens')
          .update({
            price: priceData.price,
            market_cap: priceData.marketCap,
            volume_24h: priceData.volume24h,
            updated_at: new Date().toISOString()
          })
          .eq('mint_address', priceData.mint);
      }

      return new Response(
        JSON.stringify({ success: true, data: priceDataArray }),
        { headers: corsHeaders }
      );
    }
  } catch (error: any) {
    console.error('Helius price feed error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function fetchTokenPrice(mintAddress: string, heliusKey: string): Promise<TokenPriceData> {
  try {
    // Get token metadata from Helius DAS API
    const metadataResponse = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${heliusKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mintAccounts: [mintAddress],
        includeOffChain: true,
        disableCache: false
      })
    });

    if (!metadataResponse.ok) {
      throw new Error(`Helius metadata API error: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    
    // Get price data from Helius price API (if available)
    const priceResponse = await fetch(`https://api.helius.xyz/v0/addresses/${mintAddress}/balances?api-key=${heliusKey}`);
    
    let price = 0;
    let marketCap = 0;
    let volume24h = 0;
    let priceChange24h = 0;

    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      // Extract price information from Helius response
      // Note: Helius pricing data structure may vary - adjust based on actual API response
      price = priceData.price || 0;
      marketCap = priceData.marketCap || 0;
      volume24h = priceData.volume24h || 0;
      priceChange24h = priceData.priceChange24h || 0;
    }

    return {
      mint: mintAddress,
      price,
      marketCap,
      volume24h,
      priceChange24h,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching price for ${mintAddress}:`, error);
    // Return default values if API fails
    return {
      mint: mintAddress,
      price: 0,
      marketCap: 0,
      volume24h: 0,
      priceChange24h: 0,
      lastUpdated: new Date().toISOString()
    };
  }
}