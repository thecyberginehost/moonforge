import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const heliusRpcApiKey = Deno.env.get('HELIUS_RPC_API_KEY');
    if (!heliusRpcApiKey) {
      throw new Error('Helius RPC API key not configured');
    }

    console.log('Fetching balance for wallet:', walletAddress);

    // Get SOL balance using Helius RPC with staked connections
    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusRpcApiKey}`;
    const response = await fetch(heliusRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [walletAddress]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    // Convert lamports to SOL
    const balanceInLamports = data.result?.value || 0;
    const balanceInSol = balanceInLamports / 1000000000; // 1 SOL = 1 billion lamports

    console.log('Wallet balance fetched:', balanceInSol, 'SOL');

    // Calculate suggested buy-in amount based on balance
    // Always leave at least 0.005 SOL for transaction fees
    const availableBalance = Math.max(0, balanceInSol - 0.005);
    let suggestedBuyIn = 0;
    
    if (availableBalance < 0.05) {
      suggestedBuyIn = 0.05; // Minimum suggested amount
    } else if (availableBalance < 0.5) {
      suggestedBuyIn = Math.max(0.05, availableBalance * 0.3); // 30% of available
    } else if (availableBalance < 2) {
      suggestedBuyIn = availableBalance * 0.25; // 25% of available
    } else if (availableBalance < 10) {
      suggestedBuyIn = availableBalance * 0.15; // 15% of available
    } else {
      suggestedBuyIn = Math.min(availableBalance * 0.1, 50); // 10% of available, cap at 50
    }
    
    // Round to reasonable decimal places
    suggestedBuyIn = Math.round(suggestedBuyIn * 10000) / 10000;

    return new Response(
      JSON.stringify({ 
        balance: balanceInSol,
        suggestedBuyIn,
        maxSafeBuyIn: availableBalance
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch wallet balance',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});