// supabase/functions/create-token-user-pays/index.ts
// MINIMAL VERSION - Just to get it working

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    const { name, symbol, description, creatorWallet } = body;

    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields");
    }

    console.log("Token creation request:", { name, symbol });

    // For now, just return mock data to test the connection
    const mockMint = `${Date.now()}${Math.random().toString(36).substring(2, 15)}`;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Token creation endpoint working (mock mode)",
        token: {
          id: crypto.randomUUID(),
          mint_address: mockMint,
          name,
          symbol,
          description,
          creator_wallet: creatorWallet,
          created_at: new Date().toISOString(),
        },
        mintAddress: mockMint,
        requiresSignature: false,
        mock: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});