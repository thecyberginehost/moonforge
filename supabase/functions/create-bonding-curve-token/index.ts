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
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  setAuthority,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "https://esm.sh/@solana/spl-token@0.4.6";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ---------- Helpers ----------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getConnection(): Connection {
  const heliusKey = getEnv("HELIUS_RPC_API_KEY");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

function getPlatformKeypair(): Keypair {
  const raw = getEnv("PLATFORM_WALLET_PRIVATE_KEY").trim();
  const secret = bs58.decode(raw);
  if (secret.length !== 64) throw new Error("PLATFORM_WALLET_PRIVATE_KEY length invalid");
  return Keypair.fromSecretKey(secret);
}

// Generate vanity address with "moon" suffix
function generateVanityKeypair(suffix: string, maxAttempts: number = 50000): { keypair: Keypair; attempts: number } | null {
  const targetSuffix = suffix.toLowerCase();
  
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58().toLowerCase();
    
    if (address.endsWith(targetSuffix)) {
      console.log(`✨ Generated vanity address ending in "${suffix}" after ${attempts} attempts: ${keypair.publicKey.toBase58()}`);
      return { keypair, attempts };
    }
    
    // Log progress every 10k attempts
    if (attempts % 10000 === 0) {
      console.log(`🔄 Vanity generation progress: ${attempts}/${maxAttempts} attempts for suffix "${suffix}"`);
    }
  }
  
  console.warn(`⚠️ Could not generate vanity address with suffix "${suffix}" after ${maxAttempts} attempts`);
  return null;
}

// ---------- Request Types ----------
interface CreateCurveTokenRequest {
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string;
  telegram?: string;
  twitter?: string;
  creatorWallet: string;
  signedTransaction?: any;
  initialBuyIn?: number;
  decimals?: number;
  totalSupply?: number;
  curveConfig?: {
    startingPriceLamports?: number;
    slopeBps?: number;
    feeBps?: number;
  };
}

