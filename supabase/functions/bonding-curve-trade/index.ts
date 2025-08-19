import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
  TransactionInstruction,
  AccountMeta,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "https://esm.sh/@solana/spl-token@0.4.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bonding curve constants
const BONDING_CURVE_CONFIG = {
  VIRTUAL_SOL_RESERVES: 30,
  VIRTUAL_TOKEN_RESERVES: 1073000000,
  GRADUATION_THRESHOLD: 85000,
};

/**
 * Get bonding curve PDA
 */
function getBondingCurvePDA(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    programId
  );
}

/**
 * Calculate tokens for SOL using bonding curve formula
 */
function calculateBuy(solIn: number, solRaised: number, tokensSold: number): {
  tokensOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
  marketCapAfter: number;
} {
  const currentVirtualSol = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - tokensSold;

  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualSol = currentVirtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol;
  const tokensOut = currentVirtualTokens - newVirtualTokens;

  const newSolRaised = solRaised + solIn;
  const newTokensSold = tokensSold + tokensOut;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * 1000000000; // 1B total supply

  return {
    tokensOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

/**
 * Calculate SOL for tokens using bonding curve formula
 */
function calculateSell(tokensIn: number, solRaised: number, tokensSold: number): {
  solOut: number;
  priceAfter: number;
  newSolRaised: number;
  newTokensSold: number;
  marketCapAfter: number;
} {
  const currentVirtualSol = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES + solRaised;
  const currentVirtualTokens = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES - tokensSold;

  const k = currentVirtualSol * currentVirtualTokens;
  const newVirtualTokens = currentVirtualTokens + tokensIn;
  const newVirtualSol = k / newVirtualTokens;
  const solOut = currentVirtualSol - newVirtualSol;

  const newSolRaised = solRaised - solOut;
  const newTokensSold = tokensSold - tokensIn;
  const priceAfter = newVirtualSol / newVirtualTokens;
  const marketCapAfter = priceAfter * 1000000000; // 1B total supply

  return {
    solOut,
    priceAfter,
    newSolRaised,
    newTokensSold,
    marketCapAfter,
  };
}

/**
 * Create bonding curve buy instruction
 */
function createBuyInstruction(
  bondingCurve: PublicKey,
  curveTokenAccount: PublicKey,
  buyerTokenAccount: PublicKey,
  buyer: PublicKey,
  creator: PublicKey,
  platformWallet: PublicKey,
  prizePoolWallet: PublicKey,
  reservesWallet: PublicKey,
  programId: PublicKey,
  solAmount: number,
  minTokensOut: number
): TransactionInstruction {
  const instructionData = new Uint8Array(8 + 8 + 8);
  const dataView = new DataView(instructionData.buffer);
  
  // Buy instruction discriminator
  dataView.setBigUint64(0, BigInt(1), true);
  dataView.setBigUint64(8, BigInt(solAmount * LAMPORTS_PER_SOL), true);
  dataView.setBigUint64(16, BigInt(minTokensOut), true);

  const accounts: AccountMeta[] = [
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveTokenAccount, isSigner: false, isWritable: true },
    { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: platformWallet, isSigner: false, isWritable: true },
    { pubkey: prizePoolWallet, isSigner: false, isWritable: true },
    { pubkey: reservesWallet, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys: accounts,
    programId,
    data: instructionData,
  });
}

/**
 * Create bonding curve sell instruction
 */
function createSellInstruction(
  bondingCurve: PublicKey,
  curveTokenAccount: PublicKey,
  sellerTokenAccount: PublicKey,
  seller: PublicKey,
  creator: PublicKey,
  platformWallet: PublicKey,
  prizePoolWallet: PublicKey,
  reservesWallet: PublicKey,
  programId: PublicKey,
  tokenAmount: number,
  minSolOut: number
): TransactionInstruction {
  const instructionData = new Uint8Array(8 + 8 + 8);
  const dataView = new DataView(instructionData.buffer);
  
  // Sell instruction discriminator
  dataView.setBigUint64(0, BigInt(2), true);
  dataView.setBigUint64(8, BigInt(tokenAmount * Math.pow(10, 9)), true);
  dataView.setBigUint64(16, BigInt(minSolOut * LAMPORTS_PER_SOL), true);

  const accounts: AccountMeta[] = [
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveTokenAccount, isSigner: false, isWritable: true },
    { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: seller, isSigner: true, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: platformWallet, isSigner: false, isWritable: true },
    { pubkey: prizePoolWallet, isSigner: false, isWritable: true },
    { pubkey: reservesWallet, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys: accounts,
    programId,
    data: instructionData,
  });
}

