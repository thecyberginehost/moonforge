// supabase/functions/create-token-user-pays/index.ts
// SIMPLIFIED VERSION - Creates tokens without Metaplex metadata (for testing)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createSetAuthorityInstruction,
  AuthorityType,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { name, symbol, description, imageUrl, creatorWallet } = body;

    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields");
    }

    console.log("Creating token:", { name, symbol });

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

    // Constants
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL;
    const DECIMALS = 6; // Standard for SPL tokens
    const TOTAL_SUPPLY = 1_000_000_000; // 1 billion

    const creatorPubkey = new PublicKey(creatorWallet);
    const mintKeypair = Keypair.generate();

    console.log("New mint:", mintKeypair.publicKey.toString());

    // Get bonding curve PDA
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mintKeypair.publicKey.toBuffer()],
      new PublicKey(BONDING_CURVE_PROGRAM_ID)
    );

    // Build transaction
    const transaction = new Transaction();

    // 1. Priority fee
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    // 2. Transfer fee to platform
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
        creatorPubkey, // temp mint authority
        null, // no freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // 5. Create bonding curve token account
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

    // 6. Mint all supply to bonding curve
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
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    // Partially sign with mint keypair
    transaction.partialSign(mintKeypair);

    // Serialize for frontend
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Save to database
    const tokenData = {
      mint_address: mintKeypair.publicKey.toString(),
      bonding_curve_address: bondingCurvePDA.toString(),
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} token`,
      image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
      
      // Initial state
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

    console.log("✅ Token prepared:", mintKeypair.publicKey.toString());

    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: serializedTransaction.toString('base64'),
        mintAddress: mintKeypair.publicKey.toString(),
        bondingCurveAddress: bondingCurvePDA.toString(),
        requiresSignature: true,
        message: "Sign transaction in your wallet",
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
        error: error.message || "Token creation failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});