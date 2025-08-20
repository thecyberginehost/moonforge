// supabase/functions/create-real-token/index.ts
// This ACTUALLY creates tokens on Solana devnet

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
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
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Your deployed bonding curve program
const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize connections
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Connect to Solana devnet (or use Helius)
    const rpcUrl = Deno.env.get("HELIUS_RPC_URL") || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    
    // Get platform wallet (you need to set this as an environment variable)
    const platformPrivateKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");
    if (!platformPrivateKey) {
      // For testing, create a temporary wallet (NOT for production!)
      console.warn("No platform wallet found, using temporary wallet");
      const tempWallet = Keypair.generate();
      
      // Request airdrop for testing
      const airdropSig = await connection.requestAirdrop(
        tempWallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSig);
      
      var platformWallet = tempWallet;
    } else {
      const decoded = bs58.decode(platformPrivateKey);
      var platformWallet = Keypair.fromSecretKey(decoded);
    }
    
    // Parse request
    const body = await req.json();
    const {
      name,
      symbol,
      description,
      imageUrl,
      telegram,
      twitter,
      creatorWallet,
      initialBuyIn = 0,
    } = body;

    console.log("Creating REAL token on devnet:", { name, symbol });

    // Generate a new mint keypair
    const mintKeypair = Keypair.generate();
    const decimals = 6;
    const supply = 1_000_000_000; // 1B tokens
    
    // Calculate rent
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add priority fee
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 })
    );
    
    // 1. Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: platformWallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      })
    );
    
    // 2. Initialize mint (platform wallet as authority for now)
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        platformWallet.publicKey, // mint authority
        platformWallet.publicKey, // freeze authority
        TOKEN_PROGRAM_ID
      )
    );
    
    // 3. Get bonding curve PDA
    const programId = new PublicKey(BONDING_CURVE_PROGRAM_ID);
    const [bondingCurvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mintKeypair.publicKey.toBuffer()],
      programId
    );
    
    // 4. Create associated token account for bonding curve
    const curveAta = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePda,
      true, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        platformWallet.publicKey, // payer
        curveAta, // ata
        bondingCurvePda, // owner
        mintKeypair.publicKey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    // 5. Mint initial supply to bonding curve
    const mintAmount = BigInt(793_100_000) * BigInt(10 ** decimals); // 793.1M tokens
    
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        curveAta,
        platformWallet.publicKey,
        mintAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // 6. Initialize bonding curve (call your program)
    const initCurveInstruction = {
      programId,
      keys: [
        { pubkey: bondingCurvePda, isSigner: false, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: new PublicKey(creatorWallet), isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        0, // Instruction discriminator for initialize_curve
        ...Buffer.from(new Uint8Array(new BigUint64Array([BigInt(30 * LAMPORTS_PER_SOL)]).buffer)), // virtual_sol_reserves
        ...Buffer.from(new Uint8Array(new BigUint64Array([BigInt(1_073_000_000 * 10 ** decimals)]).buffer)), // virtual_token_reserves
        ...Buffer.from(new Uint8Array(new BigUint64Array([mintAmount]).buffer)), // bonding_curve_supply
      ]),
    };
    
    transaction.add(initCurveInstruction);
    
    // Sign and send transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformWallet.publicKey;
    
    // Sign with both platform wallet and mint keypair
    transaction.sign(platformWallet, mintKeypair);
    
    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [platformWallet, mintKeypair],
      { commitment: "confirmed" }
    );
    
    console.log("Token created! Mint:", mintKeypair.publicKey.toString());
    console.log("Transaction:", signature);
    
    // Generate logo if not provided
    const logoUrl = imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    
    // Save to database
    const tokenData = {
      mint_address: mintKeypair.publicKey.toString(),
      bonding_curve_address: bondingCurvePda.toString(),
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} - Created on MoonForge`,
      image_url: logoUrl,
      twitter_url: twitter,
      telegram_url: telegram,
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: 793100000,
      token_supply: 1000000000,
      current_price: 0.00000003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 0,
      transaction_count: 0,
      is_active: true,
      is_graduated: false,
      platform_signature: signature,
      created_at: new Date().toISOString(),
    };

    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert(tokenData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Token was created on-chain, still return success
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: token || tokenData,
        mintAddress: mintKeypair.publicKey.toString(),
        bondingCurve: bondingCurvePda.toString(),
        transaction: signature,
        explorer: `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=devnet`,
        message: "Token created successfully on Solana!",
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
        error: error.message || "Failed to create token",
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});