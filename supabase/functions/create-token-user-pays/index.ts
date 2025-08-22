// supabase/functions/create-token-user-pays/index.ts
// FIXED VERSION - Using correct Buffer polyfill

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

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
    // Import Solana libraries
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.4");
    const {
      Connection,
      Keypair,
      PublicKey,
      SystemProgram,
      Transaction,
      LAMPORTS_PER_SOL,
      ComputeBudgetProgram,
    } = await import("https://esm.sh/@solana/web3.js@1.95.3");
    
    const {
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      createInitializeMintInstruction,
      createAssociatedTokenAccountInstruction,
      createMintToInstruction,
      getAssociatedTokenAddress,
      createSetAuthorityInstruction,
      AuthorityType,
    } = await import("https://esm.sh/@solana/spl-token@0.4.8");

    const body = await req.json();
    const { name, symbol, description, imageUrl, creatorWallet } = body;

    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, and creatorWallet");
    }

    console.log("Creating token:", { name, symbol, creator: creatorWallet });

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Connect to Solana
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    if (!heliusKey) {
      throw new Error("HELIUS_RPC_API_KEY not configured");
    }
    
    const connection = new Connection(
      `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
      "confirmed"
    );

    // Platform wallet
    const platformWalletAddress = Deno.env.get("PLATFORM_WALLET_ADDRESS") || "11111111111111111111111111111111";
    const PLATFORM_WALLET = new PublicKey(platformWalletAddress);
    
    console.log("Platform wallet:", PLATFORM_WALLET.toString());

    // Constants
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;
    const DECIMALS = 6;
    const TOTAL_SUPPLY = 1_000_000_000;
    const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

    const creatorPubkey = new PublicKey(creatorWallet);
    const mintKeypair = Keypair.generate();

    console.log("New mint address:", mintKeypair.publicKey.toString());

    // Get bonding curve PDA - using Uint8Array instead of Buffer
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("bonding-curve"),
        mintKeypair.publicKey.toBytes()
      ],
      new PublicKey(BONDING_CURVE_PROGRAM_ID)
    );

    console.log("Bonding curve PDA:", bondingCurvePDA.toString());

    // Build transaction
    const transaction = new Transaction();

    // 1. Priority fee
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    // 2. Transfer fee to platform (user pays)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creatorPubkey,
        toPubkey: PLATFORM_WALLET,
        lamports: TOKEN_CREATION_FEE,
      })
    );

    // 3. Create mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(82);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creatorPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 4. Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
        creatorPubkey, // mint authority (temporary)
        null, // no freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // 5. Create bonding curve token account
    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePDA,
      true, // allow PDA owner
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        creatorPubkey, // payer
        bondingCurveTokenAccount, // ata
        bondingCurvePDA, // owner
        mintKeypair.publicKey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 6. Mint all tokens to bonding curve
    const totalSupplyWithDecimals = TOTAL_SUPPLY * Math.pow(10, DECIMALS);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        bondingCurveTokenAccount,
        creatorPubkey, // mint authority
        totalSupplyWithDecimals,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 7. Transfer mint authority to bonding curve
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        creatorPubkey,
        AuthorityType.MintTokens,
        bondingCurvePDA,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Set blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    // Partially sign with mint keypair
    transaction.partialSign(mintKeypair);

    // Serialize for frontend
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Convert to base64 using Deno's base64 encoder
    const base64Transaction = base64Encode(serializedTransaction);

    // Save to database
    const tokenData = {
      mint_address: mintKeypair.publicKey.toString(),
      bonding_curve_address: bondingCurvePDA.toString(),
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} token`,
      image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
      
      // Bonding curve initial state
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: TOTAL_SUPPLY,
      tokens_sold: 0,
      
      // Token details
      decimals: DECIMALS,
      total_supply: TOTAL_SUPPLY,
      current_price: 0.00003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 0,
      transaction_count: 0,
      
      // Status
      is_active: true,
      is_graduated: false,
      
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

    console.log("✅ Token created successfully:", mintKeypair.publicKey.toString());

    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: base64Transaction,
        mintAddress: mintKeypair.publicKey.toString(),
        bondingCurveAddress: bondingCurvePDA.toString(),
        requiresSignature: true,
        message: "Sign transaction in your wallet to complete token creation",
        explorer: `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`,
        fees: {
          creation: 0.02,
          gas: 0.005,
          total: 0.025,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Token creation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Token creation failed",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});