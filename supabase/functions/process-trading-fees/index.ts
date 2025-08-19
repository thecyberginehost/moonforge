import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradingFeeRequest {
  tokenId: string;
  transactionType: 'buy' | 'sell';
  tradeAmount: number;
  traderWallet: string;
  totalFeeAmount: number; // 2% of trade amount
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { tokenId, transactionType, tradeAmount, traderWallet, totalFeeAmount }: TradingFeeRequest = await req.json();

    console.log(`Processing ${transactionType} fees for token ${tokenId}:`, {
      tradeAmount,
      totalFeeAmount,
      traderWallet
    });

    // Get token details and creator
    const { data: token, error: tokenError } = await supabaseClient
      .from('tokens')
      .select('creator_wallet')
      .eq('id', tokenId)
      .single();

    if (tokenError || !token) {
      throw new Error(`Token not found: ${tokenError?.message}`);
    }

    // Calculate fee distribution (based on 2% total fee)
    const platformFee = totalFeeAmount * 0.5;    // 1% of trade (50% of total fee)
    const creatorFee = totalFeeAmount * 0.35;    // 0.7% of trade (35% of total fee)
    const communityFee = totalFeeAmount * 0.1;   // 0.2% of trade (10% of total fee)
    const liquidityFee = totalFeeAmount * 0.05;  // 0.1% of trade (5% of total fee)

    console.log('Fee distribution:', {
      platformFee,
      creatorFee,
      communityFee,
      liquidityFee,
      total: platformFee + creatorFee + communityFee + liquidityFee
    });

    // Wallet addresses for different fee purposes
    const platformWallet = Deno.env.get('PLATFORM_WALLET_ADDRESS');
    const communityWallet = Deno.env.get('COMMUNITY_WALLET_ADDRESS');
    const liquidityWallet = Deno.env.get('LIQUIDITY_WALLET_ADDRESS');
    
    if (!platformWallet) {
      console.warn('Platform wallet address not configured');
    }
    if (!communityWallet) {
      console.warn('Community wallet address not configured');
    }
    if (!liquidityWallet) {
      console.warn('Liquidity wallet address not configured');
    }

    try {
      // 1. Log the fee transaction
      const { error: feeLogError } = await supabaseClient
        .from('fee_transactions')
        .insert({
          token_id: tokenId,
          transaction_type: transactionType,
          total_fee: totalFeeAmount,
          platform_fee: platformFee,
          creator_fee: creatorFee,
          community_fee: communityFee,
          liquidity_fee: liquidityFee,
          creator_wallet: token.creator_wallet,
          trader_wallet: traderWallet,
          trade_amount: tradeAmount
        });

      if (feeLogError) {
        throw new Error(`Failed to log fee transaction: ${feeLogError.message}`);
      }

      // 2. Update or create creator earnings
      const { error: creatorEarningsError } = await supabaseClient
        .from('creator_earnings')
        .upsert({
          creator_wallet: token.creator_wallet,
          token_id: tokenId,
          total_earned: creatorFee,
          claimable_amount: creatorFee
        }, {
          onConflict: 'creator_wallet,token_id',
          ignoreDuplicates: false
        });

      if (creatorEarningsError) {
        throw new Error(`Failed to update creator earnings: ${creatorEarningsError.message}`);
      }

      // 3. Update or create community rewards pool
      const { error: communityRewardsError } = await supabaseClient
        .from('community_rewards')
        .upsert({
          token_id: tokenId,
          total_pool: communityFee,
          remaining_pool: communityFee
        }, {
          onConflict: 'token_id',
          ignoreDuplicates: false
        });

      if (communityRewardsError) {
        throw new Error(`Failed to update community rewards: ${communityRewardsError.message}`);
      }

      // 4. Update token volume statistics
      const { error: tokenUpdateError } = await supabaseClient
        .from('tokens')
        .update({
          volume_24h: tradeAmount // This should accumulate in real implementation
        })
        .eq('id', tokenId);

      if (tokenUpdateError) {
        console.warn(`Failed to update token volume: ${tokenUpdateError.message}`);
      }

      console.log(`Successfully processed fees for ${transactionType} transaction`);

      return new Response(
        JSON.stringify({
          success: true,
          fees: {
            platform: platformFee,
            creator: creatorFee,
            community: communityFee,
            liquidity: liquidityFee
          },
          creatorWallet: token.creator_wallet
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (error) {
      console.error('Error processing fees:', error);
      throw error;
    }

  } catch (error) {
    console.error('Fee processing error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});