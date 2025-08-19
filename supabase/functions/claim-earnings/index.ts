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

interface ClaimRequest {
  creatorWallet: string;
  tokenId?: string; // Optional - claim for specific token or all
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

    const { creatorWallet, tokenId }: ClaimRequest = await req.json();

    if (!creatorWallet) {
      return new Response(
        JSON.stringify({ error: 'Creator wallet address required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing claim for creator: ${creatorWallet}`);

    // Get claimable earnings
    let query = supabase
      .from('creator_earnings')
      .select('*')
      .eq('creator_wallet', creatorWallet)
      .gt('claimable_amount', 0);

    if (tokenId) {
      query = query.eq('token_id', tokenId);
    }

    const { data: earnings, error: earningsError } = await query;

    if (earningsError) {
      console.error('Error fetching earnings:', earningsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch earnings' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!earnings || earnings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No claimable earnings found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const totalClaimable = earnings.reduce((sum, earning) => sum + Number(earning.claimable_amount), 0);

    if (totalClaimable <= 0) {
      return new Response(
        JSON.stringify({ error: 'No claimable amount available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Connect to Solana using Alchemy RPC
    const rpcUrl = Deno.env.get('ALCHEMY_RPC_URL') || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Platform wallet (should be stored as secret or config)
    const platformWalletKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY');
    if (!platformWalletKey) {
      console.error('Platform wallet private key not configured');
      return new Response(
        JSON.stringify({ error: 'Platform wallet not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const platformWallet = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(platformWalletKey))
    );
    
    try {
      // Create transfer transaction
      const creatorPublicKey = new PublicKey(creatorWallet);
      const lamports = Math.floor(totalClaimable * 1_000_000_000); // Convert SOL to lamports
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: platformWallet.publicKey,
          toPubkey: creatorPublicKey,
          lamports: lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = platformWallet.publicKey;

      // Sign and send transaction
      transaction.sign(platformWallet);
      const signature = await connection.sendRawTransaction(transaction.serialize());
      
      // Confirm transaction
      await connection.confirmTransaction(signature);

      console.log(`Earnings claimed successfully. Signature: ${signature}`);

      // Update database - mark as claimed
      const updatePromises = earnings.map(earning => 
        supabase
          .from('creator_earnings')
          .update({
            total_claimed: Number(earning.total_claimed) + Number(earning.claimable_amount),
            claimable_amount: 0,
            last_claim_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', earning.id)
      );

      await Promise.all(updatePromises);

      return new Response(
        JSON.stringify({
          success: true,
          transaction: {
            signature,
            amount: totalClaimable,
            timestamp: new Date().toISOString(),
          },
          message: `Successfully claimed ${totalClaimable} SOL`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to process payment',
          details: transactionError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in claim-earnings:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});