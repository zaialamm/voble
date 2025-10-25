use anchor_lang::prelude::*;
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
    
    pub system_program: Program<'info, System>,
    
}

#[derive(Accounts)]
pub struct SubmitGuess<'info> {

    #[account(
        mut,
        seeds = [SEED_SESSION, session.player.as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    
}

#[commit]
#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct CompleteGame<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [SEED_USER_PROFILE, session.player.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [SEED_SESSION, session.player.as_ref()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    
    #[account(
        mut,
        seeds = [SEED_LEADERBOARD, period_id.as_bytes(), b"daily"],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,
    
}

#[derive(Accounts)]
pub struct UpdateProfileHandler<'info> {
    /// CHECK: Injected by ER
    #[account(mut)]
    pub escrow: UncheckedAccount<'info>,
    
    /// CHECK: Injected by ER
    pub escrow_auth: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [SEED_USER_PROFILE, user_profile.player.as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Committed session account
    pub committed_session: UncheckedAccount<'info>,
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

    /// CHECK: Checked by the delegate program
    pub validator: Option<AccountInfo<'info>>,
    
    /// CHECK: Session PDA to delegate to ER
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

/// Context for undelegating session from ER
#[commit]
#[derive(Accounts)]
pub struct UndelegateSession<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(mut)]
    pub session: Account<'info, SessionAccount>,


}