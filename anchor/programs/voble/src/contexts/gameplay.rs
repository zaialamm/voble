use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken; 
use anchor_spl::token_interface::{ self, Mint, TokenAccount, TokenInterface };

use crate::constants::*;
use crate::state::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};


#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct BuyTicketAndStartGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    pub mint: InterfaceAccount<'info, Mint>,


    
    #[account(
        mut,
        seeds = [SEED_USER_PROFILE, payer.key().as_ref()],
        bump
    )]
    pub user_profile: Box<Account<'info, UserProfile>>,
    
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump
    )]
    pub global_config: Box<Account<'info, GlobalConfig>>,
    
    // Prize vaults for payment distribution
    #[account(
        mut,
        seeds = [SEED_DAILY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = daily_prize_vault,
    )]
    pub daily_prize_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [SEED_WEEKLY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = weekly_prize_vault,
    )]
    pub weekly_prize_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [SEED_MONTHLY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = monthly_prize_vault,
    )]
    pub monthly_prize_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [SEED_PLATFORM_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = platform_vault,
    )]
    pub platform_vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [SEED_LUCKY_DRAW_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = lucky_draw_vault,
    )]
    pub lucky_draw_vault: Box<InterfaceAccount<'info, TokenAccount>>,
    
    #[account(
        mut,
        associated_token::mint = global_config.usdc_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program
    )]
    pub payer_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    
}

// Submit Guess
#[derive(Accounts)]
pub struct SubmitGuess<'info> {
    #[account(
        mut,
        seeds = [SEED_SESSION, session.player.as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    
}

/// Handler context for Magic Actions - updates leaderboard after game completion
#[derive(Accounts)]
pub struct UpdatePlayerStats<'info> {
    /// Daily leaderboard to update - THIRD
    #[account(mut)]
    pub daily_leaderboard: Account<'info, PeriodLeaderboard>,

    /// Weekly leaderboard to update - FOURTH
    #[account(mut)]
    pub weekly_leaderboard: Account<'info, PeriodLeaderboard>,

    /// Monthly leaderboard to update - FIFTH
    #[account(mut)]
    pub monthly_leaderboard: Account<'info, PeriodLeaderboard>,
    
    /// User profile to update stats - SIXTH
    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Committed session account (manually deserialized) - SEVENTH
    pub committed_session: UncheckedAccount<'info>,

    /// CHECK: Injected by Magic Actions (escrow authority) - SECOND
    pub escrow_auth: UncheckedAccount<'info>,
    
    /// CHECK: Injected by Magic Actions (escrow account) - FIRST
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    
}


/// Context for initializing session (one-time setup)
#[derive(Accounts)]
pub struct InitializeSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + SessionAccount::INIT_SPACE,
        seeds = [SEED_SESSION, payer.key().as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    
    pub system_program: Program<'info, System>,
}

/// Context for delegating session to ER
#[delegate]
#[derive(Accounts)]
pub struct DelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: Session PDA to delegate to ER
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RecordKeystroke<'info> {
    #[account(mut)]
    pub session: Account<'info, SessionAccount>,
}

#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct ResetSession<'info> {
    #[account(mut)]
    pub session: Account<'info, SessionAccount>,
    
    #[account(
        seeds = [SEED_USER_PROFILE, session.player.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

/// Context for undelegating session from ER
/// Only commits the session - does not update leaderboard or profile
#[commit]
#[derive(Accounts)]
pub struct UndelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: The actual player who owns the session
    pub player: AccountInfo<'info>,
    
    #[account(
        mut,
        seeds = [SEED_SESSION, player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,

}

#[commit]
#[derive(Accounts)]
#[instruction(
    daily_period_id: String,
    weekly_period_id: String,
    monthly_period_id: String
)]
pub struct CommitAndUpdateStats<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    /// CHECK: The actual player who owns the session
    pub player: AccountInfo<'info>,  

    #[account(
        mut,
        seeds = [SEED_SESSION, player.key().as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,

    /// CHECK: Daily leaderboard - not mut here, writable set in handler
    #[account(seeds = [SEED_LEADERBOARD, daily_period_id.as_bytes(), &[0]], bump)]
    pub daily_leaderboard: UncheckedAccount<'info>,

    /// CHECK: Weekly leaderboard - not mut here, writable set in handler
    #[account(seeds = [SEED_LEADERBOARD, weekly_period_id.as_bytes(), &[1]], bump)]
    pub weekly_leaderboard: UncheckedAccount<'info>,

    /// CHECK: Monthly leaderboard - not mut here, writable set in handler
    #[account(seeds = [SEED_LEADERBOARD, monthly_period_id.as_bytes(), &[2]], bump)]
    pub monthly_leaderboard: UncheckedAccount<'info>,
    
    /// CHECK: User profile - not mut here, writable set in handler
    #[account(seeds = [SEED_USER_PROFILE, player.key().as_ref()], bump)]
    pub user_profile: UncheckedAccount<'info>,

    /// CHECK: Your program ID
    pub program_id: AccountInfo<'info>,
}