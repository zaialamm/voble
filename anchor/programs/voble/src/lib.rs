use anchor_lang::prelude::*;
use anchor_lang::{Discriminator};
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod constants;
pub mod contexts;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use contexts::*;
pub use constants::*;
pub use events::*;
pub use state::*;

// Import instruction modules
use instructions::admin;
use instructions::game;
use instructions::leaderboard;
use instructions::prize;
use instructions::profile;


declare_id!("B4WnYsj1AoX2dNdgXyzKDEZCjmVqNT8fBc8DPoHn8P2C");

#[ephemeral]
#[program]
pub mod voble {
    use super::*;
    use crate::contexts::leaderboard::{FinalizeLeaderboard, InitializePeriodLeaderboard};

    // Admin instructions
    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        ticket_price: u64,
        prize_split_daily: u16,
        prize_split_weekly: u16,
        prize_split_monthly: u16,
        platform_revenue_split: u16,
        lucky_draw_split: u16,
        winner_splits: Vec<u16>,
    ) -> Result<()> {
        admin::initialize_global_config(
            ctx,
            ticket_price,
            prize_split_daily,
            prize_split_weekly,
            prize_split_monthly,
            platform_revenue_split,
            lucky_draw_split,
            winner_splits,
        )
    }

    pub fn set_config(
        ctx: Context<SetConfig>,
        ticket_price: Option<u64>,
        paused: Option<bool>,
    ) -> Result<()> {
        admin::set_config(ctx, ticket_price, paused)
    }

    pub fn initialize_vaults(ctx: Context<InitializeVaults>) -> Result<()> {
        admin::initialize_vaults(ctx)
    }

    pub fn withdraw_platform_revenue(
        ctx: Context<WithdrawPlatformRevenue>,
        amount: Option<u64>,
    ) -> Result<()> {
        admin::withdraw_platform_revenue(ctx, amount)
    }

    // Core Wordle Game Instructions
    pub fn initialize_user_profile(
        ctx: Context<InitializeUserProfile>,
        username: String,
    ) -> Result<()> {
        profile::initialize_user_profile(ctx, username)
    }

    // Prize instructions
    // Note: finalize_period_with_leaderboard removed due to Anchor limitation with runtime match in seeds
    // Use finalize_daily, finalize_weekly, finalize_monthly instead

    pub fn finalize_daily(ctx: Context<FinalizeDaily>, period_id: String) -> Result<()> {
        prize::finalize_daily(ctx, period_id)
    }

    pub fn finalize_weekly(ctx: Context<FinalizeWeekly>, period_id: String) -> Result<()> {
        prize::finalize_weekly(ctx, period_id)
    }

    pub fn finalize_monthly(ctx: Context<FinalizeMonthly>, period_id: String) -> Result<()> {
        prize::finalize_monthly(ctx, period_id)
    }

    pub fn claim_daily(ctx: Context<ClaimDaily>) -> Result<()> {
        prize::claim_daily(ctx)
    }

    pub fn claim_weekly(ctx: Context<ClaimWeekly>) -> Result<()> {
        prize::claim_weekly(ctx)
    }

    pub fn claim_monthly(ctx: Context<ClaimMonthly>) -> Result<()> {
        prize::claim_monthly(ctx)
    }

    pub fn create_daily_winner_entitlement(
        ctx: Context<CreateDailyWinnerEntitlement>,
        period_id: String,
        rank: u8,
        amount: u64,
    ) -> Result<()> {
        prize::create_daily_winner_entitlement(ctx, period_id, rank, amount)
    }

    pub fn create_weekly_winner_entitlement(
        ctx: Context<CreateWeeklyWinnerEntitlement>,
        period_id: String,
        rank: u8,
        amount: u64,
    ) -> Result<()> {
        prize::create_weekly_winner_entitlement(ctx, period_id, rank, amount)
    }

    pub fn create_monthly_winner_entitlement(
        ctx: Context<CreateMonthlyWinnerEntitlement>,
        period_id: String,
        rank: u8,
        amount: u64,
    ) -> Result<()> {
        prize::create_monthly_winner_entitlement(ctx, period_id, rank, amount)
    }

    // Leaderboard functions
    pub fn initialize_period_leaderboard(
        ctx: Context<InitializePeriodLeaderboard>,
        period_id: String,
        period_type: u8,
    ) -> Result<()> {
        leaderboard::initialize_period_leaderboard(ctx, period_id, period_type)
    }

    pub fn finalize_leaderboard(
        ctx: Context<FinalizeLeaderboard>,
        period_id: String,
        period_type: u8,
    ) -> Result<()> {
        leaderboard::finalize_leaderboard(ctx, period_id, period_type)
    }

    // Voble game functions

    /// Initialize session account (one-time setup)
    pub fn initialize_session(ctx: Context<InitializeSession>) -> Result<()> {
        game::initialize_session(ctx)
    }

    /// Buy ticket and start game in one transaction (RECOMMENDED)
    pub fn buy_ticket_and_start_game(
        ctx: Context<BuyTicketAndStartGame>,
        period_id: String,
    ) -> Result<()> {
        game::buy_ticket_and_start_game(ctx, period_id)
    }

    /// Delegate session to Ephemeral Rollup
    pub fn delegate_session(ctx: Context<DelegateSession>) -> Result<()> {
        game::delegate_session(ctx)
    }

    pub fn record_keystroke(ctx: Context<RecordKeystroke>, key: String) -> Result<()> {
        game::record_keystroke(ctx, key)
    }

    /// Reset session state after commit, before undelegation
    pub fn reset_session(ctx: Context<RecordKeystroke>) -> Result<()> {
        game::reset_session(ctx)
    }

    pub fn submit_guess(ctx: Context<SubmitGuess>, period_id: String, guess: String) -> Result<()> {
        game::submit_guess(ctx, period_id, guess)
    }

    pub fn update_player_stats(ctx: Context<UpdatePlayerStats>) -> Result<()> {
        game::update_player_stats(ctx)
    }

    /// Undelegate session from Ephemeral Rollup  
    pub fn undelegate_session(ctx: Context<UndelegateSession>) -> Result<()> {
        game::undelegate_session(ctx)
    }

    pub fn commit_and_update_stats(
        ctx: Context<CommitAndUpdateStats>,
        daily_period_id: String,
        weekly_period_id: String,
        monthly_period_id: String,
    ) -> Result<()> {
        game::commit_and_update_stats(ctx, daily_period_id, weekly_period_id, monthly_period_id)
    }


}
