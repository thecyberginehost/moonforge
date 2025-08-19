import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function getSupa() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function getHeliusApiKey(): string {
  const key = Deno.env.get("HELIUS_DATA_API_KEY");
  if (!key) throw new Error("Missing HELIUS_DATA_API_KEY");
  return key;
}

interface ParsedTransactionRequest {
  signatures?: string[];
  addresses?: string[];
  limit?: number;
  before?: string;
  until?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heliusKey = getHeliusApiKey();
    const supa = getSupa();

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const signature = url.searchParams.get('signature');
      const address = url.searchParams.get('address');
      
      if (signature) {
        // Get single transaction details
        const txData = await getParsedTransaction(heliusKey, signature);
        return new Response(
          JSON.stringify({ success: true, data: txData }),
          { headers: corsHeaders }
        );
      } else if (address) {
        // Get transactions for an address
        const txHistory = await getTransactionHistory(heliusKey, address);
        return new Response(
          JSON.stringify({ success: true, data: txHistory }),
          { headers: corsHeaders }
        );
      } else {
        return new Response(
          JSON.stringify({ error: 'Missing signature or address parameter' }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (req.method === 'POST') {
      const body: ParsedTransactionRequest = await req.json();
      
      if (body.signatures) {
        // Batch transaction parsing
        const txData = await batchParsedTransactions(heliusKey, body.signatures);
        
        // Store enhanced transaction data in database
        for (const tx of txData) {
          await storeEnhancedTransactionData(supa, tx);
        }
        
        return new Response(
          JSON.stringify({ success: true, data: txData }),
          { headers: corsHeaders }
        );
      } else if (body.addresses) {
        // Get transaction history for multiple addresses
        const histories = await Promise.all(
          body.addresses.map(addr => getTransactionHistory(heliusKey, addr, body.limit))
        );
        
        return new Response(
          JSON.stringify({ success: true, data: histories }),
          { headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Parsed transactions API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function getParsedTransaction(heliusKey: string, signature: string) {
  const response = await fetch(`https://api.helius.xyz/v0/transactions/parsed?api-key=${heliusKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: [signature] })
  });

  if (!response.ok) {
    throw new Error(`Helius parsed transaction API error: ${response.status}`);
  }

  const data = await response.json();
  return data[0]; // Return first (and only) transaction
}

async function batchParsedTransactions(heliusKey: string, signatures: string[]) {
  const response = await fetch(`https://api.helius.xyz/v0/transactions/parsed?api-key=${heliusKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions: signatures })
  });

  if (!response.ok) {
    throw new Error(`Helius batch parsed transaction API error: ${response.status}`);
  }

  return await response.json();
}

async function getTransactionHistory(heliusKey: string, address: string, limit = 50) {
  const response = await fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${heliusKey}&limit=${limit}&type=TRANSFER`);

  if (!response.ok) {
    throw new Error(`Helius transaction history API error: ${response.status}`);
  }

  return await response.json();
}

async function storeEnhancedTransactionData(supa: any, transaction: any) {
  try {
    // Extract relevant trading data from parsed transaction
    const { signature, blockTime, slot, instructions } = transaction;
    
    // Look for token transfers and swaps
    const tokenTransfers = instructions?.filter((ix: any) => 
      ix.type === 'transfer' || ix.type === 'transferChecked'
    ) || [];

    if (tokenTransfers.length > 0) {
      // Extract trading activity data
      for (const transfer of tokenTransfers) {
        const { source, destination, amount, mint } = transfer.parsed || {};
        
        if (mint && amount) {
          // Check if this is related to one of our bonding curve tokens
          const { data: token } = await supa
            .from('tokens')
            .select('id, creator_wallet')
            .eq('mint_address', mint)
            .maybeSingle();

          if (token) {
            // Store enhanced trading activity
            await supa
              .from('trading_activities')
              .upsert({
                user_wallet: source || destination,
                token_id: token.id,
                activity_type: 'transfer', // Will be enhanced to detect buy/sell
                amount_sol: 0, // Calculate from transfer data
                token_amount: parseFloat(amount),
                transaction_signature: signature,
                block_time: new Date(blockTime * 1000).toISOString(),
                slot_number: slot,
                enhanced_data: {
                  parsed_instruction: transfer,
                  all_transfers: tokenTransfers.length,
                  transaction_fee: transaction.fee
                }
              }, { 
                onConflict: 'transaction_signature,user_wallet,token_id',
                ignoreDuplicates: true 
              });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error storing enhanced transaction data:', error);
    // Don't throw - just log and continue
  }
}