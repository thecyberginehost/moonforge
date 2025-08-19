import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BondingCurve } from "./target/types/bonding_curve";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

// Production bonding curve parameters
export const BONDING_CURVE_CONFIG = {
  VIRTUAL_SOL_RESERVES: 30 * LAMPORTS_PER_SOL,        // 30 SOL
  VIRTUAL_TOKEN_RESERVES: 1_073_000_000 * 1e9,       // 1.073B tokens (with 9 decimals)
  BONDING_CURVE_SUPPLY: 800_000_000 * 1e9,           // 800M tokens for bonding curve
  CREATOR_SUPPLY: 200_000_000 * 1e9,                 // 200M tokens for creator
  GRADUATION_THRESHOLD: 85_000 * LAMPORTS_PER_SOL,   // 85k SOL
  DEFAULT_CREATOR_FEE_BPS: 200,                      // 2%
  DEFAULT_PLATFORM_FEE_BPS: 100,                     // 1%
};

export class BondingCurveClient {
  program: Program<BondingCurve>;
  provider: anchor.AnchorProvider;

  constructor(provider: anchor.AnchorProvider, programId: PublicKey) {
    this.provider = provider;
    this.program = new Program({} as BondingCurve, programId, provider);
  }

  /**
   * Get the PDA address for a bonding curve
   */
  static getBondingCurvePDA(mint: PublicKey, programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("bonding_curve"), mint.toBuffer()],
      programId
    );
  }

  /**
   * Buy tokens with SOL
   */
  async buyTokens(
    mint: PublicKey,
    buyer: Keypair,
    solAmount: number,
    slippageBps: number = 500, // 5% slippage
    platformWallet: PublicKey
  ): Promise<string> {
    const [bondingCurve] = BondingCurveClient.getBondingCurvePDA(
      mint,
      this.program.programId
    );

    const curveData = await this.getBondingCurve(mint);
    const creator = curveData.creator;

    // Calculate expected tokens with slippage
    const tokensOut = this.calculateBuy(
      solAmount,
      curveData.realSolReserves.toNumber() / LAMPORTS_PER_SOL,
      curveData.tokensSold.toNumber() / 1e9
    );
    const minTokensOut = Math.floor(tokensOut * (10000 - slippageBps) / 10000 * 1e9);

    const curveTokenAccount = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

    const buyerTokenAccount = await getAssociatedTokenAddress(
      mint,
      buyer.publicKey
    );

    return await this.program.methods
      .buy(
        new anchor.BN(solAmount * LAMPORTS_PER_SOL),
        new anchor.BN(minTokensOut)
      )
      .accounts({
        bondingCurve,
        curveTokenAccount,
        buyerTokenAccount,
        buyer: buyer.publicKey,
        creator,
        platformWallet,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer])
      .rpc();
  }

  /**
   * Get bonding curve state
   */
  async getBondingCurve(mint: PublicKey) {
    const [bondingCurve] = BondingCurveClient.getBondingCurvePDA(
      mint,
      this.program.programId
    );
    return await this.program.account.bondingCurve.fetch(bondingCurve);
  }

  /**
   * Calculate tokens received for SOL input
   */
  calculateBuy(solIn: number, solReserves: number, tokensSold: number): number {
    const virtualSol = BONDING_CURVE_CONFIG.VIRTUAL_SOL_RESERVES / LAMPORTS_PER_SOL;
    const virtualTokens = BONDING_CURVE_CONFIG.VIRTUAL_TOKEN_RESERVES / 1e9;
    
    const currentVirtualSol = virtualSol + solReserves;
    const currentVirtualTokens = virtualTokens - tokensSold;
    
    const k = currentVirtualSol * currentVirtualTokens;
    const newVirtualSol = currentVirtualSol + solIn;
    const newVirtualTokens = k / newVirtualSol;
    
    return currentVirtualTokens - newVirtualTokens;
  }
}