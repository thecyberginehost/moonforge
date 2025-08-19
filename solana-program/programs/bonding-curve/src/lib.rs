use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("11111111111111111111111111111111"); // Will be updated after deployment

#[program]
pub mod bonding_curve {
    use super::*;

    /// Initialize a new bonding curve for a token
    /// Mints the entire bonding curve supply to the contract
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
        curve.graduation_threshold = 326 * LAMPORTS_PER_SOL; // 326 SOL (~$75k market cap)
        curve.total_fees_collected = 0;
        curve.creator_fees_pending = 0;
        curve.bump = ctx.bumps.bonding_curve;

        // Mint the entire bonding curve supply to the curve's token account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.curve_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::mint_to(cpi_ctx, bonding_curve_supply)?;

        emit!(CurveInitialized {
            mint: curve.mint,
            creator: curve.creator,
            virtual_sol_reserves,
            virtual_token_reserves,
            bonding_curve_supply,
        });

        Ok(())
    }

    /// Buy tokens with SOL
    pub fn buy(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(sol_amount > 0, BondingCurveError::InvalidAmount);

        // Calculate tokens to receive
        let tokens_out = calculate_buy_tokens(
            sol_amount,
            curve.virtual_sol_reserves + curve.real_sol_reserves,
            curve.virtual_token_reserves - curve.tokens_sold,
        )?;

        require!(tokens_out >= min_tokens_out, BondingCurveError::SlippageExceeded);
        require!(tokens_out <= curve.real_token_reserves, BondingCurveError::InsufficientTokens);

        // Calculate fees based on graduation status
        let (platform_fee_bps, creator_fee_bps, prize_pool_fee_bps, reserves_fee_bps) = 
            if curve.is_graduated {
                (50u16, 100u16, 30u16, 20u16)   // Post-graduation: 0.5% platform, 1% creator, 0.3% prize, 0.2% reserves
            } else {
                (100u16, 50u16, 30u16, 20u16)   // Pre-graduation: 1% platform, 0.5% creator, 0.3% prize, 0.2% reserves
            };
            
        let platform_fee = (sol_amount as u128 * platform_fee_bps as u128 / 10000) as u64;
        let creator_fee = (sol_amount as u128 * creator_fee_bps as u128 / 10000) as u64;
        let prize_pool_fee = (sol_amount as u128 * prize_pool_fee_bps as u128 / 10000) as u64;
        let reserves_fee = (sol_amount as u128 * reserves_fee_bps as u128 / 10000) as u64;
        let total_fees = platform_fee + creator_fee + prize_pool_fee + reserves_fee;
        let sol_to_curve = sol_amount - total_fees;

        // Transfer SOL from buyer to curve (minus fees)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_to_curve)?;

        // Transfer platform fee (1%)
        if platform_fee > 0 {
            let platform_transfer = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.platform_wallet.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(platform_transfer, platform_fee)?;
        }

        // Transfer creator fee (0.07%) - automatically distributed
        if creator_fee > 0 {
            let creator_transfer = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(creator_transfer, creator_fee)?;
        }

        // Transfer prize pool fee (0.02%)
        if prize_pool_fee > 0 {
            let prize_pool_transfer = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.prize_pool_wallet.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(prize_pool_transfer, prize_pool_fee)?;
        }

        // Transfer reserves fee (0.01%)
        if reserves_fee > 0 {
            let reserves_transfer = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.reserves_wallet.to_account_info(),
                },
            );
            anchor_lang::system_program::transfer(reserves_transfer, reserves_fee)?;
        }

        // Transfer tokens from curve to buyer
        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.curve_token_account.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.bonding_curve.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, tokens_out)?;

        // Update curve state
        curve.real_sol_reserves += sol_to_curve;
        curve.real_token_reserves -= tokens_out;
        curve.tokens_sold += tokens_out;
        curve.total_fees_collected += total_fees;
        curve.creator_fees_pending += creator_fee;

        // Check for graduation
        let total_sol_value = curve.real_sol_reserves + curve.virtual_sol_reserves;
        if total_sol_value >= curve.graduation_threshold && !curve.is_graduated {
            curve.is_graduated = true;
            emit!(TokenGraduated {
                mint: curve.mint,
                total_sol_raised: total_sol_value,
                tokens_sold: curve.tokens_sold,
            });
        }

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            mint: curve.mint,
            sol_amount,
            tokens_received: tokens_out,
            platform_fee,
            creator_fee,
            prize_pool_fee,
            reserves_fee,
        });

        Ok(())
    }

    /// Sell tokens for SOL
    pub fn sell(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(!curve.is_graduated, BondingCurveError::TokenGraduated);
        require!(token_amount > 0, BondingCurveError::InvalidAmount);

        // Calculate SOL to receive
        let sol_out = calculate_sell_sol(
            token_amount,
            curve.virtual_sol_reserves + curve.real_sol_reserves,
            curve.virtual_token_reserves - curve.tokens_sold,
        )?;

        require!(sol_out >= min_sol_out, BondingCurveError::SlippageExceeded);
        require!(sol_out <= curve.real_sol_reserves, BondingCurveError::InsufficientSol);

        // Calculate fees based on graduation status
        let (platform_fee_bps, creator_fee_bps) = 
            if curve.is_graduated {
                (50u16, 100u16)   // Post-graduation: 0.5% platform, 1% creator
            } else {
                (100u16, 50u16)   // Pre-graduation: 1% platform, 0.5% creator
            };
            
        let creator_fee = (sol_out as u128 * creator_fee_bps as u128 / 10000) as u64;
        let platform_fee = (sol_out as u128 * platform_fee_bps as u128 / 10000) as u64;
        let sol_to_seller = sol_out - creator_fee - platform_fee;

        // Transfer tokens from seller to curve
        let cpi_accounts = Transfer {
            from: ctx.accounts.seller_token_account.to_account_info(),
            to: ctx.accounts.curve_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, token_amount)?;

        // Transfer SOL from curve to seller (minus fees)
        let seeds = &[
            b"bonding_curve",
            curve.mint.as_ref(),
            &[curve.bump],
        ];
        let signer = &[&seeds[..]];

        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= sol_to_seller;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_to_seller;

        // Send creator fee
        if creator_fee > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= creator_fee;
            **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += creator_fee;
        }

        // Send platform fee
        if platform_fee > 0 {
            **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= platform_fee;
            **ctx.accounts.platform_wallet.to_account_info().try_borrow_mut_lamports()? += platform_fee;
        }

        // Update curve state
        curve.real_sol_reserves -= sol_out;
        curve.real_token_reserves += token_amount;
        curve.tokens_sold -= token_amount;
        curve.total_fees_collected += creator_fee + platform_fee;
        curve.creator_fees_pending += creator_fee;

        emit!(TokensSold {
            seller: ctx.accounts.seller.key(),
            mint: curve.mint,
            token_amount,
            sol_received: sol_to_seller,
            creator_fee,
            platform_fee,
        });

        Ok(())
    }

    /// Graduate token to external DEX (Raydium)
    /// This creates a liquidity pool with remaining tokens and SOL
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(curve.is_graduated, BondingCurveError::NotGraduated);
        require!(
            ctx.accounts.authority.key() == curve.creator || 
            ctx.accounts.authority.key() == ctx.accounts.platform_wallet.key(),
            BondingCurveError::Unauthorized
        );

        // In production, this would:
        // 1. Create a Raydium AMM pool
        // 2. Add remaining tokens and SOL as initial liquidity
        // 3. Burn LP tokens or send to creator
        // 4. Mark curve as fully graduated

        emit!(TokenFullyGraduated {
            mint: curve.mint,
            final_sol_reserves: curve.real_sol_reserves,
            remaining_tokens: curve.real_token_reserves,
        });

        Ok(())
    }

    /// Claim pending creator fees
    pub fn claim_creator_fees(ctx: Context<ClaimCreatorFees>) -> Result<()> {
        let curve = &mut ctx.accounts.bonding_curve;
        
        require!(ctx.accounts.creator.key() == curve.creator, BondingCurveError::Unauthorized);
        require!(curve.creator_fees_pending > 0, BondingCurveError::NoFeesToClaim);

        let fees_to_claim = curve.creator_fees_pending;
        curve.creator_fees_pending = 0;

        // Transfer pending fees to creator
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= fees_to_claim;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += fees_to_claim;

        emit!(CreatorFeesClaimed {
            creator: curve.creator,
            amount: fees_to_claim,
        });

        Ok(())
    }
}

