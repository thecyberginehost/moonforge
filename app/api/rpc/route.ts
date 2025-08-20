// FILE: /api/rpc/route.ts (or supabase/functions/rpc-proxy/index.ts)
// This proxies RPC calls to Helius without exposing your API key

import { NextResponse } from 'next/server';

// Store this in Vercel env vars WITHOUT VITE_ prefix
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

export async function POST(request: Request) {
  try {
    // Get the RPC request from the client
    const body = await request.json();
    
    // Optional: Add rate limiting per IP
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    
    // Optional: Validate the RPC method is allowed
    const allowedMethods = [
      'getBalance',
      'getTransaction',
      'getAccountInfo',
      'sendTransaction',
      'getLatestBlockhash',
      'getSignatureStatuses',
      'simulateTransaction',
      // Add other methods you want to allow
    ];
    
    if (!allowedMethods.includes(body.method)) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 403 }
      );
    }
    
    // Forward to Helius with your server-side API key
    const response = await fetch(
      `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
    
    const data = await response.json();
    
    // Optional: Log usage for monitoring
    console.log(`RPC call from ${clientIp}: ${body.method}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also handle OPTIONS for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}