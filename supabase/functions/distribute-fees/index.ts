import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
  Keypair,
} from "https://esm.sh/@solana/web3.js@1.98.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeeDistributionRequest {
  tokenId: string;
  totalFeeAmount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tokenId, totalFeeAmount }: FeeDistributionRequest = await req.json();

    console.log(`Distributing platform fees for token ${tokenId}: ${totalFeeAmount} SOL`);

    // Get accumulated platform fees for this token
    const { data: feeTransactions, error: feeError } = await supabase
      .from('fee_transactions')
      .select('*')
      .eq('token_id', tokenId);

    if (feeError) {
      console.error('Error fetching fee transactions:', feeError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch fee data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Calculate accumulated fees by type
    const totalPlatformFees = feeTransactions.reduce((sum, tx) => sum + Number(tx.platform_fee), 0);
    const totalCommunityFees = feeTransactions.reduce((sum, tx) => sum + Number(tx.community_fee), 0);
    const totalLiquidityFees = feeTransactions.reduce((sum, tx) => sum + Number(tx.liquidity_fee), 0);

    console.log('Accumulated fees:', {
      platform: totalPlatformFees,
      community: totalCommunityFees,
      liquidity: totalLiquidityFees
    });

    // Get wallet addresses
    const platformWalletKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY');
    const communityWallet = Deno.env.get('COMMUNITY_WALLET_ADDRESS');
    const liquidityWallet = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');

    if (!platformWalletKey || !communityWallet || !liquidityWallet) {
      console.error('Missing wallet configurations');
      return new Response(
        JSON.stringify({ error: 'Wallet configurations missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const platformWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(platformWalletKey))
    );

    const rpcUrl = Deno.env.get('ALCHEMY_RPC_URL') || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');

    try {
      const transactions = [];

      // Transfer community fees to community wallet
      if (totalCommunityFees > 0.001) { // Only transfer if significant amount
        const communityLamports = Math.floor(totalCommunityFees * 1_000_000_000);
        const communityTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: platformWallet.publicKey,
            toPubkey: new PublicKey(communityWallet),
            lamports: communityLamports,
          })
        );
        transactions.push({ tx: communityTx, type: 'community', amount: totalCommunityFees });
      }

      // Transfer liquidity fees to liquidity wallet
      if (totalLiquidityFees > 0.001) { // Only transfer if significant amount
        const liquidityLamports = Math.floor(totalLiquidityFees * 1_000_000_000);
        const liquidityTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: platformWallet.publicKey,
            toPubkey: new PublicKey(liquidityWallet),
            lamports: liquidityLamports,
          })
        );
        transactions.push({ tx: liquidityTx, type: 'liquidity', amount: totalLiquidityFees });
      }

      // Execute transactions
      const signatures = [];
      for (const { tx, type, amount } of transactions) {
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = platformWallet.publicKey;
        
        tx.sign(platformWallet);
        const signature = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(signature);
        
        signatures.push({ signature, type, amount });
        console.log(`${type} fees distributed: ${amount} SOL, signature: ${signature}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          distributions: signatures,
          totalDistributed: totalCommunityFees + totalLiquidityFees,
          message: `Successfully distributed fees to community and liquidity pools`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to distribute fees',
          details: transactionError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in distribute-fees:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});