// Math functions
fn calculate_buy_tokens(sol_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_sol_reserves = sol_reserves + sol_in;
    let new_token_reserves = k / (new_sol_reserves as u128);
    let tokens_out = token_reserves - (new_token_reserves as u64);
    
    require!(tokens_out > 0, BondingCurveError::InvalidCalculation);
    Ok(tokens_out)
}

fn calculate_sell_sol(token_in: u64, sol_reserves: u64, token_reserves: u64) -> Result<u64> {
    let k = (sol_reserves as u128) * (token_reserves as u128);
    let new_token_reserves = token_reserves + token_in;
    let new_sol_reserves = k / (new_token_reserves as u128);
    let sol_out = sol_reserves - (new_sol_reserves as u64);
    
    require!(sol_out > 0, BondingCurveError::InvalidCalculation);
    Ok(sol_out)
}

// Account structs
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
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    /// CHECK: Creator wallet for fee distribution
    #[account(mut, address = bonding_curve.creator)]
    pub creator: UncheckedAccount<'info>,
    
    /// CHECK: Platform wallet for fee distribution
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,
    
    /// CHECK: Prize pool wallet for fee distribution
    #[account(mut)]
    pub prize_pool_wallet: UncheckedAccount<'info>,
    
    /// CHECK: Reserves wallet for fee distribution
    #[account(mut)]
    pub reserves_wallet: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = bonding_curve.mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub seller: Signer<'info>,
    
    /// CHECK: Creator wallet for fee distribution
    #[account(mut, address = bonding_curve.creator)]
    pub creator: UncheckedAccount<'info>,
    
    /// CHECK: Platform wallet for fee distribution
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Graduate<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    pub authority: Signer<'info>,
    
    /// CHECK: Platform wallet for authorization check
    pub platform_wallet: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimCreatorFees<'info> {
    #[account(
        mut,
        seeds = [b"bonding_curve", bonding_curve.mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    #[account(mut, address = bonding_curve.creator)]
    pub creator: Signer<'info>,
}

