use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize period leaderboard
#[derive(Accounts)]
#[instruction(period_id: String, period_type: u8)]
pub struct InitializePeriodLeaderboard<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + PeriodLeaderboard::INIT_SPACE,
        seeds = [
            b"leaderboard",
            period_id.as_bytes(),
            &[period_type]
        ],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,
    
    #[account(
        seeds = [b"global_config_v2"],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Update leaderboard with new score
#[derive(Accounts)]
#[instruction(period_id: String, period_type: u8)]
pub struct UpdateLeaderboard<'info> {
    #[account(
        mut,
        seeds = [
            b"leaderboard",
            period_id.as_bytes(),
            &[period_type]
        ],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,
    
    #[account(
        seeds = [b"user_profile", player.key().as_ref()],
        bump,
        has_one = player
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Player who achieved the score
    pub player: UncheckedAccount<'info>,
}

/// Finalize leaderboard for period
#[derive(Accounts)]
#[instruction(period_id: String, period_type: u8)]
pub struct FinalizeLeaderboard<'info> {
    #[account(
        mut,
        seeds = [
            b"leaderboard",
            period_id.as_bytes(),
            &[period_type]
        ],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,
    
    #[account(
        seeds = [b"global_config_v2"],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}
