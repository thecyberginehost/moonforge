// supabase/functions/bonding-curve-trade/index.ts
// Handles buy/sell trades on the bonding curve

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bonding curve formula: y = mx^2 + b
// Price increases quadratically as supply decreases
function calculateTokensFromSol(
  solAmount: number,
  virtualSolReserves: number,
  virtualTokenReserves: number,
  realSolReserves: number,
  realTokenReserves: number
): number {
  // Use constant product formula: k = sol * tokens
  const k = virtualSolReserves * virtualTokenReserves;
  const newSolReserves = virtualSolReserves + realSolReserves + solAmount;
  const newTokenReserves = k / newSolReserves;
  const tokensOut = (virtualTokenReserves + realTokenReserves) - newTokenReserves;
  return Math.max(0, tokensOut);
}

function calculateSolFromTokens(
  tokenAmount: number,
  virtualSolReserves: number,
  virtualTokenReserves: number,
  realSolReserves: number,
  realTokenReserves: number
): number {
  // Use constant product formula: k = sol * tokens
  const k = virtualSolReserves * virtualTokenReserves;
  const newTokenReserves = virtualTokenReserves + realTokenReserves + tokenAmount;
  const newSolReserves = k / newTokenReserves;
  const solOut = (virtualSolReserves + realSolReserves) - newSolReserves;
  return Math.max(0, solOut);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    const { 
      tokenId,
      tradeType, // "buy" or "sell"
      amount, // SOL amount for buy, token amount for sell
      userWallet,
      slippageBps = 100 // 1% default slippage
    } = body;

    if (!tokenId || !tradeType || !amount || !userWallet) {
      throw new Error("Missing required fields");
    }

    if (tradeType !== "buy" && tradeType !== "sell") {
      throw new Error("Invalid trade type. Must be 'buy' or 'sell'");
    }

    console.log(`Processing ${tradeType} trade:`, { tokenId, amount, userWallet });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get token data
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error("Token not found");
    }

    if (!token.is_active) {
      throw new Error("Token is not active");
    }

    if (token.is_graduated) {
      throw new Error("Token has graduated. Trade on DEX instead");
    }

    // Calculate trade
    let tokensOut = 0;
    let solOut = 0;
    let newPrice = 0;
    let priceImpact = 0;

    const oldPrice = token.current_price;

    if (tradeType === "buy") {
      // Calculate tokens received for SOL
      tokensOut = calculateTokensFromSol(
        amount,
        token.virtual_sol_reserves,
        token.virtual_token_reserves,
        token.real_sol_reserves,
        token.real_token_reserves
      );

      if (tokensOut <= 0) {
        throw new Error("Insufficient liquidity");
      }

      // Check slippage
      const expectedTokens = amount / oldPrice;
      priceImpact = Math.abs((tokensOut - expectedTokens) / expectedTokens) * 10000;
      
      if (priceImpact > slippageBps) {
        throw new Error(`Price impact too high: ${(priceImpact / 100).toFixed(2)}%`);
      }

      // Update reserves
      token.real_sol_reserves += amount * 0.99; // 1% fee
      token.real_token_reserves -= tokensOut;
      
      // Calculate new price
      const totalSol = token.virtual_sol_reserves + token.real_sol_reserves;
      const totalTokens = token.virtual_token_reserves + token.real_token_reserves;
      newPrice = totalSol / totalTokens;

    } else {
      // Sell: Calculate SOL received for tokens
      solOut = calculateSolFromTokens(
        amount,
        token.virtual_sol_reserves,
        token.virtual_token_reserves,
        token.real_sol_reserves,
        token.real_token_reserves
      );

      if (solOut <= 0) {
        throw new Error("Insufficient liquidity");
      }

      // Check slippage
      const expectedSol = amount * oldPrice;
      priceImpact = Math.abs((solOut - expectedSol) / expectedSol) * 10000;
      
      if (priceImpact > slippageBps) {
        throw new Error(`Price impact too high: ${(priceImpact / 100).toFixed(2)}%`);
      }

      // Update reserves
      token.real_sol_reserves -= solOut;
      token.real_token_reserves += amount;
      
      // Apply 1% fee to seller
      solOut = solOut * 0.99;

      // Calculate new price
      const totalSol = token.virtual_sol_reserves + token.real_sol_reserves;
      const totalTokens = token.virtual_token_reserves + token.real_token_reserves;
      newPrice = totalSol / totalTokens;
    }

    // Update token data
    const updatedToken = {
      real_sol_reserves: token.real_sol_reserves,
      real_token_reserves: token.real_token_reserves,
      current_price: newPrice,
      market_cap: newPrice * token.token_supply,
      volume_24h: token.volume_24h + (tradeType === "buy" ? amount : solOut),
      transaction_count: token.transaction_count + 1,
      holder_count: tradeType === "buy" ? token.holder_count + 1 : token.holder_count,
      updated_at: new Date().toISOString(),
    };

    // Check for graduation (if market cap > graduation target)
    if (updatedToken.market_cap >= token.graduation_market_cap) {
      updatedToken.is_graduated = true;
      console.log("🎓 Token graduated!");
    }

    // Update token in database
    const { error: updateError } = await supabase
      .from("tokens")
      .update(updatedToken)
      .eq("id", tokenId);

    if (updateError) {
      throw new Error(`Failed to update token: ${updateError.message}`);
    }

    // Record transaction (create trades table if needed)
    const tradeData = {
      token_id: tokenId,
      trader_wallet: userWallet,
      trade_type: tradeType,
      sol_amount: tradeType === "buy" ? amount : solOut,
      token_amount: tradeType === "buy" ? tokensOut : amount,
      price: newPrice,
      price_impact_bps: Math.round(priceImpact),
      tx_signature: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    // Try to save trade (table might not exist yet)
    await supabase.from("trades").insert(tradeData);

    console.log(`✅ Trade successful:`, {
      type: tradeType,
      tokensOut,
      solOut,
      oldPrice,
      newPrice,
      priceImpact: `${(priceImpact / 100).toFixed(2)}%`
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `${tradeType === "buy" ? "Bought" : "Sold"} successfully!`,
        trade: {
          type: tradeType,
          tokensReceived: tradeType === "buy" ? tokensOut : 0,
          solReceived: tradeType === "sell" ? solOut : 0,
          tokenAmount: tradeType === "buy" ? tokensOut : amount,
          solAmount: tradeType === "buy" ? amount : solOut,
          price: newPrice,
          oldPrice,
          priceImpact: priceImpact / 100,
          txSignature: tradeData.tx_signature,
        },
        token: {
          ...token,
          ...updatedToken
        },
        mock: true, // Remove when adding real Solana
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Trade error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Trade failed",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});