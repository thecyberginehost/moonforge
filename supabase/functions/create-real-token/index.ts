// supabase/functions/create-real-token/index.ts
// Production-ready token creation on Solana devnet/mainnet

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
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
  createSetAuthorityInstruction,
  AuthorityType,
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
    
    // Use Helius RPC for better reliability
    const heliusKey = Deno.env.get("HELIUS_API_KEY");
    const network = Deno.env.get("SOLANA_NETWORK") || "devnet";
    const rpcUrl = heliusKey 
      ? `https://${network}.helius-rpc.com/?api-key=${heliusKey}`
      : `https://api.${network}.solana.com`;
    
    const connection = new Connection(rpcUrl, "confirmed");
    
    // Get platform wallet from environment
    const platformPrivateKey = Deno.env.get("PLATFORM_WALLET_PRIVATE_KEY");
    if (!platformPrivateKey) {
      throw new Error("Platform wallet not configured. Set PLATFORM_WALLET_PRIVATE_KEY environment variable.");
    }
    
    const decoded = bs58.decode(platformPrivateKey);
    const platformWallet = Keypair.fromSecretKey(decoded);
    
    // Check platform wallet balance
    const balance = await connection.getBalance(platformWallet.publicKey);
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      throw new Error(`Insufficient platform wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
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
      website,
      creatorWallet,
      initialBuyIn = 0,
    } = body;

    // Validate inputs
    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, creatorWallet");
    }

    // Validate creator wallet address
    let creatorPubkey: PublicKey;
    try {
      creatorPubkey = new PublicKey(creatorWallet);
    } catch {
      throw new Error("Invalid creator wallet address");
    }

    console.log("Creating token on", network, ":", { name, symbol });

    // Generate a new mint keypair
    const mintKeypair = Keypair.generate();
    const decimals = 6;
    const totalSupply = 1_000_000_000; // 1B tokens
    const bondingCurveSupply = 793_100_000; // 793.1M for curve
    const creatorSupply = totalSupply - bondingCurveSupply; // 206.9M for creator
    
    // Calculate rent
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    // Get bonding curve PDA
    const programId = new PublicKey(BONDING_CURVE_PROGRAM_ID);
    const [bondingCurvePda, bump] = PublicKey.findProgramAddressSync(
      [
        new TextEncoder().encode("bonding_curve"),
        mintKeypair.publicKey.toBuffer()
      ],
      programId
    );
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add priority fees for faster processing
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5_000 })
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
    
    // 2. Initialize mint (platform as temporary authority)
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        platformWallet.publicKey, // temporary mint authority
        null, // no freeze authority (trustless)
        TOKEN_PROGRAM_ID
      )
    );
    
    // 3. Create ATA for bonding curve
    const curveAta = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePda,
      true, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        platformWallet.publicKey,
        curveAta,
        bondingCurvePda,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    // 4. Create ATA for creator
    const creatorAta = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      creatorPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        platformWallet.publicKey,
        creatorAta,
        creatorPubkey,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    // 5. Mint tokens to bonding curve
    const curveSupply = BigInt(bondingCurveSupply) * BigInt(10 ** decimals);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        curveAta,
        platformWallet.publicKey,
        curveSupply,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // 6. Mint remaining tokens to creator
    const creatorMintAmount = BigInt(creatorSupply) * BigInt(10 ** decimals);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        creatorAta,
        platformWallet.publicKey,
        creatorMintAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // 7. CRITICAL: Revoke mint authority (make it trustless)
    transaction.add(
      createSetAuthorityInstruction(
        mintKeypair.publicKey,
        platformWallet.publicKey,
        AuthorityType.MintTokens,
        null, // Revoke by setting to null
        [],
        TOKEN_PROGRAM_ID
      )
    );
    
    // 8. Initialize bonding curve
    const initCurveInstruction = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: bondingCurvePda, isSigner: false, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: creatorPubkey, isSigner: false, isWritable: true },
        { pubkey: curveAta, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: new Uint8Array([
        0, // Instruction index for initialize_curve
        bump, // Pass the bump seed
      ]),
    });
    
    transaction.add(initCurveInstruction);
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformWallet.publicKey;
    
    // Sign with both wallets
    transaction.sign(platformWallet, mintKeypair);
    
    // Send with retries for production reliability
    let signature: string;
    let retries = 3;
    
    while (retries > 0) {
      try {
        signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [platformWallet, mintKeypair],
          {
            commitment: "confirmed",
            preflightCommitment: "processed",
            maxRetries: 3,
          }
        );
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`Retry ${3 - retries}/3...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log("✅ Token created successfully!");
    console.log("Mint:", mintKeypair.publicKey.toString());
    console.log("Bonding Curve:", bondingCurvePda.toString());
    console.log("Transaction:", signature!);
    
    // Generate logo if not provided
    const logoUrl = imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    
    // Save to database
    const tokenData = {
      mint_address: mintKeypair.publicKey.toString(),
      bonding_curve_address: bondingCurvePda.toString(),
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} - Launching on MoonForge`,
      image_url: logoUrl,
      twitter_url: twitter,
      telegram_url: telegram,
      website_url: website,
      
      // Initial state
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: bondingCurveSupply,
      token_supply: totalSupply,
      tokens_sold: 0,
      sol_raised: 0,
      
      // Price calculation
      current_price: 0.000000028, // 30 SOL / 1.073B tokens
      market_cap: 0,
      volume_24h: 0,
      holder_count: 1, // Creator starts with tokens
      transaction_count: 0,
      
      // Status
      is_active: true,
      is_graduated: false,
      graduation_threshold: 85, // 85 SOL
      
      // Security
      mint_authority_revoked: true,
      freeze_authority_revoked: true,
      
      // Platform info
      platform_signature: signature!,
      network,
      
      // Achievement system ready
      achievement_count: 0,
      achievement_points: 0,
      fee_discount_bps: 0,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert(tokenData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error (token created on-chain):", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: token || tokenData,
        mint: mintKeypair.publicKey.toString(),
        bondingCurve: bondingCurvePda.toString(),
        transaction: signature!,
        explorer: `https://explorer.solana.com/tx/${signature}?cluster=${network}`,
        mintExplorer: `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=${network}`,
        security: {
          mintAuthorityRevoked: true,
          freezeAuthorityRevoked: true,
          trustless: true,
        },
        message: "Token created successfully on Solana!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
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