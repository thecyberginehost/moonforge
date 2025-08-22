// supabase/functions/create-token-user-pays/index.ts
// WORKING VERSION - Matches your actual database schema

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    const { 
      name, 
      symbol, 
      description, 
      imageUrl, 
      twitter, 
      telegram, 
      website, 
      creatorWallet 
    } = body;

    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, and creatorWallet");
    }

    console.log("Creating token:", { name, symbol });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique identifiers
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const mockMint = `${timestamp}_${symbol.toLowerCase()}_${randomStr}`;
    const mockBondingCurve = `bc_${timestamp}_${randomStr}`;

    // Token data matching your EXACT schema
    const tokenData = {
      // Addresses
      mint_address: mockMint,
      bonding_curve_address: mockBondingCurve,
      creator_wallet: creatorWallet,
      
      // Token info
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} token on MoonForge`,
      image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
      
      // Social links (optional)
      twitter_url: twitter || null,
      telegram_url: telegram || null,
      website_url: website || null,
      
      // Bonding curve state
      virtual_sol_reserves: 30, // Starting virtual SOL
      virtual_token_reserves: 1073000000, // Starting virtual tokens
      real_sol_reserves: 0, // No real SOL yet
      real_token_reserves: 1000000000, // All tokens in bonding curve
      token_supply: 1000000000, // Total supply (1 billion)
      
      // Market data
      current_price: 0.00003, // Starting price in SOL
      market_cap: 30, // virtual_sol_reserves initially
      volume_24h: 0,
      holder_count: 0, // Will be 1 after first buy
      transaction_count: 0,
      
      // Status flags
      is_active: true,
      is_graduated: false,
      graduation_market_cap: 69420, // Graduation target (pump.fun style)
      
      // Achievement system (optional)
      achievement_count: 0,
      achievement_points: 0,
      fee_discount_bps: 0, // No discount initially
      is_featured: false,
      last_achievement_check: null,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert(tokenData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log("✅ Token created successfully:", token.id);

    // Check if we have Helius for real tokens
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const mode = heliusKey ? "Ready for Solana integration" : "Mock mode (add HELIUS_RPC_API_KEY for real tokens)";

    return new Response(
      JSON.stringify({
        success: true,
        message: `Token created successfully! ${mode}`,
        token,
        mintAddress: mockMint,
        bondingCurveAddress: mockBondingCurve,
        tokenId: token.id,
        requiresSignature: false, // Will be true when we add real Solana
        mock: true, // Remove this when adding real Solana
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});