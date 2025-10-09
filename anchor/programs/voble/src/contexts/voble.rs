use anchor_lang::prelude::*;
use crate::state::*;
use session_keys::{Session, SessionToken};

// Voble Contexts

// Unified context for buying ticket and starting game
#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct BuyTicketAndStartGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"user_profile", player.key().as_ref()],
        bump
    )]
    /// CHECK: User profile can be delegated to ER, so we use AccountInfo
    pub user_profile: AccountInfo<'info>,
    #[account(
        init,
        payer = player,
        space = 8 + SessionAccount::INIT_SPACE,
        seeds = [b"session", player.key().as_ref(), period_id.as_bytes()],
        bump
    )]
    pub session: Account<'info, SessionAccount>,
    #[account(
        seeds = [b"global_config_v2"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    // Prize vaults for payment distribution
    #[account(
        mut,
        seeds = [b"daily_prize_vault"],
        bump
    )]
    /// CHECK: Daily prize vault PDA
    pub daily_prize_vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"weekly_prize_vault"],
        bump
    )]
    /// CHECK: Weekly prize vault PDA
    pub weekly_prize_vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"monthly_prize_vault"],
        bump
    )]
    /// CHECK: Monthly prize vault PDA
    pub monthly_prize_vault: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [b"platform_vault"],
        bump
    )]
    /// CHECK: Platform revenue vault PDA
    pub platform_vault: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts, Session)]
#[instruction(period_id: String)]
pub struct SubmitGuess<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", signer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"session", signer.key().as_ref(), period_id.as_bytes()],
        bump,
        constraint = session.player == signer.key()
    )]
    pub session: Account<'info, SessionAccount>,
    
    #[session(
        signer = signer,
        authority = user_profile.player.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts, Session)]
#[instruction(period_id: String)]
pub struct CompleteGame<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", signer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(
        mut,
        seeds = [b"session", signer.key().as_ref(), period_id.as_bytes()],
        bump,
        constraint = session.player == signer.key(),
        close = signer
    )]
    pub session: Account<'info, SessionAccount>,
    
    /// Leaderboard for auto-update after game completion
    #[account(
        mut,
        seeds = [b"leaderboard", period_id.as_bytes(), b"daily"],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,
    
    #[session(
        signer = signer,
        authority = user_profile.player.key()
    )]
    pub session_token: Option<Account<'info, SessionToken>>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
}
