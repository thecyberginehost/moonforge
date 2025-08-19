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
    const heliusDataApiKey = Deno.env.get('HELIUS_DATA_API_KEY');
    if (!heliusDataApiKey) {
      throw new Error('Helius Data API key not configured');
    }

    console.log('Fetching priority fees from Helius');

    // Get priority fees using Helius Data API
    const response = await fetch(`https://api.helius.xyz/v0/priority-fee?api-key=${heliusDataApiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Helius API Error: ${data.error || response.statusText}`);
    }

    console.log('Priority fees fetched:', data);

    // Return the priority fee data
    return new Response(
      JSON.stringify({ 
        priorityFees: data,
        recommendedFee: data.priorityFeeEstimate || data.medium || 1000 // Default to 1000 microlamports
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error fetching priority fees:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch priority fees',
        details: error.message,
        fallbackFee: 5000 // Fallback priority fee in microlamports
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});