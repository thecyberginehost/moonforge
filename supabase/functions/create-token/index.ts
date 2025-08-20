// FILE PATH: /supabase/functions/create-token-instructions/index.ts
// This generates the transaction instructions for the user to sign and pay

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      name, 
      symbol, 
      description, 
      image_url,
      twitter_url,
      telegram_url,
      website_url,
      creator_wallet 
    } = await req.json();

    // Validate inputs
    if (!name || !symbol || !creator_wallet) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Get connection (use Helius if available)
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const rpcUrl = heliusKey 
      ? `https://devnet.helius-rpc.com/?api-key=${heliusKey}`
      : "https://api.devnet.solana.com";
    
    const connection = new Connection(rpcUrl, "confirmed");

    // Get platform wallet address for fees
    const PLATFORM_WALLET = Deno.env.get("PLATFORM_WALLET_ADDRESS") || "11111111111111111111111111111111";
    const platformPubkey = new PublicKey(PLATFORM_WALLET);
    const creatorPubkey = new PublicKey(creator_wallet);

    // Get your deployed program ID
    const BONDING_CURVE_PROGRAM = new PublicKey(
      Deno.env.get("BONDING_CURVE_PROGRAM_ID") || "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779"
    );

    // Calculate fees
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL; // 0.02 SOL creation fee
    const PLATFORM_FEE = TOKEN_CREATION_FEE * 0.01; // 1% to platform

    // Build transaction for user to sign
    const transaction = new Transaction();

    // Add compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })
    );

    // Add platform fee transfer (1% of creation fee)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creatorPubkey,
        toPubkey: platformPubkey,
        lamports: PLATFORM_FEE,
      })
    );

    // For now, since we can't create real tokens without the program,
    // we'll store the token data and return a success message
    // In production, you'd add the actual token creation instructions here

    // Generate mock addresses for now
    const mockMint = PublicKey.unique().toString();
    const mockBondingCurve = PublicKey.unique().toString();

    // Generate logo if not provided
    const logoUrl = image_url || 
      `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // Store token in database
    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert({
        mint_address: mockMint,
        bonding_curve_address: mockBondingCurve,
        creator_wallet,
        name,
        symbol,
        description: description || `${name} - The next moonshot on Solana!`,
        image_url: logoUrl,
        twitter_url,
        telegram_url,
        website_url,
        current_price: 0.00000003,
        market_cap: 0,
        volume_24h: 0,
        holder_count: 1,
        is_active: true,
        is_graduated: false,
        virtual_sol_reserves: 30,
        virtual_token_reserves: 1073000000,
        real_sol_reserves: 0,
        real_token_reserves: 793100000,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    // Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: serializedTransaction.toString('base64'),
        message: "Transaction prepared for signing",
        fees: {
          creation: TOKEN_CREATION_FEE / LAMPORTS_PER_SOL,
          platform: PLATFORM_FEE / LAMPORTS_PER_SOL,
          total: (TOKEN_CREATION_FEE + PLATFORM_FEE) / LAMPORTS_PER_SOL,
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});