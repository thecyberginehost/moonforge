// FILE: supabase/functions/create-token-user-pays/index.ts
// User pays for token creation - Platform receives 1% fee

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const body = await req.json();
    const {
      name,
      symbol,
      description,
      imageUrl,
      telegram,
      twitter,
      website,
      creatorWallet,
      initialBuyIn = 0
    } = body;

    // Validate inputs
    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, and creatorWallet");
    }

    console.log("Creating token:", { name, symbol, creatorWallet });

    // Get environment variables
    const PLATFORM_WALLET = Deno.env.get("PLATFORM_WALLET_ADDRESS") || "11111111111111111111111111111111";
    const BONDING_CURVE_PROGRAM = Deno.env.get("BONDING_CURVE_PROGRAM_ID") || "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";
    
    // Generate mock addresses for now (until real Solana integration)
    const mintAddress = generateMockAddress(symbol);
    const bondingCurveAddress = generateMockAddress(`${symbol}-curve`);
    
    // Generate logo if not provided
    const logoUrl = imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // Prepare token data
    const tokenData = {
      mint_address: mintAddress,
      bonding_curve_address: bondingCurveAddress,
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} - The next moonshot on Solana!`,
      image_url: logoUrl,
      twitter_url: twitter,
      telegram_url: telegram,
      website_url: website,
      
      // Initial bonding curve state
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: 793100000,
      token_supply: 1000000000,
      
      // Initial price and metrics
      current_price: 0.00000003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 1,
      transaction_count: 0,
      
      // Status
      is_active: true,
      is_graduated: false,
      graduation_market_cap: 69420,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to database
    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert(tokenData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save token: ${dbError.message}`);
    }

    console.log("Token saved to database:", token.id);

    // If initial buy-in specified, record it (mock for now)
    let initialTradeResult = null;
    if (initialBuyIn > 0 && token) {
      console.log(`Recording initial buy of ${initialBuyIn} SOL`);
      
      // Calculate tokens received (using bonding curve math)
      const tokensReceived = calculateTokensFromSol(initialBuyIn, tokenData.virtual_sol_reserves, tokenData.virtual_token_reserves);
      
      // Record the trade
      const tradeData = {
        token_id: token.id,
        trader_wallet: creatorWallet,
        trade_type: 'buy',
        sol_amount: initialBuyIn,
        token_amount: tokensReceived,
        price_per_token: initialBuyIn / tokensReceived,
        platform_fee: initialBuyIn * 0.01, // 1% fee
        market_cap_after: calculateMarketCap(initialBuyIn, tokenData),
        created_at: new Date().toISOString(),
      };

      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert(tradeData)
        .select()
        .single();

      if (tradeError) {
        console.error("Trade recording error:", tradeError);
        initialTradeResult = { error: tradeError.message };
      } else {
        initialTradeResult = { success: true, trade };
        
        // Update token reserves
        await supabase
          .from("tokens")
          .update({
            real_sol_reserves: initialBuyIn * 0.99, // 99% goes to reserves
            real_token_reserves: tokenData.real_token_reserves - tokensReceived,
            volume_24h: initialBuyIn,
            transaction_count: 1,
          })
          .eq("id", token.id);
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        token,
        message: "Token created successfully!",
        requiresSignature: false, // For now, no signature needed
        platformWallet: PLATFORM_WALLET,
        programId: BONDING_CURVE_PROGRAM,
        initialBuyIn,
        initialTradeResult,
        fees: {
          creation: 0.02, // 0.02 SOL creation fee
          platform: 0.0002, // 1% of creation fee
          total: 0.0202
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        details: "Check function logs for more information",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper functions
function generateMockAddress(seed: string): string {
  // Generate a deterministic mock address from seed
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let address = "";
  let hash = 0;
  
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  
  for (let i = 0; i < 44; i++) {
    hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
    address += chars[hash % chars.length];
  }
  
  return address;
}

function calculateTokensFromSol(solAmount: number, solReserves: number, tokenReserves: number): number {
  // Simplified bonding curve calculation
  const k = solReserves * tokenReserves;
  const newSolReserves = solReserves + solAmount;
  const newTokenReserves = k / newSolReserves;
  return tokenReserves - newTokenReserves;
}

function calculateMarketCap(solAmount: number, tokenData: any): number {
  const newPrice = (tokenData.virtual_sol_reserves + solAmount) / (tokenData.virtual_token_reserves - calculateTokensFromSol(solAmount, tokenData.virtual_sol_reserves, tokenData.virtual_token_reserves));
  return newPrice * tokenData.token_supply;
}