import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

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

interface HeliusWebhookPayload {
  type: string;
  source: string;
  data: {
    accountData?: any[];
    transaction?: any;
    slot?: number;
    timestamp?: number;
  }[];
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
    const payload: HeliusWebhookPayload = await req.json();
    const supa = getSupa();

    console.log('Received Helius webhook:', JSON.stringify(payload, null, 2));

    // Process different webhook types
    switch (payload.type) {
      case 'transaction':
        await handleTransactionWebhook(supa, payload);
        break;
      case 'account':
        await handleAccountWebhook(supa, payload);
        break;
      case 'enhanced':
        await handleEnhancedWebhook(supa, payload);
        break;
      default:
        console.log('Unknown webhook type:', payload.type);
    }

    return new Response(
      JSON.stringify({ success: true, processed: true }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});

async function handleTransactionWebhook(supa: any, payload: HeliusWebhookPayload) {
  for (const item of payload.data) {
    const { transaction } = item;
    
    if (!transaction) continue;

    try {
      // Look for token transfers in the transaction
      const { instructions, signature, blockTime } = transaction;
      
      if (instructions) {
        for (const instruction of instructions) {
          // Check if this is a token transfer
          if (instruction.programId === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
            await processTokenTransfer(supa, instruction, signature, blockTime);
          }
          
          // Check if this is a bonding curve interaction
          if (instruction.programId && await isBondingCurveProgram(supa, instruction.programId)) {
            await processBondingCurveTransaction(supa, instruction, signature, blockTime);
          }
        }
      }
    } catch (error) {
      console.error('Error processing transaction webhook:', error);
    }
  }
}

async function handleAccountWebhook(supa: any, payload: HeliusWebhookPayload) {
  for (const item of payload.data) {
    const { accountData } = item;
    
    if (!accountData) continue;

    try {
      // Process account updates (e.g., token balance changes)
      for (const account of accountData) {
        if (account.account && account.account.data) {
          // Check if this is a token account update
          await processTokenAccountUpdate(supa, account);
        }
      }
    } catch (error) {
      console.error('Error processing account webhook:', error);
    }
  }
}

async function handleEnhancedWebhook(supa: any, payload: HeliusWebhookPayload) {
  // Handle enhanced transaction data with parsed information
  for (const item of payload.data) {
    try {
      // Process enhanced transaction data
      if (item.transaction) {
        await storeEnhancedTransactionData(supa, item.transaction);
        
        // Real-time notifications for significant events
        await checkForNotifiableEvents(supa, item.transaction);
      }
    } catch (error) {
      console.error('Error processing enhanced webhook:', error);
    }
  }
}

async function processTokenTransfer(supa: any, instruction: any, signature: string, blockTime: number) {
  try {
    const { parsed } = instruction;
    if (!parsed || !parsed.info) return;

    const { source, destination, amount, mint, authority } = parsed.info;

    // Check if this mint is one of our bonding curve tokens
    const { data: token } = await supa
      .from('tokens')
      .select('id, creator_wallet, symbol, name')
      .eq('mint_address', mint)
      .maybeSingle();

    if (token) {
      // Store the trading activity
      await supa
        .from('trading_activities')
        .upsert({
          user_wallet: authority || source,
          token_id: token.id,
          activity_type: 'transfer',
          token_amount: parseFloat(amount),
          transaction_signature: signature,
          created_at: new Date(blockTime * 1000).toISOString(),
          metadata: {
            source,
            destination,
            mint,
            webhook_processed: true
          }
        }, { 
          onConflict: 'transaction_signature,user_wallet,token_id',
          ignoreDuplicates: true 
        });

      console.log(`Processed token transfer for ${token.symbol}: ${amount} tokens`);
    }
  } catch (error) {
    console.error('Error processing token transfer:', error);
  }
}

async function processBondingCurveTransaction(supa: any, instruction: any, signature: string, blockTime: number) {
  try {
    // Process bonding curve specific transactions (buy/sell)
    // This would be customized based on your bonding curve program's instruction format
    
    const { data, accounts } = instruction;
    
    // Decode instruction data to determine if it's a buy or sell
    // This is a simplified example - you'd need to implement proper instruction parsing
    
    console.log(`Processed bonding curve transaction: ${signature}`);
  } catch (error) {
    console.error('Error processing bonding curve transaction:', error);
  }
}

async function processTokenAccountUpdate(supa: any, account: any) {
  try {
    // Process token account balance updates
    // This can be used to track real-time holder counts and token distributions
    
    const { pubkey, account: accountData } = account;
    
    // Parse token account data
    if (accountData.owner === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
      // This is a token account
      // You could decode the account data to get mint, owner, and amount
      console.log(`Token account updated: ${pubkey}`);
    }
  } catch (error) {
    console.error('Error processing token account update:', error);
  }
}

async function storeEnhancedTransactionData(supa: any, transaction: any) {
  // Store enhanced transaction data for analytics
  try {
    const { signature, slot, blockTime, fee } = transaction;
    
    // Store in a webhook_events table for debugging and analytics
    await supa
      .from('webhook_events')
      .insert({
        event_type: 'transaction',
        signature,
        slot,
        block_time: new Date(blockTime * 1000).toISOString(),
        fee,
        data: transaction,
        processed_at: new Date().toISOString()
      });
      
  } catch (error) {
    console.error('Error storing enhanced transaction data:', error);
  }
}

async function checkForNotifiableEvents(supa: any, transaction: any) {
  // Check for events that should trigger notifications
  // e.g., large trades, token graduations, etc.
  
  try {
    // Example: Check for large volume trades
    const { instructions } = transaction;
    
    for (const instruction of instructions || []) {
      if (instruction.parsed && instruction.parsed.info) {
        const { amount } = instruction.parsed.info;
        
        if (amount && parseFloat(amount) > 1000000) { // Large trade threshold
          console.log(`Large trade detected: ${amount} tokens`);
          // Could trigger notifications, update leaderboards, etc.
        }
      }
    }
  } catch (error) {
    console.error('Error checking for notifiable events:', error);
  }
}

async function isBondingCurveProgram(supa: any, programId: string): Promise<boolean> {
  try {
    const { data } = await supa
      .from('program_config')
      .select('program_id')
      .eq('program_id', programId)
      .eq('is_active', true)
      .maybeSingle();
      
    return !!data;
  } catch (error) {
    console.error('Error checking bonding curve program:', error);
    return false;
  }
}