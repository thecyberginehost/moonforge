import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  AccountMeta,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bonding curve constants
const BONDING_CURVE_CONFIG = {
  VIRTUAL_SOL_RESERVES: 30,
  VIRTUAL_TOKEN_RESERVES: 1073000000,
  GRADUATION_THRESHOLD: 85000,
};

/**
 * Get bonding curve PDA
 */
function getBondingCurvePDA(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    programId
  );
}

/**
 * Calculate tokens for SOL using bonding curve formula
 */
function calculateBuy(solIn: number, solRaised: number, tokensSold: number): {
  tokensOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
  marketCapAfter: number;
} {
  const currentVirtualSol = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - tokensSold;

  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;

  const newSolRaised = solRaised + solIn;
  const newTokensSold = tokensSold + tokensOut;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * 1000000000; // 1B total supply

  return {
    tokensOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

serve(async (req) => {
  console.log('=== PLATFORM TRADE ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      tokenId, 
      tradeType, // 'buy' only for initial investment
      amount, // SOL amount
      creatorWallet
    } = await req.json();

    console.log('Processing platform trade:', { tokenId, tradeType, amount, creatorWallet });

    // Validate inputs
    if (!tokenId || !tradeType || !amount || !creatorWallet) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (tradeType !== 'buy') {
      return new Response(
        JSON.stringify({ error: 'Platform trades only support buy operations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get token data
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      return new Response(
        JSON.stringify({ error: 'Token not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check graduation status
    if (token.is_graduated) {
      return new Response(
        JSON.stringify({ error: 'Token has graduated to Raydium' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get configuration
    const { data: programId } = await supabase.rpc('get_active_program_id');
    const realProgramId = programId || '11111111111111111111111111111111';

    if (realProgramId === '11111111111111111111111111111111') {
      // Simulate the trade for now
      const trade = calculateBuy(amount, token.sol_raised || 0, token.tokens_sold || 0);
      
      // Update token state in database
      const { error: updateError } = await supabase
        .from('tokens')
        .update({
          sol_raised: trade.newSolRaised,
          tokens_sold: trade.newTokensSold,
          market_cap: trade.marketCapAfter,
          price: trade.priceAfter,
          is_graduated: trade.marketCapAfter >= 100000,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenId);

      if (updateError) {
        console.error('Database update error:', updateError);
      }

      // Record trading activity
      await supabase.from('trading_activities').insert({
        token_id: tokenId,
        user_wallet: creatorWallet,
        activity_type: 'buy',
        amount_sol: amount,
        token_amount: trade.tokensOut,
        token_price: trade.priceAfter,
        market_cap_at_time: trade.marketCapAfter,
      });

      console.log('✅ Platform buy simulation completed');

      return new Response(
        JSON.stringify({
          success: true,
          simulated: true,
          trade: {
            type: 'buy',
            solIn: amount,
            tokensOut: trade.tokensOut,
            priceAfter: trade.priceAfter,
            marketCapAfter: trade.marketCapAfter,
          },
          message: 'Initial investment simulated (contract not deployed)',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implement actual platform trade when contract is deployed
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Platform trades not yet implemented for deployed contracts'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 501 }
    );

  } catch (error) {
    console.error('=== PLATFORM TRADE ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute platform trade', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});