#[account]
pub struct BondingCurve {
    pub mint: Pubkey,                    // Token mint address
    pub creator: Pubkey,                 // Token creator
    pub virtual_sol_reserves: u64,      // Virtual SOL for price calculation
    pub virtual_token_reserves: u64,    // Virtual tokens for price calculation
    pub real_sol_reserves: u64,         // Actual SOL held by curve
    pub real_token_reserves: u64,       // Actual tokens held by curve
    pub tokens_sold: u64,               // Total tokens sold
    pub is_graduated: bool,             // Whether token has graduated
    pub graduation_threshold: u64,      // SOL threshold for graduation
    pub total_fees_collected: u64,     // Total fees collected
    pub creator_fees_pending: u64,     // Creator fees available to claim
    pub bump: u8,                       // PDA bump
}

impl BondingCurve {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 8 + 1;
}

// Events
#[event]
pub struct CurveInitialized {
    pub mint: Pubkey,
    pub creator: Pubkey,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub bonding_curve_supply: u64,
}

#[event]
pub struct TokensPurchased {
    pub buyer: Pubkey,
    pub mint: Pubkey,
    pub sol_amount: u64,
    pub tokens_received: u64,
    pub platform_fee: u64,
    pub creator_fee: u64,
    pub prize_pool_fee: u64,
    pub reserves_fee: u64,
}

#[event]
pub struct TokensSold {
    pub seller: Pubkey,
    pub mint: Pubkey,
    pub token_amount: u64,
    pub sol_received: u64,
    pub creator_fee: u64,
    pub platform_fee: u64,
}

#[event]
pub struct TokenGraduated {
    pub mint: Pubkey,
    pub total_sol_raised: u64,
    pub tokens_sold: u64,
}

#[event]
pub struct TokenFullyGraduated {
    pub mint: Pubkey,
    pub final_sol_reserves: u64,
    pub remaining_tokens: u64,
}

#[event]
pub struct CreatorFeesClaimed {
    pub creator: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum BondingCurveError {
    #[msg("Token has already graduated")]
    TokenGraduated,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Insufficient tokens in curve")]
    InsufficientTokens,
    #[msg("Insufficient SOL in curve")]
    InsufficientSol,
    #[msg("Token has not graduated yet")]
    NotGraduated,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Fee rate too high (max 10%)")]
    FeeTooHigh,
    #[msg("Invalid calculation result")]
    InvalidCalculation,
    #[msg("No fees available to claim")]
    NoFeesToClaim,
}