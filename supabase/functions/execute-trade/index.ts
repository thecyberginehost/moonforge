
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from "https://esm.sh/@solana/web3.js@1.98.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  tokenId: string;
  tradeType: 'buy' | 'sell';
  amount: number; // SOL amount for buy, token amount for sell
  walletAddress: string;
  slippage?: number; // percentage, default 5%
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

    const { tokenId, tradeType, amount, walletAddress, slippage = 5 }: TradeRequest = await req.json();

    if (!tokenId || !tradeType || !amount || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Processing ${tradeType} trade:`, { tokenId, amount, walletAddress });

    // Get token details and validate it's app-created
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

    // Only validate that we have a valid mint address (tokens created through our platform)
    if (!token.mint_address) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid token', 
          message: 'Token must have a valid mint address to be tradeable.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check if token has graduated to external DEX (market cap >= 100k)
    const hasGraduated = token.market_cap >= 100000;
    if (hasGraduated) {
      return new Response(
        JSON.stringify({ 
          error: 'Token graduated', 
          message: 'This token has graduated to Raydium. Please trade on external exchanges.',
          graduationInfo: {
            marketCap: token.market_cap,
            mintAddress: token.mint_address,
            suggestedDex: 'Raydium'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Connect to Solana using Alchemy RPC
    const rpcUrl = Deno.env.get('ALCHEMY_RPC_URL') || clusterApiUrl('devnet');
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Calculate trade parameters
    let tradeAmount: number;
    let tokensReceived: number = 0;
    let solReceived: number = 0;

    if (tradeType === 'buy') {
      tradeAmount = amount; // SOL amount
      // Mock price calculation - in production, get from AMM/DEX
      const currentPrice = token.price || 0.001;
      tokensReceived = (tradeAmount / currentPrice) * 0.98; // Account for 2% fee
    } else {
      // Sell trade
      const currentPrice = token.price || 0.001;
      solReceived = (amount * currentPrice) * 0.98; // Account for 2% fee
      tradeAmount = solReceived;
    }

    // Calculate trading fees (2% total)
    const totalFee = tradeAmount * 0.02;

    try {
      // In production, execute the actual Solana swap transaction here
      // For now, we'll simulate the trade and process fees
      
      console.log('Simulating trade execution...');
      
      // Process trading fees
      const { data: feeResult, error: feeError } = await supabase.functions.invoke('process-trading-fees', {
        body: {
          tokenId: tokenId,
          transactionType: tradeType,
          tradeAmount: tradeAmount,
          traderWallet: walletAddress,
          totalFeeAmount: totalFee,
        },
      });

      if (feeError) {
        console.error('Fee processing error:', feeError);
        throw new Error(`Fee processing failed: ${feeError.message}`);
      }

      // Update token statistics
      const newVolume = (token.volume_24h || 0) + tradeAmount;
      const { error: updateError } = await supabase
        .from('tokens')
        .update({
          volume_24h: newVolume,
          // In production, update price based on AMM calculations
          price: token.price || 0.001,
        })
        .eq('id', tokenId);

      if (updateError) {
        console.warn('Token stats update error:', updateError);
      }

      const mockTxSignature = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`${tradeType} trade completed:`, {
        tradeAmount,
        tokensReceived,
        solReceived,
        totalFee,
        signature: mockTxSignature
      });

      return new Response(
        JSON.stringify({
          success: true,
          transaction: {
            signature: mockTxSignature,
            type: tradeType,
            amount: tradeAmount,
            tokensReceived: tradeType === 'buy' ? tokensReceived : 0,
            solReceived: tradeType === 'sell' ? solReceived : 0,
            fee: totalFee,
            timestamp: new Date().toISOString(),
          },
          token: {
            ...token,
            volume_24h: newVolume,
          },
          message: `${tradeType} order executed successfully! Fees distributed automatically.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (tradeError) {
      console.error('Trade execution error:', tradeError);
      return new Response(
        JSON.stringify({
          error: 'Trade execution failed',
          details: tradeError.message,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in execute-trade:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
