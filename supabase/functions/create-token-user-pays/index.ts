// supabase/functions/create-token-user-pays/index.ts
// FINAL VERSION - Real Solana token creation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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

    // Check Helius configuration
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    
    // If no Helius key, use mock mode
    if (!heliusKey) {
      console.log("No Helius key - using mock mode");
      
      const mockMint = `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const mockBondingCurve = `bc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const tokenData = {
        mint_address: mockMint,
        bonding_curve_address: mockBondingCurve,
        creator_wallet: creatorWallet,
        name,
        symbol: symbol.toUpperCase(),
        description: description || `${name} token`,
        image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
        virtual_sol_reserves: 30,
        virtual_token_reserves: 1073000000,
        real_sol_reserves: 0,
        real_token_reserves: 1000000000,
        tokens_sold: 0,
        decimals: 6,
        total_supply: 1000000000,
        current_price: 0.00003,
        market_cap: 0,
        volume_24h: 0,
        holder_count: 0,
        transaction_count: 0,
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
        throw new Error(`Database error: ${dbError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Mock mode - add HELIUS_RPC_API_KEY for real tokens",
          token,
          mintAddress: mockMint,
          mock: true,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Real Solana mode
    console.log("Creating real Solana token with Helius");

    // Import Solana libraries
    const {
      Connection,
      Keypair,
      PublicKey,
      SystemProgram,
      Transaction,
      LAMPORTS_PER_SOL,
      ComputeBudgetProgram,
    } = await import("https://esm.sh/@solana/web3.js@1.91.1");
    
    const {
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      createInitializeMintInstruction,
      createAssociatedTokenAccountInstruction,
      createMintToInstruction,
      getAssociatedTokenAddress,
      createSetAuthorityInstruction,
      AuthorityType,
    } = await import("https://esm.sh/@solana/spl-token@0.3.9");

    // Connect to Solana
    const connection = new Connection(
      `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
      "confirmed"
    );

    // Test connection
    const version = await connection.getVersion();
    console.log("Connected to Solana:", version);

    // Platform wallet
    const platformWalletAddress = Deno.env.get("PLATFORM_WALLET_ADDRESS") || "11111111111111111111111111111111";
    const PLATFORM_WALLET = new PublicKey(platformWalletAddress);

    // Constants
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;
    const DECIMALS = 6;
    const TOTAL_SUPPLY = 1_000_000_000;
    const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

    const creatorPubkey = new PublicKey(creatorWallet);
    const mintKeypair = Keypair.generate();

    console.log("New mint:", mintKeypair.publicKey.toString());

    // Get bonding curve PDA
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("bonding-curve"),
        mintKeypair.publicKey.toBytes()
      ],
      new PublicKey(BONDING_CURVE_PROGRAM_ID)
    );

    // Build transaction
    const transaction = new Transaction();

    // Priority fee
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    // Transfer fee to platform
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creatorPubkey,
        toPubkey: PLATFORM_WALLET,
        lamports: TOKEN_CREATION_FEE,
      })
    );

    // Create mint account
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

    // Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
        creatorPubkey,
        null,
        TOKEN_PROGRAM_ID
      )
    );

    // Create bonding curve token account
    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        creatorPubkey,
        bondingCurveTokenAccount,
        bondingCurvePDA,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // Mint all tokens to bonding curve
    const totalSupplyWithDecimals = TOTAL_SUPPLY * Math.pow(10, DECIMALS);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        bondingCurveTokenAccount,
        creatorPubkey,
        totalSupplyWithDecimals,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Transfer mint authority
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
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    // Partially sign with mint
    transaction.partialSign(mintKeypair);

    // Serialize
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Convert to base64
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
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: TOTAL_SUPPLY,
      tokens_sold: 0,
      decimals: DECIMALS,
      total_supply: TOTAL_SUPPLY,
      current_price: 0.00003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 0,
      transaction_count: 0,
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
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log("✅ Real token created:", mintKeypair.publicKey.toString());

    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: base64Transaction,
        mintAddress: mintKeypair.publicKey.toString(),
        bondingCurveAddress: bondingCurvePDA.toString(),
        requiresSignature: true,
        message: "Sign transaction in wallet",
        explorer: `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`,
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