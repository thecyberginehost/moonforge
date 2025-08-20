use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod bonding_curve {
    use super::*;

    const LAMPORTS_PER_SOL: u64 = 1_000_000_000;

    pub fn initialize_curve(
        ctx: Context<InitializeCurve>,
        virtual_sol_reserves: u64,
        virtual_token_reserves: u64,
        bonding_curve_supply: u64,
    ) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        curve.mint = ctx.accounts.mint.key();
        curve.creator = ctx.accounts.creator.key();
        curve.virtual_sol_reserves = virtual_sol_reserves;
        curve.virtual_token_reserves = virtual_token_reserves;
        curve.real_sol_reserves = 0;
        curve.real_token_reserves = bonding_curve_supply;
        curve.tokens_sold = 0;
        curve.is_graduated = false;
        curve.graduation_threshold = 326 * LAMPORTS_PER_SOL;
        curve.total_fees_collected = 0;
        curve.creator_fees_pending = 0;
        curve.bump = ctx.bumps.bonding_curve;

        msg!("Curve initialized for mint: {}", curve.mint);
        Ok(())
    }

    pub fn buy(ctx: Context<BuyTokens>, sol_amount: u64, _min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(sol_amount > 0, BondingCurveError::InvalidAmount);

        // Simplified calculation for now
        let tokens_out = sol_amount * 1000; // Simple 1:1000 ratio for testing
        
        curve.real_sol_reserves += sol_amount;
        curve.real_token_reserves = curve.real_token_reserves.saturating_sub(tokens_out);
        curve.tokens_sold += tokens_out;

        msg!("Bought {} tokens for {} SOL", tokens_out, sol_amount);
        Ok(())
    }

    pub fn sell(ctx: Context<SellTokens>, token_amount: u64, _min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(token_amount > 0, BondingCurveError::InvalidAmount);

        // Simplified calculation for now
        let sol_out = token_amount / 1000; // Simple 1000:1 ratio for testing
        
        curve.real_sol_reserves = curve.real_sol_reserves.saturating_sub(sol_out);
        curve.real_token_reserves += token_amount;
        curve.tokens_sold = curve.tokens_sold.saturating_sub(token_amount);

        msg!("Sold {} tokens for {} SOL", token_amount, sol_out);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCurve<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::LEN,
        seeds = [b"bonding_curve", mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub tokens_sold: u64,
    pub is_graduated: bool,
    pub graduation_threshold: u64,
    pub total_fees_collected: u64,
    pub creator_fees_pending: u64,
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 1;
}

#[error_code]
pub enum BondingCurveError {
    #[msg("Token has already graduated")]
    TokenGraduated,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
}
