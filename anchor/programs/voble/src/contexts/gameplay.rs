use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken; 
use anchor_spl::token_interface::
{
    self, Mint, TokenAccount, 
    TokenInterface, TransferChecked
};

use crate::constants::*;
use crate::state::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};


#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct BuyTicketAndStartGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        seeds = [SEED_USER_PROFILE, payer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [SEED_SESSION, payer.key().as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    // Prize vaults for payment distribution
    #[account(
        mut,
        seeds = [SEED_DAILY_PRIZE_VAULT],
        bump
    )]

    /// CHECK: Daily prize vault PDA
    pub daily_prize_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_WEEKLY_PRIZE_VAULT],
        bump
    )]

    /// CHECK: Weekly prize vault PDA
    pub weekly_prize_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_MONTHLY_PRIZE_VAULT],
        bump
    )]

    /// CHECK: Monthly prize vault PDA
    pub monthly_prize_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_PLATFORM_VAULT],
        bump
    )]

    /// CHECK: Platform revenue vault PDA
    pub platform_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [SEED_LUCKY_DRAW_VAULT],
        bump
    )]

    /// CHECK: Lucky draw vault PDA
    pub lucky_draw_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    
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