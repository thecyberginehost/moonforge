// supabase/functions/create-token/index.ts

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

interface CreateTokenRequest {
  name: string;
  symbol: string;
  decimals?: number;
  initialSupply?: number;
  receiver?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Use POST" }, 405);

    const body = (await req.json().catch(() => null)) as CreateTokenRequest | null;
    if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);

    const { name, symbol, decimals = 9, initialSupply = 0, receiver } = body;
    if (!name || !symbol) return jsonResponse({ error: "name and symbol required" }, 400);

    const connection = getConnection();
    const platform = getPlatformKeypair();

    // 1. Create mint account
    const mintKeypair = Keypair.generate();
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
      platform.publicKey, // revoke later
      TOKEN_PROGRAM_ID
    );

    const tx1 = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      createMintIx,
      initMintIx
    );
    tx1.feePayer = platform.publicKey;
    tx1.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx1.partialSign(mintKeypair, platform);

    const sigCreateMint = await sendAndConfirmTransaction(connection, tx1, [mintKeypair, platform], {
      commitment: "confirmed",
    });

    // 2. Optional initial mint
    let mintedTo: PublicKey | undefined;
    if (initialSupply > 0) {
      const dest = receiver ? new PublicKey(receiver) : platform.publicKey;

      const ata = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        dest,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const createAtaIx = createAssociatedTokenAccountInstruction(
        platform.publicKey,
        ata,
        dest,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const amount = BigInt(initialSupply) * (BigInt(10) ** BigInt(decimals));
      const mintToIx = createMintToInstruction(
        mintKeypair.publicKey,
        ata,
        platform.publicKey,
        amount
      );

      const tx2 = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
        createAtaIx,
        mintToIx
      );
      tx2.feePayer = platform.publicKey;
      tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx2.partialSign(platform);

      await sendAndConfirmTransaction(connection, tx2, [platform], { commitment: "confirmed" });
      mintedTo = ata;
    }

    // 3. Revoke mint & freeze authorities
    await setAuthority(connection, platform, mintKeypair.publicKey, platform.publicKey, AuthorityType.MintTokens, null);
    await setAuthority(connection, platform, mintKeypair.publicKey, platform.publicKey, AuthorityType.FreezeAccount, null);

    // 4. Insert token into database
    const supa = getSupa();
    const { error: insertErr } = await supa.from("tokens").insert({
      creator_wallet: (receiver ?? platform.publicKey).toBase58(),
      name,
      symbol,
      mint_address: mintKeypair.publicKey.toBase58(),
      total_supply: initialSupply,
      bonding_curve_address: null,
      platform_signature: sigCreateMint,
      signature_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
    if (insertErr) console.error("DB insert tokens failed", insertErr.message);

    return jsonResponse({
      success: true,
      mint: mintKeypair.publicKey.toBase58(),
      name,
      symbol,
      decimals,
      initialSupply,
      mintedTo: mintedTo?.toBase58() ?? null,
      tx: { createMint: sigCreateMint },
      authoritiesRevoked: true,
    });
  } catch (err: any) {
    console.error("ERR:create-token", err?.message, err?.stack, err?.logs);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
