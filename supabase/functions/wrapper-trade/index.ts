import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from "https://esm.sh/@solana/web3.js@1.95.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WrapperTradeRequest {
  tokenId: string;
  walletAddress: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  signedTransaction?: string;
  platformSignature?: string;
}

const WRAPPER_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

// Fee configuration
const WRAPPER_FEE_CONFIG = {
  PLATFORM_FEE_BPS: 100, // 1%
  CREATOR_FEE_BPS: 70,   // 0.7%
  TOTAL_FEE_BPS: 170,    // 1.7%
};

function getWrapperPDA(tokenMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("wrapper"), tokenMint.toBuffer()],
    WRAPPER_PROGRAM_ID
  );
}

function createWrapperTradeInstruction(
  wrapper: PublicKey,
  user: PublicKey,
  userSolAccount: PublicKey,
  platformFeeAccount: PublicKey,
  creatorFeeAccount: PublicKey,
  tradeAmount: number,
  tradeType: 'buy' | 'sell'
): TransactionInstruction {
  const keys = [
    { pubkey: wrapper, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: true, isWritable: true },
    { pubkey: userSolAccount, isSigner: false, isWritable: true },
    { pubkey: platformFeeAccount, isSigner: false, isWritable: true },
    { pubkey: creatorFeeAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // Create instruction data
  const tradeTypeValue = tradeType === 'buy' ? 0 : 1;
  const data = Buffer.alloc(9);
  data.writeUInt8(1, 0); // instruction discriminator for execute_wrapper_trade
  data.writeBigUInt64LE(BigInt(Math.floor(tradeAmount * 1e9)), 1); // amount in lamports

  return new TransactionInstruction({
    keys,
    programId: WRAPPER_PROGRAM_ID,
    data,
  });
}

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

    const connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${Deno.env.get('HELIUS_RPC_API_KEY')}`,
      'confirmed'
    );

    const {
      tokenId,
      walletAddress,
      tradeType,
      amount,
      signedTransaction,
      platformSignature
    }: WrapperTradeRequest = await req.json();

    console.log('Wrapper trade request:', { tokenId, walletAddress, tradeType, amount });

    // Validate inputs
    if (!tokenId || !walletAddress || !tradeType || !amount || amount <= 0) {
      throw new Error('Missing or invalid required fields');
    }

    // Get token data
    const { data: tokenData, error: tokenError } = await supabase
      .from('tokens')
      .select('*')
      .eq('id', tokenId)
      .single();

    if (tokenError || !tokenData) {
      throw new Error('Token not found');
    }

    // Verify token is graduated
    if (!tokenData.is_graduated) {
      throw new Error('Token has not graduated - use bonding curve instead');
    }

    // Validate platform signature if provided
    if (platformSignature) {
      const { data: isValidSignature } = await supabase
        .rpc('validate_platform_signature', {
          p_token_id: tokenId,
          p_signature: platformSignature
        });

      if (!isValidSignature) {
        throw new Error('Invalid platform signature');
      }
    }

    // Get platform and creator wallet addresses
    const { data: platformWallet } = await supabase
      .rpc('get_wallet_address', { p_wallet_type: 'platform' });
    
    const creatorWallet = tokenData.creator_wallet;

    if (!platformWallet || !creatorWallet) {
      throw new Error('Missing wallet configuration');
    }

    // Calculate fees
    const tradeAmountLamports = Math.floor(amount * 1e9);
    const totalFees = Math.floor(tradeAmountLamports * WRAPPER_FEE_CONFIG.TOTAL_FEE_BPS / 10000);
    const platformFee = Math.floor(totalFees * WRAPPER_FEE_CONFIG.PLATFORM_FEE_BPS / WRAPPER_FEE_CONFIG.TOTAL_FEE_BPS);
    const creatorFee = totalFees - platformFee;
    const tradeAmountAfterFees = tradeAmountLamports - totalFees;

    console.log('Fee calculation:', {
      tradeAmountLamports,
      totalFees,
      platformFee,
      creatorFee,
      tradeAmountAfterFees
    });

    // Get wrapper PDA
    const tokenMint = new PublicKey(tokenData.mint_address);
    const [wrapperPDA] = getWrapperPDA(tokenMint);

    // Check if wrapper exists, if not create it
    try {
      const wrapperAccount = await connection.getAccountInfo(wrapperPDA);
      if (!wrapperAccount) {
        // Initialize wrapper for this token
        console.log('Initializing wrapper for token:', tokenData.mint_address);
        
        // This would typically be done by the platform admin
        // For now, we'll record that wrapper needs initialization
        await supabase
          .from('fee_wrapper_status')
          .upsert({
            token_id: tokenId,
            mint_address: tokenData.mint_address,
            creator_wallet: creatorWallet,
            needs_initialization: true,
            is_active: false
          });
      }
    } catch (error) {
      console.log('Wrapper check failed, assuming needs initialization');
    }

    // For MVP, simulate the wrapper trade and record fees
    // In production, this would execute the actual wrapper contract

    // Simulate Raydium trade execution (after fees)
    const mockRaydiumTradeResult = {
      signature: `wrapper_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      tokensReceived: tradeType === 'buy' ? tradeAmountAfterFees / tokenData.price : 0,
      solReceived: tradeType === 'sell' ? tradeAmountAfterFees : 0,
      executionPrice: tokenData.price,
      slippage: 0.5, // Mock 0.5% slippage
    };

    // Record wrapper trade in database
    const { error: wrapperTradeError } = await supabase
      .from('wrapper_trades')
      .insert({
        token_id: tokenId,
        user_wallet: walletAddress,
        trade_type: tradeType,
        original_amount: amount,
        trade_amount_after_fees: tradeAmountAfterFees / 1e9,
        total_fees: totalFees / 1e9,
        platform_fee: platformFee / 1e9,
        creator_fee: creatorFee / 1e9,
        raydium_signature: mockRaydiumTradeResult.signature,
        execution_price: mockRaydiumTradeResult.executionPrice,
        slippage: mockRaydiumTradeResult.slippage,
        metadata: {
          tokens_received: mockRaydiumTradeResult.tokensReceived,
          sol_received: mockRaydiumTradeResult.solReceived,
          dex: 'raydium'
        }
      });

    if (wrapperTradeError) {
      console.error('Failed to record wrapper trade:', wrapperTradeError);
    }

    // Update creator earnings
    await supabase
      .from('creator_earnings')
      .upsert({
        token_id: tokenId,
        creator_wallet: creatorWallet,
        total_earned: creatorFee / 1e9,
        claimable_amount: creatorFee / 1e9
      }, {
        onConflict: 'token_id',
        ignoreDuplicates: false
      });

    // Update token volume
    await supabase
      .from('tokens')
      .update({
        volume_24h: tokenData.volume_24h + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenId);

    // Record trading activity
    const { error: activityError } = await supabase
      .from('trading_activities')
      .insert({
        user_wallet: walletAddress,
        token_id: tokenId,
        activity_type: tradeType,
        amount_sol: amount,
        token_amount: tradeType === 'buy' ? mockRaydiumTradeResult.tokensReceived : amount / tokenData.price,
        token_price: tokenData.price,
        market_cap_at_time: tokenData.market_cap,
        fees_paid: totalFees / 1e9,
        metadata: {
          via_wrapper: true,
          dex: 'raydium',
          platform_fee: platformFee / 1e9,
          creator_fee: creatorFee / 1e9
        }
      });

    if (activityError) {
      console.error('Failed to record trading activity:', activityError);
    }

    // Check for achievements
    try {
      await supabase.rpc('check_and_award_achievements', {
        p_user_wallet: walletAddress,
        p_token_id: tokenId,
        p_check_type: 'trading'
      });
    } catch (achievementError) {
      console.error('Achievement check failed:', achievementError);
    }

    const response = {
      success: true,
      signature: mockRaydiumTradeResult.signature,
      tradeType,
      originalAmount: amount,
      tradeAmountAfterFees: tradeAmountAfterFees / 1e9,
      totalFees: totalFees / 1e9,
      platformFee: platformFee / 1e9,
      creatorFee: creatorFee / 1e9,
      executionPrice: mockRaydiumTradeResult.executionPrice,
      slippage: mockRaydiumTradeResult.slippage,
      dex: 'raydium',
      viaWrapper: true,
      ...(tradeType === 'buy' ? {
        tokensReceived: mockRaydiumTradeResult.tokensReceived
      } : {
        solReceived: mockRaydiumTradeResult.solReceived
      })
    };

    console.log('Wrapper trade completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Wrapper trade error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to execute wrapper trade',
      success: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});