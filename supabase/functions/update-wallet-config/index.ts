import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get wallet addresses from environment variables (secrets)
    const platformWallet = Deno.env.get('PLATFORM_WALLET_ADDRESS');
    const prizePoolWallet = Deno.env.get('PRIZE_POOL_WALLET_ADDRESS');
    const reservesWallet = Deno.env.get('RESERVES_WALLET_ADDRESS');

    console.log('Updating wallet addresses:', {
      platform: platformWallet ? 'Set' : 'Missing',
      prizePool: prizePoolWallet ? 'Set' : 'Missing',
      reserves: reservesWallet ? 'Set' : 'Missing'
    });

    // Update platform wallet
    if (platformWallet) {
      const { error: platformError } = await supabase
        .from('wallet_config')
        .update({ 
          wallet_address: platformWallet,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_type', 'platform')
        .eq('is_active', true);

      if (platformError) {
        console.error('Platform wallet update error:', platformError);
      }
    }

    // Update prize pool wallet  
    if (prizePoolWallet) {
      const { error: prizePoolError } = await supabase
        .from('wallet_config')
        .update({ 
          wallet_address: prizePoolWallet,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_type', 'prize_pool')
        .eq('is_active', true);

      if (prizePoolError) {
        console.error('Prize pool wallet update error:', prizePoolError);
      }
    }

    // Update reserves wallet
    if (reservesWallet) {
      const { error: reservesError } = await supabase
        .from('wallet_config')
        .update({ 
          wallet_address: reservesWallet,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_type', 'reserves')
        .eq('is_active', true);

      if (reservesError) {
        console.error('Reserves wallet update error:', reservesError);
      }
    }

    // Verify updates
    const { data: walletConfigs, error: fetchError } = await supabase
      .from('wallet_config')
      .select('wallet_type, wallet_address')
      .eq('is_active', true);

    if (fetchError) {
      throw fetchError;
    }

    console.log('Updated wallet configurations:', walletConfigs);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Wallet addresses updated successfully',
        walletConfigs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wallet config update error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update wallet configuration', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});