serve(async (req) => {
  console.log('=== BONDING CURVE TRADE ===');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      tokenId, 
      walletAddress, 
      tradeType, // 'buy' or 'sell'
      amount, // SOL amount for buy, token amount for sell
      signedTransaction, 
      platformSignature,
      slippageBps = 500 // 5% default slippage
    } = await req.json();

    console.log('Processing trade:', { tokenId, walletAddress, tradeType, amount });

    // Validate inputs
    if (!tokenId || !walletAddress || !tradeType || !amount || !signedTransaction) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(tradeType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid trade type. Must be "buy" or "sell"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify platform signature
    if (!platformSignature || !platformSignature.signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Platform signature required',
          code: 'PLATFORM_SIGNATURE_REQUIRED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Get token data
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

    // Validate platform signature
    const { data: signatureValid, error: sigError } = await supabase.rpc('validate_platform_signature', {
      p_token_id: tokenId,
      p_signature: platformSignature.signature
    });

    if (sigError || !signatureValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or expired platform signature',
          code: 'INVALID_PLATFORM_SIGNATURE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check graduation status
    if (token.is_graduated) {
      return new Response(
        JSON.stringify({ error: 'Token has graduated to Raydium' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get configuration
    const { data: programId } = await supabase.rpc('get_active_program_id');
    const realProgramId = programId || '11111111111111111111111111111111';

    // Get fee configuration based on graduation status
    const { data: feeConfigData } = await supabase.rpc('get_fee_config_by_graduation', {
      is_graduated: token.is_graduated || false
    });
    
    const feeConfig = feeConfigData?.[0] || {
      platform_fee_bps: token.is_graduated ? 50 : 100,  // 0.5% or 1%
      creator_fee_bps: token.is_graduated ? 100 : 50,   // 1% or 0.5%
      prize_pool_fee_bps: 30,  // 0.3%
      reserves_fee_bps: 20     // 0.2%
    };

    // Get wallet addresses
    const { data: walletConfigs } = await supabase
      .from('wallet_config')
      .select('wallet_type, wallet_address')
      .eq('is_active', true);

    const walletMap = {};
    walletConfigs?.forEach(config => {
      walletMap[config.wallet_type] = config.wallet_address;
    });

    // Initialize Solana connection
    const heliusRpcApiKey = Deno.env.get('HELIUS_RPC_API_KEY');
    if (!heliusRpcApiKey) {
      throw new Error('Helius RPC API key not configured');
    }
    
    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusRpcApiKey}`;
    const connection = new Connection(heliusRpcUrl, 'confirmed');

    // Get platform keypair
    const platformPrivateKey = Deno.env.get('PLATFORM_WALLET_PRIVATE_KEY');
    if (!platformPrivateKey) {
      throw new Error('Platform wallet private key not configured');
    }

    const platformKeypair = Keypair.fromSecretKey(
      Uint8Array.from(JSON.parse(platformPrivateKey))
    );

    const mintAddress = new PublicKey(token.mint_address);
    const userPublicKey = new PublicKey(walletAddress);
    const creatorPublicKey = new PublicKey(token.creator_wallet);
    const bondingCurveProgramId = new PublicKey(realProgramId);
    const [bondingCurve] = getBondingCurvePDA(mintAddress, bondingCurveProgramId);

    // Calculate trade
    let trade;
    if (tradeType === 'buy') {
      trade = calculateBuy(amount, token.sol_raised || 0, token.tokens_sold || 0);
      trade.type = 'buy';
      trade.solIn = amount;
      trade.tokensOut = trade.tokensOut;
    } else {
      trade = calculateSell(amount, token.sol_raised || 0, token.tokens_sold || 0);
      trade.type = 'sell';
      trade.tokensIn = amount;
      trade.solOut = trade.solOut;
    }

    console.log('Trade calculation:', trade);

    // Execute user's transaction first
    const userTransaction = Transaction.from(Uint8Array.from(signedTransaction));
    console.log('Submitting user transaction...');
    const userTxId = await connection.sendRawTransaction(userTransaction.serialize());
    await connection.confirmTransaction(userTxId);
    console.log('✅ User transaction confirmed:', userTxId);

    // Execute bonding curve trade
    const tradeTx = new Transaction();

    // Get token accounts
    const curveTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      bondingCurve,
      true
    );

    const userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      userPublicKey
    );

    // Create user token account if needed
    try {
      await getAccount(connection, userTokenAccount);
    } catch (error) {
      tradeTx.add(
        createAssociatedTokenAccountInstruction(
          platformKeypair.publicKey,
          userTokenAccount,
          userPublicKey,
          mintAddress
        )
      );
    }

    // Use real bonding curve instruction if program ID is available
    if (realProgramId !== '11111111111111111111111111111111') {
      const platformWallet = new PublicKey(walletMap.platform || '11111111111111111111111111111111');
      const prizePoolWallet = new PublicKey(walletMap.prize_pool || '11111111111111111111111111111111');
      const reservesWallet = new PublicKey(walletMap.reserves || '11111111111111111111111111111111');

      if (tradeType === 'buy') {
        const minTokensOut = Math.floor(trade.tokensOut * (10000 - slippageBps) / 10000 * Math.pow(10, 9));
        tradeTx.add(
          createBuyInstruction(
            bondingCurve,
            curveTokenAccount,
            userTokenAccount,
            userPublicKey,
            creatorPublicKey,
            platformWallet,
            prizePoolWallet,
            reservesWallet,
            bondingCurveProgramId,
            amount,
            minTokensOut
          )
        );
      } else {
        const minSolOut = Math.floor(trade.solOut * (10000 - slippageBps) / 10000);
        tradeTx.add(
          createSellInstruction(
            bondingCurve,
            curveTokenAccount,
            userTokenAccount,
            userPublicKey,
            creatorPublicKey,
            platformWallet,
            prizePoolWallet,
            reservesWallet,
            bondingCurveProgramId,
            amount,
            minSolOut
          )
        );
      }
    } else {
      // Fallback simulation until contract is deployed
      console.log('⚠️ Using simulation mode - real contract not deployed yet');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Smart contract not deployed yet',
          message: 'Please deploy the bonding curve contract first',
          simulatedTrade: trade
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Send trade transaction
    const { blockhash } = await connection.getLatestBlockhash();
    tradeTx.recentBlockhash = blockhash;
    tradeTx.feePayer = userPublicKey; // User pays for their trade

    console.log('Executing bonding curve trade...');
    const tradeTxId = await sendAndConfirmTransaction(
      connection,
      tradeTx,
      [] // Will be signed by user
    );
    console.log('✅ Trade transaction confirmed:', tradeTxId);

    // Update token state in database
    const { error: updateError } = await supabase
      .from('tokens')
      .update({
        sol_raised: trade.newSolRaised,
        tokens_sold: trade.newTokensSold,
        market_cap: trade.marketCapAfter,
        price: trade.priceAfter,
        is_graduated: trade.marketCapAfter >= 100000, // $100k graduation
        updated_at: new Date().toISOString(),
      })
      .eq('id', tokenId);

    if (updateError) {
      console.error('Database update error:', updateError);
    }

    // Record trading activity
    await supabase.from('trading_activities').insert({
      token_id: tokenId,
      user_wallet: walletAddress,
      activity_type: tradeType,
      amount_sol: tradeType === 'buy' ? amount : trade.solOut,
      token_amount: tradeType === 'buy' ? trade.tokensOut : amount,
      token_price: trade.priceAfter,
      market_cap_at_time: trade.marketCapAfter,
    });

    // Check for achievements
    try {
      await supabase.rpc('check_and_award_achievements', {
        p_user_wallet: token.creator_wallet,
        p_token_id: tokenId,
        p_check_type: 'milestone'
      });
    } catch (error) {
      console.error('Achievement check failed:', error);
    }

    console.log(`🎉 ${tradeType.toUpperCase()} COMPLETED!`);

    return new Response(
      JSON.stringify({
        success: true,
        userTxId,
        tradeTxId,
        trade: {
          type: tradeType,
          ...(tradeType === 'buy' ? {
            solIn: amount,
            tokensOut: trade.tokensOut,
          } : {
            tokensIn: amount,
            solOut: trade.solOut,
          }),
          priceAfter: trade.priceAfter,
          marketCapAfter: trade.marketCapAfter,
        },
        message: `✅ Successfully ${tradeType === 'buy' ? 'bought' : 'sold'} ${token.symbol}`,
        graduationStatus: trade.marketCapAfter >= 100000 ? 'GRADUATED' : 'ACCUMULATING',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== TRADE ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute bonding curve trade', 
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});