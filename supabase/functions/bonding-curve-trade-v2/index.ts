// supabase/functions/bonding-curve-trade-v2/index.ts
// Handles buy/sell with achievement-based fee discounts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";
import BN from "https://esm.sh/bn.js@5.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

// Base fees in basis points (before achievement discounts)
const BASE_PLATFORM_FEE_BPS = 100;  // 1%
const BASE_CREATOR_FEE_BPS = 50;    // 0.5%
const BASE_LIQUIDITY_FEE_BPS = 20;  // 0.2%
const BASE_PRIZE_POOL_FEE_BPS = 10; // 0.1%
const BASE_TOTAL_FEE_BPS = 180;     // 1.8%

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const heliusKey = Deno.env.get("HELIUS_API_KEY") || "your-helius-key";
    const connection = new Connection(
      `https://devnet.helius-rpc.com/?api-key=${heliusKey}`,
      { commitment: "confirmed" }
    );

    const body = await req.json();
    const {
      tokenId,
      tradeType, // 'buy' or 'sell'
      amount, // SOL amount for buy, token amount for sell
      walletAddress,
      signedTransaction, // User's signed transaction
      minTokensOut, // For buy - slippage protection
      minSolOut, // For sell - slippage protection
    } = body;

    console.log(`Processing ${tradeType} for token ${tokenId}`);

    // Get token data including achievements
    const { data: token, error: tokenError } = await supabase
      .from("tokens")
      .select(`
        *,
        token_achievements (
          achievement_id,
          earned_at,
          achievement_definitions (
            name,
            icon,
            fee_discount_bps
          )
        )
      `)
      .eq("id", tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error("Token not found");
    }

    // Calculate dynamic fee based on achievements
    const feeDiscountBps = token.fee_discount_bps || 0;
    const effectiveTotalFeeBps = Math.max(BASE_TOTAL_FEE_BPS - feeDiscountBps, 50); // Min 0.5% fee
    
    // Proportionally reduce each fee component
    const feeReductionRatio = effectiveTotalFeeBps / BASE_TOTAL_FEE_BPS;
    const effectivePlatformFeeBps = Math.floor(BASE_PLATFORM_FEE_BPS * feeReductionRatio);
    const effectiveCreatorFeeBps = Math.floor(BASE_CREATOR_FEE_BPS * feeReductionRatio);
    const effectiveLiquidityFeeBps = Math.floor(BASE_LIQUIDITY_FEE_BPS * feeReductionRatio);
    const effectivePrizePoolFeeBps = Math.floor(BASE_PRIZE_POOL_FEE_BPS * feeReductionRatio);

    console.log(`Token has ${token.achievement_count} achievements, fee discount: ${feeDiscountBps} bps`);
    console.log(`Effective fee: ${effectiveTotalFeeBps / 100}%`);

    const programId = new PublicKey(BONDING_CURVE_PROGRAM_ID);
    const mintPubkey = new PublicKey(token.mint_address);
    const bondingCurvePubkey = new PublicKey(token.bonding_curve_address);
    const userPubkey = new PublicKey(walletAddress);

    // Get user's token account
    const userAta = await getAssociatedTokenAddress(
      mintPubkey,
      userPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get bonding curve's token account
    const curveAta = await getAssociatedTokenAddress(
      mintPubkey,
      bondingCurvePubkey,
      true, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const transaction = new Transaction();

    // Check if user ATA exists, create if not
    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userPubkey,
          userAta,
          userPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    if (tradeType === "buy") {
      // Calculate expected tokens out
      const solAmount = amount * LAMPORTS_PER_SOL;
      const totalFee = Math.floor((solAmount * effectiveTotalFeeBps) / 10_000);
      const solAfterFees = solAmount - totalFee;
      
      // Simple bonding curve calculation (you should match your program's logic)
      const currentVirtualSol = (token.virtual_sol_reserves + token.sol_raised) * LAMPORTS_PER_SOL;
      const currentVirtualTokens = (token.virtual_token_reserves - token.tokens_sold) * Math.pow(10, 6);
      const k = currentVirtualSol * currentVirtualTokens;
      const newVirtualSol = currentVirtualSol + solAfterFees;
      const newVirtualTokens = k / newVirtualSol;
      const tokensOut = Math.floor(currentVirtualTokens - newVirtualTokens);

      console.log(`Buy: ${amount} SOL -> ${tokensOut / Math.pow(10, 6)} tokens`);

      // Create buy instruction
      const buyInstruction = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: bondingCurvePubkey, isSigner: false, isWritable: true },
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: userAta, isSigner: false, isWritable: true },
          { pubkey: curveAta, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([1]), // Instruction index for buy
          new BN(solAmount).toArrayLike(Buffer, "le", 8),
          new BN(minTokensOut || 0).toArrayLike(Buffer, "le", 8),
        ]),
      });

      transaction.add(buyInstruction);

      // Update database with trade
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .insert({
          token_id: tokenId,
          trader_wallet: walletAddress,
          trade_type: "buy",
          sol_amount: amount,
          token_amount: tokensOut / Math.pow(10, 6),
          price_per_token: amount / (tokensOut / Math.pow(10, 6)),
          platform_fee: (totalFee * effectivePlatformFeeBps) / effectiveTotalFeeBps / LAMPORTS_PER_SOL,
          creator_fee: (totalFee * effectiveCreatorFeeBps) / effectiveTotalFeeBps / LAMPORTS_PER_SOL,
          effective_fee_bps: effectiveTotalFeeBps,
          achievement_discount_bps: feeDiscountBps,
        })
        .select()
        .single();

      if (tradeError) {
        console.error("Trade recording error:", tradeError);
      }

      // Update token stats
      await supabase
        .from("tokens")
        .update({
          sol_raised: token.sol_raised + solAfterFees / LAMPORTS_PER_SOL,
          tokens_sold: token.tokens_sold + tokensOut / Math.pow(10, 6),
          volume_24h: token.volume_24h + amount,
          transaction_count: token.transaction_count + 1,
          holder_count: token.holder_count + (userAtaInfo ? 0 : 1), // New holder if ATA didn't exist
        })
        .eq("id", tokenId);

      // Check for new achievements
      const { data: achievementResult } = await supabase
        .rpc("check_token_achievements", { p_token_id: tokenId });

      if (achievementResult?.new_achievements?.length > 0) {
        console.log("🏆 New achievements unlocked:", achievementResult.new_achievements);
      }

      // Check for graduation
      const newSolRaised = token.sol_raised + solAfterFees / LAMPORTS_PER_SOL;
      if (newSolRaised >= 85 && !token.is_graduated) {
        console.log("🎉 Token graduated!");
        await supabase
          .from("tokens")
          .update({ is_graduated: true })
          .eq("id", tokenId);
      }

      // Get recent blockhash and send
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      // Serialize for user to sign
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString("base64");

      return new Response(
        JSON.stringify({
          success: true,
          transaction: serializedTransaction,
          expectedTokens: tokensOut / Math.pow(10, 6),
          effectiveFee: effectiveTotalFeeBps / 100,
          achievements: token.token_achievements?.length || 0,
          newAchievements: achievementResult?.new_achievements || [],
          graduated: newSolRaised >= 85,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );

    } else if (tradeType === "sell") {
      // Sell logic (similar structure)
      const tokenAmount = amount * Math.pow(10, 6);
      
      // Calculate SOL out
      const currentVirtualSol = (token.virtual_sol_reserves + token.sol_raised) * LAMPORTS_PER_SOL;
      const currentVirtualTokens = (token.virtual_token_reserves - token.tokens_sold) * Math.pow(10, 6);
      const k = currentVirtualSol * currentVirtualTokens;
      const newVirtualTokens = currentVirtualTokens + tokenAmount;
      const newVirtualSol = k / newVirtualTokens;
      const solOutBeforeFees = Math.floor(currentVirtualSol - newVirtualSol);
      
      const totalFee = Math.floor((solOutBeforeFees * effectiveTotalFeeBps) / 10_000);
      const solOut = solOutBeforeFees - totalFee;

      console.log(`Sell: ${amount} tokens -> ${solOut / LAMPORTS_PER_SOL} SOL`);

      // Create sell instruction
      const sellInstruction = new TransactionInstruction({
        programId,
        keys: [
          { pubkey: bondingCurvePubkey, isSigner: false, isWritable: true },
          { pubkey: userPubkey, isSigner: true, isWritable: true },
          { pubkey: userAta, isSigner: false, isWritable: true },
          { pubkey: curveAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          Buffer.from([2]), // Instruction index for sell
          new BN(tokenAmount).toArrayLike(Buffer, "le", 8),
          new BN(minSolOut || 0).toArrayLike(Buffer, "le", 8),
        ]),
      });

      transaction.add(sellInstruction);

      // Record trade and update stats (similar to buy)
      // ... (implement similar to buy logic)

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = userPubkey;

      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString("base64");

      return new Response(
        JSON.stringify({
          success: true,
          transaction: serializedTransaction,
          expectedSol: solOut / LAMPORTS_PER_SOL,
          effectiveFee: effectiveTotalFeeBps / 100,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

  } catch (error) {
    console.error("Trade error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Trade failed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});