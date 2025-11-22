use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use anchor_spl::token_interface::{self, TokenInterface, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

/// Finalize daily period
#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct FinalizeDaily<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + PeriodState::INIT_SPACE,
        seeds = [SEED_DAILY_PERIOD, period_id.as_bytes()],
        bump
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        seeds = [SEED_DAILY_PRIZE_VAULT],
        bump
    )]
    /// CHECK: This is a PDA vault account
    pub daily_prize_vault: AccountInfo<'info>,

    /// Leaderboard to get top winners
    #[account(
        mut,
        seeds = [SEED_LEADERBOARD, period_id.as_bytes(), &[0]],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Finalize weekly period
#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct FinalizeWeekly<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + PeriodState::INIT_SPACE,
        seeds = [SEED_WEEKLY_PERIOD, period_id.as_bytes()],
        bump
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        seeds = [SEED_WEEKLY_PRIZE_VAULT],
        bump
    )]
    /// CHECK: This is a PDA vault account
    pub weekly_prize_vault: AccountInfo<'info>,

    /// Leaderboard to get top winners
    #[account(
        mut,
        seeds = [SEED_LEADERBOARD, period_id.as_bytes(), &[1]],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Finalize monthly period
#[derive(Accounts)]
#[instruction(period_id: String)]
pub struct FinalizeMonthly<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + PeriodState::INIT_SPACE,
        seeds = [SEED_MONTHLY_PERIOD, period_id.as_bytes()],
        bump
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        seeds = [SEED_MONTHLY_PRIZE_VAULT],
        bump
    )]
    /// CHECK: This is a PDA vault account
    pub monthly_prize_vault: AccountInfo<'info>,

    /// Leaderboard to get top winners
    #[account(
        mut,
        seeds = [SEED_LEADERBOARD, period_id.as_bytes(), &[2]],
        bump
    )]
    pub leaderboard: Account<'info, PeriodLeaderboard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimDaily<'info> {
    #[account(
        mut,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"daily", winner_entitlement.period_id.as_ref()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    #[account(
        mut,
        seeds = [SEED_DAILY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = daily_prize_vault,
    )]
    pub daily_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        init_if_needed,
        payer = winner,
        associated_token::mint = usdc_mint,
        associated_token::authority = winner,
        associated_token::token_program = token_program
    )]
    pub winner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct ClaimWeekly<'info> {
    #[account(
        mut,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"weekly", winner_entitlement.period_id.as_ref()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    #[account(
        mut,
        seeds = [SEED_WEEKLY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = weekly_prize_vault,
    )]
    pub weekly_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = winner,
        associated_token::token_program = token_program
    )]
    pub winner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct ClaimMonthly<'info> {
    #[account(
        mut,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"monthly", winner_entitlement.period_id.as_ref()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    #[account(
        mut,
        seeds = [SEED_MONTHLY_PRIZE_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = monthly_prize_vault,
    )]
    pub monthly_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,

    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = winner,
        associated_token::token_program = token_program
    )]
    pub winner_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub usdc_mint: InterfaceAccount<'info, Mint>,
}

/// Create daily winner entitlement
#[derive(Accounts)]
#[instruction(period_id: String, rank: u8)]
pub struct CreateDailyWinnerEntitlement<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        seeds = [SEED_DAILY_PERIOD, period_id.as_bytes()],
        bump,
        constraint = period_state.finalized @ crate::errors::VobleError::InvalidPeriodState
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        init,
        payer = authority,
        space = 8 + WinnerEntitlement::INIT_SPACE,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"daily", period_id.as_bytes()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    /// CHECK: Winner's public key
    pub winner: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Create weekly winner entitlement
#[derive(Accounts)]
#[instruction(period_id: String, rank: u8)]
pub struct CreateWeeklyWinnerEntitlement<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        seeds = [SEED_WEEKLY_PERIOD, period_id.as_bytes()],
        bump,
        constraint = period_state.finalized @ crate::errors::VobleError::InvalidPeriodState
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        init,
        payer = authority,
        space = 8 + WinnerEntitlement::INIT_SPACE,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"weekly", period_id.as_bytes()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    /// CHECK: Winner's public key
    pub winner: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Create monthly winner entitlement
#[derive(Accounts)]
#[instruction(period_id: String, rank: u8)]
pub struct CreateMonthlyWinnerEntitlement<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        seeds = [SEED_MONTHLY_PERIOD, period_id.as_bytes()],
        bump,
        constraint = period_state.finalized @ crate::errors::VobleError::InvalidPeriodState
    )]
    pub period_state: Account<'info, PeriodState>,

    #[account(
        init,
        payer = authority,
        space = 8 + WinnerEntitlement::INIT_SPACE,
        seeds = [SEED_WINNER_ENTITLEMENT, winner.key().as_ref(), b"monthly", period_id.as_bytes()],
        bump
    )]
    pub winner_entitlement: Account<'info, WinnerEntitlement>,

    /// CHECK: Winner's public key
    pub winner: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
