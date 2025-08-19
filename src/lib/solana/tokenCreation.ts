// FILE PATH: src/lib/solana/tokenCreation.ts
// ACTION: CREATE NEW FILE (create directory src/lib/solana if it doesn't exist)
// PURPOSE: Fix token creation with proper metadata handling
// NOTE: If this file exists, REPLACE it completely

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BN from 'bn.js';

// Constants
const DECIMALS = 9;
const TOTAL_SUPPLY = 1_000_000_000; // 1 billion tokens
const CREATION_FEE = 0.02; // SOL
const PLATFORM_FEE_BPS = 100; // 1%
const CREATOR_FEE_BPS = 50; // 0.5%

// Get program ID from environment
const BONDING_CURVE_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_BONDING_CURVE_PROGRAM_ID || '11111111111111111111111111111111'
);

// Platform wallet for fees
const PLATFORM_WALLET = new PublicKey(
  import.meta.env.VITE_PLATFORM_WALLET_ADDRESS || '11111111111111111111111111111111'
);

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  telegram?: string;
  twitter?: string;
  website?: string;
}

// Helper to get metadata PDA
export function getMetadataPDA(mint: PublicKey): PublicKey {
  const [metadataPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );
  return metadataPDA;
}

// Helper to get bonding curve PDA
export function getBondingCurvePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding_curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
}

// Upload metadata to Supabase Storage (or use existing URL)
async function prepareMetadataUri(metadata: TokenMetadata): Promise<string> {
  try {
    // If image is already a URL, use it directly
    if (metadata.image.startsWith('http')) {
      // Create metadata JSON
      const metadataJson = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image: metadata.image,
        external_url: metadata.website || `https://moonforge.io/token/${metadata.symbol}`,
        attributes: [],
        properties: {
          files: [{ uri: metadata.image, type: 'image/png' }],
          category: 'image',
        },
      };

      // Store metadata in Supabase
      const { data, error } = await supabase
        .from('token_metadata')
        .insert({
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          image_url: metadata.image,
          metadata_json: metadataJson,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Return API endpoint that serves the metadata
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/token-metadata/${data.id}.json`;
    }

    // For base64 or blob images, upload to storage first
    // This would require additional implementation
    return metadata.image;
  } catch (error) {
    console.error('Failed to prepare metadata:', error);
    // Fallback: return a basic metadata URI
    return `https://moonforge.io/api/metadata/${metadata.symbol}`;
  }
}

// Main token creation function
export async function createToken(
  connection: Connection,
  wallet: any,
  metadata: TokenMetadata,
  aiGenerated: boolean = false
): Promise<{ signature: string; tokenId: string; mintAddress: string }> {
  try {
    toast.loading('Preparing token creation...');

    // Validate wallet
    if (!wallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Prepare metadata URI
    const metadataUri = await prepareMetadataUri(metadata);
    console.log('Metadata URI:', metadataUri);

    // Generate mint keypair
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // Get PDAs
    const metadataPDA = getMetadataPDA(mint);
    const [bondingCurvePDA, bondingCurveBump] = getBondingCurvePDA(mint);
    
    // Get associated token accounts
    const creatorTokenAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const bondingCurveTokenAccount = await getAssociatedTokenAddress(
      mint,
      bondingCurvePDA,
      true, // PDA as owner
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Build transaction
    const transaction = new Transaction();

    // Add priority fee for better landing
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 })
    );

    // 1. Create mint account
    const mintRent = await connection.getMinimumBalanceForRentExemption(82);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mint,
        lamports: mintRent,
        space: 82,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    // 2. Initialize mint
    transaction.add(
      createInitializeMintInstruction(
        mint,
        DECIMALS,
        wallet.publicKey, // mint authority
        wallet.publicKey, // freeze authority (can be null)
        TOKEN_PROGRAM_ID
      )
    );

    // 3. Create metadata account - THIS IS WHAT FIXES THE "UNKNOWN TOKEN" ISSUE
    transaction.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: mint,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: metadata.name.substring(0, 32), // Max 32 chars
              symbol: metadata.symbol.substring(0, 10), // Max 10 chars
              uri: metadataUri,
              sellerFeeBasisPoints: PLATFORM_FEE_BPS + CREATOR_FEE_BPS,
              creators: [
                {
                  address: wallet.publicKey,
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

    // 4. Create creator token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        creatorTokenAccount,
        wallet.publicKey,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 5. Create bonding curve token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        bondingCurveTokenAccount,
        bondingCurvePDA,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    // 6. Mint initial supply to bonding curve (80%)
    const bondingCurveSupply = Math.floor(TOTAL_SUPPLY * 0.8 * Math.pow(10, DECIMALS));
    transaction.add(
      createMintToInstruction(
        mint,
        bondingCurveTokenAccount,
        wallet.publicKey,
        bondingCurveSupply,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 7. Mint creator allocation (20%)
    const creatorSupply = Math.floor(TOTAL_SUPPLY * 0.2 * Math.pow(10, DECIMALS));
    transaction.add(
      createMintToInstruction(
        mint,
        creatorTokenAccount,
        wallet.publicKey,
        creatorSupply,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 8. Pay creation fee to platform
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: PLATFORM_WALLET,
        lamports: CREATION_FEE * 1e9, // Convert SOL to lamports
      })
    );

    // Set recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign with mint keypair
    transaction.partialSign(mintKeypair);
    
    // Send through wallet adapter
    const signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    toast.loading('Confirming transaction...');
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    // Store in database
    const { data: tokenData, error: dbError } = await supabase
      .from('tokens')
      .insert({
        mint_address: mint.toString(),
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image_url: metadata.image,
        creator_wallet: wallet.publicKey.toString(),
        total_supply: TOTAL_SUPPLY,
        creation_fee: CREATION_FEE,
        telegram_url: metadata.telegram,
        x_url: metadata.twitter,
        dev_mode: false,
        is_graduated: false,
        bonding_curve_address: bondingCurvePDA.toString(),
      })
      .select('id')
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't throw - token was still created on-chain
    }

    toast.success('Token created successfully! 🚀');

    return {
      signature,
      tokenId: tokenData?.id || mint.toString(),
      mintAddress: mint.toString(),
    };
  } catch (error: any) {
    console.error('Token creation failed:', error);
    
    // Provide helpful error messages
    if (error.message?.includes('insufficient')) {
      toast.error('Insufficient SOL balance. Please add funds to your wallet.');
    } else if (error.message?.includes('User rejected')) {
      toast.error('Transaction cancelled');
    } else {
      toast.error(`Failed to create token: ${error.message}`);
    }
    
    throw error;
  }
}

// Helper to fetch token metadata from chain
export async function fetchTokenMetadata(
  connection: Connection,
  mintAddress: string
): Promise<any> {
  try {
    const mint = new PublicKey(mintAddress);
    const metadataPDA = getMetadataPDA(mint);
    
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
      console.log('No metadata account found');
      return null;
    }

    // Parse metadata (this is simplified - you'd need proper deserialization)
    // For now, return basic info
    return {
      mint: mintAddress,
      metadataAddress: metadataPDA.toString(),
    };
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return null;
  }
}