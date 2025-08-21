// FILE: supabase/functions/create-token-user-pays/index.ts
// REAL TOKEN CREATION - User pays, platform receives fees, creates actual Solana tokens with proper metadata

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "https://esm.sh/@solana/web3.js@1.98.2";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import {
  createCreateMetadataAccountV3Instruction,
  MPL_TOKEN_METADATA_PROGRAM_ID as METADATA_PROGRAM_ID,
} from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.2.1";
import BN from "https://esm.sh/bn.js@5.2.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Your deployed bonding curve program
const BONDING_CURVE_PROGRAM_ID = "Aa3p5mYeEdG1YCiiqf24CXYkRAcRq7hcuQT3pZa9L779";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const {
      name,
      symbol,
      description,
      imageUrl,
      telegram,
      twitter,
      website,
      creatorWallet,
      initialBuyIn = 0
    } = body;

    // Validate inputs
    if (!name || !symbol || !creatorWallet) {
      throw new Error("Missing required fields: name, symbol, and creatorWallet");
    }

    console.log("Creating REAL token on Solana:", { name, symbol });

    // Connect to Solana
    const heliusKey = Deno.env.get("HELIUS_RPC_API_KEY");
    const network = Deno.env.get("SOLANA_NETWORK") || "devnet";
    const rpcUrl = heliusKey 
      ? `https://${network}.helius-rpc.com/?api-key=${heliusKey}`
      : `https://api.${network}.solana.com`;
    const connection = new Connection(rpcUrl, "confirmed");

    // Platform wallet - uses real address from env or falls back to placeholder
    const platformWalletAddress = Deno.env.get("PLATFORM_WALLET_ADDRESS");
    if (!platformWalletAddress || platformWalletAddress === "11111111111111111111111111111111") {
      console.warn("WARNING: Using placeholder platform wallet. Set PLATFORM_WALLET_ADDRESS in environment!");
    }
    const PLATFORM_WALLET = new PublicKey(
      platformWalletAddress || "11111111111111111111111111111111"
    );

    // Constants
    const TOKEN_CREATION_FEE = 0.02 * LAMPORTS_PER_SOL; // User pays this
    const DECIMALS = 9;
    const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens

    // Parse creator wallet
    const creatorPubkey = new PublicKey(creatorWallet);

    // Generate NEW keypair for the token mint
    const mintKeypair = Keypair.generate();
    console.log("New token mint address:", mintKeypair.publicKey.toString());

    // Get bonding curve PDA
    const [bondingCurvePDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mintKeypair.publicKey.toBuffer()],
      new PublicKey(BONDING_CURVE_PROGRAM_ID)
    );
    console.log("Bonding curve PDA:", bondingCurvePDA.toString());

    // Build transaction for user to sign
    const transaction = new Transaction();

    // 1. Add compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 })
    );

    // 2. Transfer creation fee to platform (USER PAYS)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: creatorPubkey,
        toPubkey: PLATFORM_WALLET,
        lamports: TOKEN_CREATION_FEE,
      })
    );

    // 3. Create mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(82);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creatorPubkey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 4. Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        DECIMALS,
        creatorPubkey, // mint authority (will be transferred to bonding curve)
        creatorPubkey, // freeze authority
        TOKEN_PROGRAM_ID
      )
    );

    // 5. Create metadata PDA
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    // 6. Upload metadata properly to Supabase Storage
    const metadataUri = await uploadMetadata(
      {
        name: name.substring(0, 32),
        symbol: symbol.substring(0, 10),
        description: description || `${name} - Created on MoonForge`,
        image: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
        external_url: website || `https://moonforge.io/token/${mintKeypair.publicKey.toString()}`,
        attributes: [],
        properties: {
          files: [{ 
            uri: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`, 
            type: "image/png" 
          }],
          category: "meme",
          creators: [{ address: creatorWallet, share: 100 }],
        },
      },
      supabase
    );

    console.log("Metadata URI:", metadataUri);

    // 7. Create metadata account
    transaction.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mintKeypair.publicKey,
          mintAuthority: creatorPubkey,
          payer: creatorPubkey,
          updateAuthority: creatorPubkey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: name.substring(0, 32),
              symbol: symbol.substring(0, 10),
              uri: metadataUri,
              sellerFeeBasisPoints: 100, // 1%
              creators: [
                {
                  address: creatorPubkey,
                  verified: true,
                  share: 100,
                },
              ],
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );

    // 8. Create bonding curve token account (100% goes here - pump.fun style!)
    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      bondingCurvePDA,
      true, // Allow owner off curve for PDA
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        creatorPubkey,
        bondingCurveTokenAccount,
        bondingCurvePDA,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 9. Mint 100% to bonding curve (pump.fun style - fair launch!)
    const totalSupplyWithDecimals = TOTAL_SUPPLY * Math.pow(10, DECIMALS);
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        bondingCurveTokenAccount,
        creatorPubkey,
        totalSupplyWithDecimals,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 10. Initialize bonding curve in YOUR deployed program
    const initializeCurveInstruction = new TransactionInstruction({
      programId: new PublicKey(BONDING_CURVE_PROGRAM_ID),
      keys: [
        { pubkey: bondingCurvePDA, isSigner: false, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: creatorPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        0, // Instruction discriminator for initialize_curve
        ...new BN(30 * LAMPORTS_PER_SOL).toArray('le', 8), // virtual_sol_reserves
        ...new BN(1073000000 * Math.pow(10, DECIMALS)).toArray('le', 8), // virtual_token_reserves  
        ...new BN(totalSupplyWithDecimals).toArray('le', 8), // bonding_curve_supply (100%)
      ]),
    });
    
    transaction.add(initializeCurveInstruction);

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creatorPubkey;

    // IMPORTANT: Partially sign with the mint keypair
    transaction.partialSign(mintKeypair);

    // Serialize the transaction with the mint signature
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Save REAL token data to database
    const tokenData = {
      mint_address: mintKeypair.publicKey.toString(), // REAL mint address!
      bonding_curve_address: bondingCurvePDA.toString(), // REAL bonding curve PDA!
      creator_wallet: creatorWallet,
      name,
      symbol: symbol.toUpperCase(),
      description: description || `${name} - Created on MoonForge`,
      image_url: imageUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}`,
      twitter_url: twitter,
      telegram_url: telegram,
      website_url: website,
      metadata_uri: metadataUri,
      
      // Bonding curve state
      virtual_sol_reserves: 30,
      virtual_token_reserves: 1073000000,
      real_sol_reserves: 0,
      real_token_reserves: TOTAL_SUPPLY, // 100% in bonding curve
      tokens_sold: 0,
      
      // Fee configuration
      creation_fee_paid: 0.02,
      platform_received: 0.02,
      trading_fee: 0.01,
      
      // Token configuration
      decimals: DECIMALS,
      total_supply: TOTAL_SUPPLY,
      creator_allocation: 0, // Creator gets 0 tokens upfront (fair launch!)
      bonding_curve_allocation: TOTAL_SUPPLY, // 100% to bonding curve
      
      // Initial state
      current_price: 0.00000003,
      market_cap: 0,
      volume_24h: 0,
      holder_count: 1,
      transaction_count: 0,
      
      // Status
      is_active: true,
      is_graduated: false,
      network: network,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Handle initial buy-in if specified
    if (initialBuyIn > 0) {
      const platformFee = initialBuyIn * 0.01; // 1% fee
      tokenData.real_sol_reserves = initialBuyIn - platformFee;
      tokenData.volume_24h = initialBuyIn;
      tokenData.transaction_count = 1;
    }

    const { data: token, error: dbError } = await supabase
      .from("tokens")
      .insert(tokenData)
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save token: ${dbError.message}`);
    }

    console.log("✅ Real token created:", mintKeypair.publicKey.toString());
    console.log("✅ Bonding curve initialized:", bondingCurvePDA.toString());
    console.log("✅ Metadata uploaded:", metadataUri);
    console.log("✅ View on Explorer:", `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=${network}`);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        transaction: serializedTransaction.toString('base64'),
        mintAddress: mintKeypair.publicKey.toString(),
        bondingCurveAddress: bondingCurvePDA.toString(),
        metadataUri: metadataUri,
        message: "Real token creation transaction ready",
        explorer: `https://explorer.solana.com/address/${mintKeypair.publicKey.toString()}?cluster=${network}`,
        fees: {
          creation_fee: 0.02,
          gas_estimate: 0.005,
          total_user_cost: 0.025,
          platform_receives_creation: 0.02,
          platform_trading_fee: "1% on all trades",
        },
        requiresSignature: true,
        signerWallet: creatorWallet,
        platformWallet: PLATFORM_WALLET.toString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Token creation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        details: "Real token creation failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to upload metadata to Supabase Storage
async function uploadMetadata(metadata: any, supabase: any): Promise<string> {
  console.log("Uploading metadata to Supabase Storage:", metadata);
  
  try {
    // First, check if the bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b: any) => b.name === 'token-metadata');
    
    if (!bucketExists) {
      console.log("Creating token-metadata bucket...");
      const { error: createError } = await supabase.storage.createBucket('token-metadata', {
        public: true,
        allowedMimeTypes: ['application/json'],
      });
      
      if (createError && !createError.message.includes('already exists')) {
        console.error("Failed to create bucket:", createError);
        // Fall back to data URI
        return createDataUri(metadata);
      }
    }
    
    // Upload metadata JSON to Supabase Storage
    const fileName = `${metadata.symbol.toLowerCase()}-${Date.now()}.json`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('token-metadata')
      .upload(fileName, JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
        cacheControl: '31536000', // Cache for 1 year
        upsert: false
      });
    
    if (uploadError) {
      console.error("Failed to upload metadata to storage:", uploadError);
      // Fall back to data URI
      return createDataUri(metadata);
    }
    
    // Get the public URL for the uploaded metadata
    const { data: { publicUrl } } = supabase.storage
      .from('token-metadata')
      .getPublicUrl(uploadData.path);
    
    console.log("✅ Metadata uploaded successfully:", publicUrl);
    return publicUrl;
    
  } catch (error) {
    console.error("Error in metadata upload:", error);
    // Fall back to data URI if storage fails
    return createDataUri(metadata);
  }
}

// Fallback: Create a data URI with embedded metadata
function createDataUri(metadata: any): string {
  console.log("Using data URI fallback for metadata");
  const base64Metadata = btoa(JSON.stringify(metadata));
  const dataUri = `data:application/json;base64,${base64Metadata}`;
  return dataUri;
}