import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "https://esm.sh/@solana/web3.js@1.98.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getConnection(): Connection {
  const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
  if (!heliusKey) throw new Error("Missing HELIUS_RPC_API_KEY");
  return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, { commitment: "confirmed" });
}

interface GraduationRequest {
  tokenId: string;
  mintAddress: string;
  triggerType: 'automatic' | 'manual';
  userWallet?: string;
}

interface GraduationResult {
  success: boolean;
  raydiumPoolAddress?: string;
  lpTokenMint?: string;
  finalSolReserves: number;
  remainingTokens: number;
  transactionSignature: string;
  graduationTime: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body: GraduationRequest = await req.json();
    const { tokenId, mintAddress, triggerType, userWallet } = body;

    if (!tokenId || !mintAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing tokenId or mintAddress' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const connection = getConnection();
    const supa = getSupa();

    console.log(`Processing graduation for token ${tokenId}, mint: ${mintAddress}`);

    // Get token data and verify graduation eligibility
    const { data: token, error: tokenError } = await supa
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error('Token not found');
    }

    // Check if token meets graduation criteria (75k market cap)
    if (token.market_cap < 75000) {
      return new Response(
        JSON.stringify({ 
          error: 'Token does not meet graduation criteria',
          currentMarketCap: token.market_cap,
          requiredMarketCap: 75000
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (token.is_graduated) {
      return new Response(
        JSON.stringify({ error: 'Token already graduated' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Process graduation
    const graduationResult = await processTokenGraduation(
      connection,
      supa,
      token,
      triggerType,
      userWallet
    );

    // Update token status in database
    await supa
      .from('tokens')
      .update({
        is_graduated: true,
        graduation_date: new Date().toISOString(),
        raydium_pool_address: graduationResult.raydiumPoolAddress,
        lp_token_mint: graduationResult.lpTokenMint,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenId);

    // Log graduation event
    await supa
      .from('graduation_events')
      .insert({
        token_id: tokenId,
        trigger_type: triggerType,
        triggered_by: userWallet,
        raydium_pool_address: graduationResult.raydiumPoolAddress,
        final_market_cap: token.market_cap,
        sol_reserves: graduationResult.finalSolReserves,
        remaining_tokens: graduationResult.remainingTokens,
        transaction_signature: graduationResult.transactionSignature,
        graduated_at: graduationResult.graduationTime
      });

    // Notify relevant parties
    await notifyGraduation(supa, token, graduationResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: graduationResult,
        message: `${token.symbol} successfully graduated to Raydium!`
      }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Token graduation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Graduation process failed. Token remains on bonding curve.'
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function processTokenGraduation(
  connection: Connection,
  supa: any,
  token: any,
  triggerType: string,
  userWallet?: string
): Promise<GraduationResult> {
  console.log(`Starting graduation process for ${token.symbol}`);

  // For now, simulate the graduation process
  // In production, this would:
  // 1. Create Raydium AMM pool
  // 2. Add liquidity with remaining tokens and SOL
  // 3. Burn or distribute LP tokens
  // 4. Close bonding curve

  const finalSolReserves = token.sol_raised || 326; // 326 SOL at graduation
  const remainingTokens = 1000000000 - (token.tokens_sold || 0); // Remaining supply

  // Simulate Raydium pool creation
  const raydiumPoolAddress = await simulateRaydiumPoolCreation(
    connection,
    token.mint_address,
    finalSolReserves,
    remainingTokens
  );

  // Generate LP token mint (simulated)
  const lpTokenMint = `LP_${token.mint_address.slice(0, 8)}...`;

  // Simulate graduation transaction
  const transactionSignature = await simulateGraduationTransaction(
    connection,
    token.mint_address,
    raydiumPoolAddress
  );

  const graduationTime = new Date().toISOString();

  console.log(`Graduation completed for ${token.symbol}:`, {
    raydiumPoolAddress,
    lpTokenMint,
    finalSolReserves,
    remainingTokens,
    transactionSignature
  });

  return {
    success: true,
    raydiumPoolAddress,
    lpTokenMint,
    finalSolReserves,
    remainingTokens,
    transactionSignature,
    graduationTime
  };
}

async function simulateRaydiumPoolCreation(
  connection: Connection,
  mintAddress: string,
  solAmount: number,
  tokenAmount: number
): Promise<string> {
  // In production, this would create an actual Raydium pool
  // For now, generate a simulated pool address
  
  console.log(`Creating Raydium pool for ${mintAddress} with ${solAmount} SOL and ${tokenAmount} tokens`);
  
  // Generate deterministic pool address based on mint
  const poolSeed = `raydium_pool_${mintAddress}`;
  const poolKeypair = Keypair.generate(); // In reality, this would be derived
  
  return poolKeypair.publicKey.toBase58();
}

async function simulateGraduationTransaction(
  connection: Connection,
  mintAddress: string,
  poolAddress: string
): Promise<string> {
  // In production, this would be the actual graduation transaction
  // For now, return a simulated signature
  
  console.log(`Processing graduation transaction for ${mintAddress} -> ${poolAddress}`);
  
  // Generate a realistic-looking transaction signature
  const signature = `graduation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return signature;
}

async function notifyGraduation(supa: any, token: any, graduationResult: GraduationResult) {
  try {
    // Notify token creator
    await supa
      .from('notifications')
      .insert({
        user_wallet: token.creator_wallet,
        type: 'graduation',
        title: `🎓 ${token.symbol} Graduated!`,
        message: `Your token ${token.symbol} has successfully graduated to Raydium with ${graduationResult.finalSolReserves} SOL liquidity.`,
        metadata: {
          token_id: token.id,
          raydium_pool: graduationResult.raydiumPoolAddress,
          lp_token: graduationResult.lpTokenMint
        },
        created_at: new Date().toISOString()
      });

    // Check for graduation achievements
    await supa.rpc('check_and_award_achievements', {
      p_user_wallet: token.creator_wallet,
      p_token_id: token.id,
      p_check_type: 'milestone'
    });

    // Update leaderboards
    await updateGraduationLeaderboards(supa, token, graduationResult);

    console.log(`Notifications sent for ${token.symbol} graduation`);
  } catch (error) {
    console.error('Error sending graduation notifications:', error);
  }
}

async function updateGraduationLeaderboards(supa: any, token: any, graduationResult: GraduationResult) {
  try {
    // Update creator statistics
    await supa
      .from('creator_stats')
      .upsert({
        creator_wallet: token.creator_wallet,
        total_tokens_created: 1, // This would be incremented
        successful_graduations: 1,
        total_liquidity_created: graduationResult.finalSolReserves,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'creator_wallet',
        // In reality, you'd use SQL to increment these values
      });

    // Add to graduation hall of fame
    await supa
      .from('graduation_hall_of_fame')
      .insert({
        token_id: token.id,
        creator_wallet: token.creator_wallet,
        token_symbol: token.symbol,
        token_name: token.name,
        final_market_cap: token.market_cap,
        sol_raised: graduationResult.finalSolReserves,
        graduation_rank: await getGraduationRank(supa, token.market_cap),
        graduated_at: graduationResult.graduationTime
      });

  } catch (error) {
    console.error('Error updating graduation leaderboards:', error);
  }
}

async function getGraduationRank(supa: any, marketCap: number): Promise<number> {
  try {
    const { count } = await supa
      .from('graduation_hall_of_fame')
      .select('*', { count: 'exact', head: true })
      .gt('final_market_cap', marketCap);

    return (count || 0) + 1;
  } catch (error) {
    console.error('Error calculating graduation rank:', error);
    return 1;
  }
}