// ---------- Main ----------
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    const body = (await req.json().catch(() => null)) as CreateCurveTokenRequest | null;
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { 
      name, 
      symbol, 
      description,
      imageUrl,
      telegram,
      twitter,
      creatorWallet,
      initialBuyIn = 0,
      decimals = 9, 
      totalSupply = 1000000000, 
      curveConfig = {} 
    } = body;
    
    if (!name || !symbol || !creatorWallet) {
      return jsonResponse({ error: "name, symbol, and creatorWallet required" }, 400);
    }

    const connection = getConnection();
    const platform = getPlatformKeypair();

    // 1. Generate vanity mint address with "moon" suffix
    console.log(`🌙 Generating vanity address with "moon" suffix for token: ${name}`);
    const vanityResult = generateVanityKeypair("moon", 50000);
    
    let mintKeypair: Keypair;
    let platformIdentifier: string | null = null;
    let vanityGeneration: { attempts?: number; fallback?: boolean } = {};
    
    if (vanityResult) {
      mintKeypair = vanityResult.keypair;
      platformIdentifier = "moon";
      vanityGeneration.attempts = vanityResult.attempts;
      console.log(`✨ Successfully generated MoonForge vanity address: ${mintKeypair.publicKey.toBase58()}`);
    } else {
      // Fallback to regular generation if vanity fails
      mintKeypair = Keypair.generate();
      vanityGeneration.fallback = true;
      console.log(`⚠️ Fallback to regular address generation: ${mintKeypair.publicKey.toBase58()}`);
    }
    
    const rentLamports = await getMinimumBalanceForRentExemptMint(connection);

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: platform.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintIx = createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      platform.publicKey,
      platform.publicKey, // freeze authority initially
      TOKEN_PROGRAM_ID
    );

    // 2. Get dynamic program ID from database
    const supa = getSupa();
    const { data: progRow, error: progErr } = await supa
      .from("program_config")
      .select("program_id")
      .eq("program_name", "bonding_curve")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
      
    if (progErr) {
      console.error("program_config fetch failed:", progErr);
      throw new Error(`program_config fetch failed: ${progErr.message}`);
    }

    if (!progRow) {
      console.error("No active bonding_curve program_config found");
      throw new Error("No active bonding_curve program configuration found");
    }
    const BONDING_PROGRAM_ID = new PublicKey(progRow.program_id);
    
    // Use correct PDA seeds matching the contract
    const [bondingCurvePda] = await PublicKey.findProgramAddress(
      [new TextEncoder().encode("bonding_curve"), mintKeypair.publicKey.toBuffer()],
      BONDING_PROGRAM_ID
    );

    // 2a. Curve ATA owned by bonding curve PDA
    const curveAta = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePda,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const createCurveAtaIx = createAssociatedTokenAccountInstruction(
      platform.publicKey, // payer
      curveAta,
      bondingCurvePda,
      mintKeypair.publicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 3. Create initialize curve instruction
    // Note: This will need to be implemented once the contract is deployed
    const virtualSolReserves = 30 * 1_000_000_000; // 30 SOL in lamports
    const virtualTokenReserves = BigInt(800_000_000) * (BigInt(10) ** BigInt(decimals)); // 800M tokens
    const bondingCurveSupply = BigInt(totalSupply) * (BigInt(10) ** BigInt(decimals));
    
    // TODO: Create actual initialize_curve instruction when contract is deployed
    // const initCurveIx = await createInitializeCurveInstruction({
    //   bondingCurve: bondingCurvePda,
    //   mint: mintKeypair.publicKey,
    //   curveTokenAccount: curveAta,
    //   creator: new PublicKey(creatorWallet),
    //   virtualSolReserves,
    //   virtualTokenReserves: Number(virtualTokenReserves),
    //   bondingCurveSupply: Number(bondingCurveSupply)
    // });

    // 4. Build & send tx (without curve initialization for now)
    const instructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      createMintIx,
      initMintIx,
      createCurveAtaIx,
      // TODO: Add initCurveIx when contract is deployed
    ];

    const tx = new Transaction().add(...instructions);
    tx.feePayer = platform.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.partialSign(mintKeypair, platform);

    const sig = await sendAndConfirmTransaction(connection, tx, [mintKeypair, platform], {
      commitment: "confirmed",
    });

    // 5. Insert token into database with platform identifier
    const { data: tokenData, error: upsertErr } = await supa.from("tokens").upsert({
      creator_wallet: creatorWallet,
      name,
      symbol,
      description: description || `A new token created with Moonforge`,
      image_url: imageUrl,
      telegram_url: telegram,
      x_url: twitter,
      mint_address: mintKeypair.publicKey.toBase58(),
      total_supply: totalSupply,
      bonding_curve_address: bondingCurvePda.toBase58(),
      platform_signature: sig,
      signature_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      platform_identifier: platformIdentifier
    }, { onConflict: "mint_address" }).select().single();
    
    if (upsertErr) {
      console.error("DB upsert tokens failed", upsertErr.message);
      throw new Error(`Database error: ${upsertErr.message}`);
    }

    // 6. Revoke authorities
    await setAuthority(connection, platform, mintKeypair.publicKey, platform.publicKey, AuthorityType.MintTokens, null);
    await setAuthority(connection, platform, mintKeypair.publicKey, platform.publicKey, AuthorityType.FreezeAccount, null);

    let initialTradeResult = null;
    
    // 7. Execute initial buy if specified
    if (initialBuyIn > 0 && tokenData?.id) {
      console.log(`Executing initial buy of ${initialBuyIn} SOL for creator`);
      
      try {
        // Call the platform trade function for the initial buy
        const tradeResponse = await supa.functions.invoke('platform-trade', {
          body: {
            tokenId: tokenData.id,
            tradeType: 'buy',
            amount: initialBuyIn,
            creatorWallet: creatorWallet
          }
        });

        if (tradeResponse.error) {
          console.error("Initial buy failed:", tradeResponse.error);
          // Don't fail the token creation, just log the error
          initialTradeResult = { error: tradeResponse.error.message };
        } else {
          console.log("Initial buy successful");
          initialTradeResult = tradeResponse.data;
        }
      } catch (tradeError: any) {
        console.error("Initial buy execution failed:", tradeError);
        initialTradeResult = { error: tradeError.message };
      }
    }

    return jsonResponse({
      success: true,
      token: tokenData,
      mint: mintKeypair.publicKey.toBase58(),
      bondingCurvePda: bondingCurvePda.toBase58(),
      curveAta: curveAta.toBase58(),
      name,
      symbol,
      decimals,
      totalSupply,
      curveConfig,
      txSig: sig,
      authoritiesRevoked: true,
      initialBuyIn,
      initialTradeResult,
      requiresSignature: false, // Token is created, no additional signature needed
      platformIdentifier,
      vanityGeneration
    });
  } catch (err: any) {
    console.error("ERR:create-bonding-curve-token", err?.message, err?.stack, err?.logs);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
