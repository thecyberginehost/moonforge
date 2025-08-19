import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { walletAddress, tokenId, action } = await req.json();

    if (!walletAddress || !tokenId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, tokenId, or action' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Generating platform signature for:', { walletAddress, tokenId, action });

    // Verify the token exists and user has permission
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

    // Verify user profile exists (platform user verification)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_address')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized: Platform account required',
          code: 'PLATFORM_ACCOUNT_REQUIRED' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Generate platform signature for the action
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Create signature payload
    const signaturePayload = {
      walletAddress,
      tokenId,
      action, // 'buy', 'sell', or 'create'
      timestamp,
      nonce,
      platform: 'moonforge'
    };

    // Sign with platform private key (simplified - in production use proper cryptographic signing)
    const platformSecret = Deno.env.get('PLATFORM_SIGNATURE_SECRET') || 'default-secret';
    const payloadString = JSON.stringify(signaturePayload);
    
    // Create HMAC signature (simplified - use proper crypto library in production)
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(platformSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payloadString)
    );
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    console.log('Platform signature generated successfully');

    // Log the access attempt
    await supabase
      .from('platform_access_logs')
      .insert({
        user_wallet: walletAddress,
        token_id: tokenId,
        action: action,
        signature_hash: signatureHex.substring(0, 16), // Store partial hash for verification
        timestamp: new Date().toISOString()
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log access:', error);
      });

    return new Response(
      JSON.stringify({
        platformSignature: {
          signature: signatureHex,
          payload: signaturePayload,
          validUntil: timestamp + (5 * 60 * 1000) // 5 minutes validity
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating platform signature:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate platform signature',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});