// supabase/functions/create-token-user-pays/index.ts
// FIXED VERSION - Removed decimals field that doesn't exist in database

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
    const { name, symbol, description, imageUrl, creatorWallet } = body;

    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields");
    }

    console.log("Creating token:", { name, symbol });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate mock addresses for now
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const mockMint = `${timestamp}_${randomStr}_${symbol.toLowerCase()}`;
    const mockBondingCurve = `bc_${timestamp}_${randomStr}`;

    // Save to database - REMOVED decimals field
    const tokenData = {
      mint_address: mockMint,
      bonding_curve_address: mockBondingCurve,
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} token on MoonForge`,
      image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
      
      // Bonding curve state
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: 1000000000,
      tokens_sold: 0,
      
      // Token metrics (no decimals field!)
      total_supply: 1000000000,
      current_price: 0.00003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 0,
      transaction_count: 0,
      
      // Status
      is_active: true,
      is_graduated: false,
      
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

    console.log("Token saved successfully:", token.id);

    // Check if we have Helius for real tokens
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const mode = heliusKey ? "Ready for Solana" : "Mock mode";

    return new Response(
      JSON.stringify({
        success: true,
        message: `Token created successfully (${mode})`,
        token,
        mintAddress: mockMint,
        bondingCurveAddress: mockBondingCurve,
        requiresSignature: false,
        mock: true,
        tokenId: token.id,
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