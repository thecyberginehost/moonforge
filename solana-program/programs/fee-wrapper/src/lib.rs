use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("11111111111111111111111111111111");

#[program]
pub mod fee_wrapper {
    use super::*;

    /// Initialize wrapper for a graduated token
    pub fn initialize_wrapper(
        ctx: Context<InitializeWrapper>,
        token_mint: Pubkey,
        creator_wallet: Pubkey,
        platform_fee_bps: u16,
        creator_fee_bps: u16,
    ) -> Result<()> {
        let wrapper = &mut ctx.accounts.wrapper;
        wrapper.token_mint = token_mint;
        wrapper.creator_wallet = creator_wallet;
        wrapper.platform_fee_bps = platform_fee_bps;
        wrapper.creator_fee_bps = creator_fee_bps;
        wrapper.total_volume = 0;
        wrapper.total_fees_collected = 0;
        wrapper.creator_fees_earned = 0;
        wrapper.platform_fees_earned = 0;
        wrapper.is_active = true;
        wrapper.created_at = Clock::get()?.unix_timestamp;
        
        emit!(WrapperInitialized {
            wrapper: wrapper.key(),
            token_mint,
            creator_wallet,
            platform_fee_bps,
            creator_fee_bps,
        });
        
        Ok(())
    }

    /// Execute wrapped trade with fee collection
    pub fn execute_wrapper_trade(
        ctx: Context<ExecuteWrapperTrade>,
        trade_amount: u64,
        trade_type: TradeType,
    ) -> Result<()> {
        let wrapper = &mut ctx.accounts.wrapper;
        
        require!(wrapper.is_active, ErrorCode::WrapperInactive);
        
        // Calculate fees
        let total_fee_bps = wrapper.platform_fee_bps + wrapper.creator_fee_bps;
        let total_fees = (trade_amount as u128 * total_fee_bps as u128 / 10000) as u64;
        let platform_fee = (total_fees as u128 * wrapper.platform_fee_bps as u128 / total_fee_bps as u128) as u64;
        let creator_fee = total_fees - platform_fee;
        let trade_amount_after_fees = trade_amount - total_fees;

        // Transfer platform fee
        if platform_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_sol_account.to_account_info(),
                to: ctx.accounts.platform_fee_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, platform_fee)?;
        }

        // Transfer creator fee
        if creator_fee > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.user_sol_account.to_account_info(),
                to: ctx.accounts.creator_fee_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_ctx, creator_fee)?;
        }

        // Update wrapper stats
        wrapper.total_volume = wrapper.total_volume.checked_add(trade_amount).unwrap();
        wrapper.total_fees_collected = wrapper.total_fees_collected.checked_add(total_fees).unwrap();
        wrapper.platform_fees_earned = wrapper.platform_fees_earned.checked_add(platform_fee).unwrap();
        wrapper.creator_fees_earned = wrapper.creator_fees_earned.checked_add(creator_fee).unwrap();

        emit!(WrapperTradeExecuted {
            wrapper: wrapper.key(),
            user: ctx.accounts.user.key(),
            trade_amount,
            trade_amount_after_fees,
            total_fees,
            platform_fee,
            creator_fee,
            trade_type,
        });

        Ok(())
    }

    /// Update wrapper status
    pub fn update_wrapper_status(
        ctx: Context<UpdateWrapperStatus>,
        is_active: bool,
    ) -> Result<()> {
        let wrapper = &mut ctx.accounts.wrapper;
        wrapper.is_active = is_active;
        
        emit!(WrapperStatusUpdated {
            wrapper: wrapper.key(),
            is_active,
        });
        
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeType {
    Buy,
    Sell,
}

#[derive(Accounts)]
#[instruction(token_mint: Pubkey)]
pub struct InitializeWrapper<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + FeeWrapper::INIT_SPACE,
        seeds = [b"wrapper", token_mint.as_ref()],
        bump
    )]
    pub wrapper: Account<'info, FeeWrapper>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteWrapperTrade<'info> {
    #[account(
        mut,
        seeds = [b"wrapper", wrapper.token_mint.as_ref()],
        bump
    )]
    pub wrapper: Account<'info, FeeWrapper>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_sol_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub platform_fee_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator_fee_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateWrapperStatus<'info> {
    #[account(
        mut,
        seeds = [b"wrapper", wrapper.token_mint.as_ref()],
        bump,
        has_one = creator_wallet @ ErrorCode::Unauthorized
    )]
    pub wrapper: Account<'info, FeeWrapper>,
    
    pub creator_wallet: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct FeeWrapper {
    pub token_mint: Pubkey,
    pub creator_wallet: Pubkey,
    pub platform_fee_bps: u16,
    pub creator_fee_bps: u16,
    pub total_volume: u64,
    pub total_fees_collected: u64,
    pub creator_fees_earned: u64,
    pub platform_fees_earned: u64,
    pub is_active: bool,
    pub created_at: i64,
}

#[event]
pub struct WrapperInitialized {
    pub wrapper: Pubkey,
    pub token_mint: Pubkey,
    pub creator_wallet: Pubkey,
    pub platform_fee_bps: u16,
    pub creator_fee_bps: u16,
}

#[event]
pub struct WrapperTradeExecuted {
    pub wrapper: Pubkey,
    pub user: Pubkey,
    pub trade_amount: u64,
    pub trade_amount_after_fees: u64,
    pub total_fees: u64,
    pub platform_fee: u64,
    pub creator_fee: u64,
    pub trade_type: TradeType,
}

#[event]
pub struct WrapperStatusUpdated {
    pub wrapper: Pubkey,
    pub is_active: bool,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Wrapper is inactive")]
    WrapperInactive,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid fee percentage")]
    InvalidFeePercentage,
}