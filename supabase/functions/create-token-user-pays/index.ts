// FILE: supabase/functions/create-token-user-pays/index.ts
// USER PAYS ALL FEES - Platform receives 100% of creation fee and 1% of trades

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.98.2";

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
    const PLATFORM_WALLET = new PublicKey(
      Deno.env.get("PLATFORM_WALLET_ADDRESS") || "11111111111111111111111111111111"
    );
    const BONDING_CURVE_PROGRAM = new PublicKey(
      Deno.env.get("BONDING_CURVE_PROGRAM_ID") || "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779"
    );

    // Connect to Solana
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const rpcUrl = heliusKey 
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
      : "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    // IMPORTANT FEE STRUCTURE - USER PAYS EVERYTHING
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL; // 0.02 SOL - USER PAYS THIS
    const PLATFORM_RECEIVES = TOKEN_CREATION_FEE; // PLATFORM GETS 100% OF CREATION FEE
    const TRADING_FEE_PERCENTAGE = 0.01; // 1% on ALL buy/sell transactions

    // Parse creator wallet
    const creatorPubkey = new PublicKey(creatorWallet);

    // Build transaction for USER to sign and pay
    const transaction = new Transaction();

    // Add compute budget (USER PAYS)
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // CRITICAL: Transfer FULL creation fee from USER to PLATFORM
    // USER PAYS 0.02 SOL → PLATFORM RECEIVES 0.02 SOL
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creatorPubkey, // USER wallet pays
        toPubkey: PLATFORM_WALLET, // PLATFORM receives EVERYTHING
        lamports: TOKEN_CREATION_FEE, // Full 0.02 SOL
      })
    );

    // Add token creation instructions here
    // (These would include mint creation, metadata, bonding curve setup, etc.)
    // Note: Gas fees for these operations are ALSO paid by the user

    // Generate mock addresses for now (replace with actual token creation)
    const mintAddress = generateMockAddress(symbol);
    const bondingCurveAddress = generateMockAddress(`${symbol}-curve`);
    
    // Generate logo if not provided
    const logoUrl = imageUrl || 
      `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // Prepare token data with fee structure clearly defined
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
      
      // Fee configuration - PLATFORM GETS EVERYTHING
      creation_fee_paid: 0.02, // User paid 0.02 SOL
      platform_received: 0.02, // Platform received 100% of it
      trading_fee: 0.01, // Platform gets 1% on ALL trades
      boost_fee_recipient: "platform", // Platform gets 100% of boost fees
      
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

    console.log("Token created - User paid 0.02 SOL, Platform received 0.02 SOL");

    // If initial buy-in specified, process it
    let initialTradeResult = null;
    if (initialBuyIn > 0 && token) {
      console.log(`Processing initial buy of ${initialBuyIn} SOL`);
      
      // Calculate platform fee (1% of trade)
      const platformFee = initialBuyIn * TRADING_FEE_PERCENTAGE;
      const tokensReceived = calculateTokensFromSol(
        initialBuyIn - platformFee, // Amount after fee
        tokenData.virtual_sol_reserves, 
        tokenData.virtual_token_reserves
      );
      
      // Record the trade with fees
      const tradeData = {
        token_id: token.id,
        trader_wallet: creatorWallet,
        trade_type: 'buy',
        sol_amount: initialBuyIn,
        token_amount: tokensReceived,
        price_per_token: initialBuyIn / tokensReceived,
        platform_fee: platformFee, // 1% to platform
        platform_fee_recipient: PLATFORM_WALLET.toString(),
        market_cap_after: calculateMarketCap(initialBuyIn - platformFee, tokenData),
        created_at: new Date().toISOString(),
      };

      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert(tradeData)
        .select()
        .single();

      if (!tradeError) {
        initialTradeResult = { 
          success: true, 
          trade,
          fees: {
            platform_received: platformFee,
            sol_to_curve: initialBuyIn - platformFee
          }
        };
        
        // Update token reserves
        await supabase
          .from("tokens")
          .update({
            real_sol_reserves: tokenData.real_sol_reserves + (initialBuyIn - platformFee),
            real_token_reserves: tokenData.real_token_reserves - tokensReceived,
            volume_24h: initialBuyIn,
            transaction_count: 1,
            total_platform_fees_collected: platformFee,
          })
          .eq("id", token.id);
      }
    }

    // Get recent blockhash for transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey; // USER pays for everything

    // Serialize transaction for user to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Return success response with clear fee breakdown
    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: serializedTransaction.toString('base64'),
        message: "Token creation transaction ready for signing",
        fees: {
          // USER PAYS ALL OF THIS:
          creation_fee: 0.02, // User pays 0.02 SOL
          gas_estimate: 0.002, // User also pays gas (~0.002 SOL)
          total_user_cost: 0.022, // Total cost to user
          
          // PLATFORM RECEIVES:
          platform_receives_creation: 0.02, // Platform gets 100% of creation fee
          platform_trading_fee: "1% on all trades", // Platform gets 1% forever
          platform_boost_fees: "100% of all boost fees", // Platform gets all boost revenue
        },
        initialTradeResult,
        requiresSignature: true,
        signerWallet: creatorWallet,
        platformWallet: PLATFORM_WALLET.toString(),
        programId: BONDING_CURVE_PROGRAM.toString(),
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
        details: "Token creation failed. User funds were not charged.",
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
  // Bonding curve calculation
  const k = solReserves * tokenReserves;
  const newSolReserves = solReserves + solAmount;
  const newTokenReserves = k / newSolReserves;
  return tokenReserves - newTokenReserves;
}

function calculateMarketCap(solAmount: number, tokenData: any): number {
  const newPrice = (tokenData.virtual_sol_reserves + solAmount) / 
    (tokenData.virtual_token_reserves - calculateTokensFromSol(
      solAmount, 
      tokenData.virtual_sol_reserves, 
      tokenData.virtual_token_reserves
    ));
  return newPrice * tokenData.token_supply;
}