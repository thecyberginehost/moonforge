// supabase/functions/create-bonding-curve-token/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Your deployed bonding curve program ID
const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";
const INITIAL_SUPPLY = 1_000_000_000; // 1 billion tokens

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, symbol, description, image, creatorWallet } = await req.json();

    // Validate inputs
    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, and creatorWallet are required");
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration");
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Solana connection (using devnet with Helius)
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    if (!heliusKey) {
      throw new Error("Missing HELIUS_RPC_API_KEY");
    }
    
    // Use devnet for testing
    const connection = new Connection(
      `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
      { commitment: "confirmed" }
    );

    // Get platform keypair
    const platformPrivateKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");
    if (!platformPrivateKey) {
      throw new Error("Missing PLATFORM_WALLET_PRIVATE_KEY");
    }

    // Parse the private key - handle both base58 and array formats
    let platformKeypair;
    try {
      // Try base58 first
      const decoded = bs58.decode(platformPrivateKey);
      platformKeypair = Keypair.fromSecretKey(decoded);
    } catch {
      // Try as JSON array
      try {
        const secretKey = new Uint8Array(JSON.parse(platformPrivateKey));
        platformKeypair = Keypair.fromSecretKey(secretKey);
      } catch (e) {
        throw new Error("Invalid PLATFORM_WALLET_PRIVATE_KEY format. Use base58 or JSON array.");
      }
    }

    const creatorPublicKey = new PublicKey(creatorWallet);

    // Generate new mint keypair
    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey;

    console.log("Creating token:", {
      name,
      symbol,
      mint: mintPublicKey.toBase58(),
      creator: creatorWallet,
      platform: platformKeypair.publicKey.toBase58()
    });

    // Build transaction
    const transaction = new Transaction();

    // Add priority fee for better performance
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 50000, // Priority fee
      })
    );

    // Get minimum rent for mint account
    const mintRent = await getMinimumBalanceForRentExemptMint(connection);

    // 1. Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: platformKeypair.publicKey,
        newAccountPubkey: mintPublicKey,
        space: MINT_SIZE,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize mint (6 decimals for standard tokens)
    transaction.add(
      createInitializeMintInstruction(
        mintPublicKey,
        6, // decimals
        platformKeypair.publicKey, // mint authority (temporary)
        null, // freeze authority (none)
        TOKEN_PROGRAM_ID
      )
    );

    // 3. Create associated token account for platform
    const platformTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      platformKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        platformKeypair.publicKey, // payer
        platformTokenAccount, // ata
        platformKeypair.publicKey, // owner
        mintPublicKey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 4. Mint initial supply to platform
    transaction.add(
      createMintToInstruction(
        mintPublicKey,
        platformTokenAccount,
        platformKeypair.publicKey,
        INITIAL_SUPPLY * Math.pow(10, 6), // Adjust for decimals
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 5. Transfer mint authority to bonding curve PDA
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mintPublicKey.toBuffer()],
      new PublicKey(BONDING_CURVE_PROGRAM_ID)
    );

    transaction.add(
      createSetAuthorityInstruction(
        mintPublicKey,
        platformKeypair.publicKey,
        AuthorityType.MintTokens,
        bondingCurvePDA,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Set recent blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformKeypair.publicKey;

    // Sign with both platform and mint keypairs
    transaction.sign(platformKeypair, mintKeypair);

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [platformKeypair, mintKeypair],
      {
        commitment: "confirmed",
        maxRetries: 3,
      }
    );

    console.log("Token created successfully:", {
      signature,
      mint: mintPublicKey.toBase58(),
    });

    // Store token in database
    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert({
        mint_address: mintPublicKey.toBase58(),
        name,
        symbol,
        description,
        image_url: image || null,
        creator_wallet: creatorWallet,
        bonding_curve_address: bondingCurvePDA.toBase58(),
        initial_supply: INITIAL_SUPPLY,
        decimals: 6,
        is_graduated: false,
        current_price: 0.00001, // Starting price
        market_cap: 0,
        volume_24h: 0,
        holders_count: 0,
        transactions_count: 1,
        liquidity_sol: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to store token: ${dbError.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        signature,
        mint: mintPublicKey.toBase58(),
        token,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating token:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to create token",
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});