import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function getHeliusApiKey(): string {
  const key = Deno.env.get("HELIUS_RPC_API_KEY");
  if (!key) throw new Error("Missing HELIUS_RPC_API_KEY");
  return key;
}

interface PriorityFeeRequest {
  accountKeys?: string[];
  options?: {
    recommended?: boolean;
    includeAllPriorityFeeLevels?: boolean;
    transactionEncoding?: string;
    lookbackSlots?: number;
  };
}

interface PriorityFeeResponse {
  priorityFeeEstimate: number;
  priorityFeeLevels: {
    min: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
    unsafeMax: number;
  };
  microLamportsPerCu: number;
  recommended: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heliusKey = getHeliusApiKey();
    
    if (req.method === 'GET') {
      // Get recommended priority fee for general use
      const feeData = await getRecommendedPriorityFee(heliusKey);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: feeData,
          recommendation: 'Use medium for normal trades, high for time-sensitive trades'
        }),
        { headers: corsHeaders }
      );
    }

    if (req.method === 'POST') {
      const body: PriorityFeeRequest = await req.json();
      
      // Get priority fee for specific accounts/transaction
      const feeData = await getPriorityFeeForAccounts(heliusKey, body);
      
      return new Response(
        JSON.stringify({ success: true, data: feeData }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Priority fee API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        fallback: {
          priorityFeeEstimate: 50000, // 50k micro-lamports fallback
          recommended: 50000
        }
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function getRecommendedPriorityFee(heliusKey: string): Promise<PriorityFeeResponse> {
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'priority-fee-estimate',
      method: 'getPriorityFeeEstimate',
      params: [{
        accountKeys: [
          // Common accounts that affect priority fees
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Token program
          '11111111111111111111111111111111', // System program
          'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', // Associated token program
        ],
        options: {
          recommended: true,
          includeAllPriorityFeeLevels: true,
          lookbackSlots: 150
        }
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Helius priority fee API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Helius API error: ${data.error.message}`);
  }

  return data.result;
}

async function getPriorityFeeForAccounts(heliusKey: string, request: PriorityFeeRequest): Promise<PriorityFeeResponse> {
  const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'priority-fee-estimate-accounts',
      method: 'getPriorityFeeEstimate',
      params: [{
        accountKeys: request.accountKeys || [],
        options: {
          recommended: true,
          includeAllPriorityFeeLevels: true,
          lookbackSlots: 150,
          ...request.options
        }
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Helius priority fee API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Helius API error: ${data.error.message}`);
  }

  return data.result;
}