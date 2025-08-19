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

    const { programId, network = 'devnet' } = await req.json();

    if (!programId) {
      return new Response(
        JSON.stringify({ error: 'Program ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Updating program ID:', { programId, network });

    // Deactivate old program configs
    const { error: deactivateError } = await supabase
      .from('program_config')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('program_name', 'bonding_curve')
      .eq('network', network);

    if (deactivateError) {
      console.error('Failed to deactivate old configs:', deactivateError);
    }

    // Insert new active program config
    const { data: newConfig, error: insertError } = await supabase
      .from('program_config')
      .insert({
        program_name: 'bonding_curve',
        program_id: programId,
        network,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert new program config:', insertError);
      throw insertError;
    }

    // Update all existing tokens to use new program ID in their bonding_curve_address
    // This is important for tokens that were created with placeholder
    const { error: updateTokensError } = await supabase.rpc('update_existing_tokens_program_id', {
      new_program_id: programId,
      old_program_id: '11111111111111111111111111111111'
    });

    if (updateTokensError) {
      console.error('Failed to update existing tokens:', updateTokensError);
      // Don't fail the request for this
    }

    console.log('Program ID updated successfully:', newConfig);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Program ID updated successfully',
        programConfig: newConfig,
        tokensUpdated: !updateTokensError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Program ID update error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update program ID', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});