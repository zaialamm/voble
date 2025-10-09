use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub mod contexts;
pub mod instructions;
pub mod state;
pub mod errors;
pub mod events;

use contexts::*;
use contexts::voble::{BuyTicketAndStartGame, SubmitGuess, CompleteGame};
// Import instruction functions explicitly to avoid ambiguity
use instructions::admin;
use instructions::game::{self, voble as voble_game};
use instructions::prize;
use instructions::leaderboard;
pub use events::*;

declare_id!("AmDAGNow7v26x6g7XE8FYgboEezpzSdS1dW5ZR4DRrJk");

#[ephemeral]
#[program]
pub mod voble {
    use super::*;
    use crate::contexts::leaderboard::{InitializePeriodLeaderboard, UpdateLeaderboard, FinalizeLeaderboard};

    // Admin instructions
    pub fn initialize_global_config(
        ctx: Context<InitializeGlobalConfig>,
        ticket_price: u64,
        prize_split_daily: u16,
        prize_split_weekly: u16,
        prize_split_monthly: u16,
        platform_revenue_split: u16,
        winner_splits: Vec<u16>,
    ) -> Result<()> {
        admin::initialize_global_config(
            ctx,
            ticket_price,
            prize_split_daily,
            prize_split_weekly,
            prize_split_monthly,
            platform_revenue_split,
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
        game::profile::initialize_user_profile(ctx, username)
    }

    // Delegation instructions for Ephemeral Rollups
    pub fn delegate_user_profile(
        ctx: Context<DelegateUserProfile>,
        commit_frequency_ms: u32,
    ) -> Result<()> {
        game::profile::delegate_user_profile(ctx, commit_frequency_ms)
    }

    pub fn undelegate_user_profile(ctx: Context<UndelegateUserProfile>) -> Result<()> {
        game::profile::undelegate_user_profile(ctx)
    }

    pub fn commit_user_profile(ctx: Context<CommitUserProfile>) -> Result<()> {
        game::profile::commit_user_profile(ctx)
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

    // Enhanced prize instructions with automatic winner determination
    pub fn finalize_daily_with_winners(
        ctx: Context<FinalizeDailyWithWinners>,
        period_id: String,
        winners: Vec<Pubkey>,
        scores: Vec<prize::LeaderboardScore>,
    ) -> Result<()> {
        prize::finalize_daily_with_winners(ctx, period_id, winners, scores)
    }

    // Leaderboard functions
    pub fn initialize_period_leaderboard(
        ctx: Context<InitializePeriodLeaderboard>,
        period_id: String,
        period_type: u8,
    ) -> Result<()> {
        leaderboard::initialize_period_leaderboard(ctx, period_id, period_type)
    }

    pub fn update_leaderboard(
        ctx: Context<UpdateLeaderboard>,
        period_id: String,
        period_type: u8,
        score: u32,
        guesses_used: u8,
        time_ms: u64,
    ) -> Result<()> {
        leaderboard::update_leaderboard(ctx, period_id, period_type, score, guesses_used, time_ms)
    }

    pub fn finalize_leaderboard(
        ctx: Context<FinalizeLeaderboard>,
        period_id: String,
        period_type: u8,
    ) -> Result<()> {
        leaderboard::finalize_leaderboard(ctx, period_id, period_type)
    }

    pub fn get_leaderboard(
        ctx: Context<UpdateLeaderboard>,
        period_id: String,
        period_type: u8,
    ) -> Result<()> {
        leaderboard::get_leaderboard(ctx, period_id, period_type)
    }

    // Voble game functions
    
    /// Buy ticket and start game in one transaction (RECOMMENDED)
    pub fn buy_ticket_and_start_game(
        ctx: Context<BuyTicketAndStartGame>,
        period_id: String,
    ) -> Result<()> {
        voble_game::buy_ticket_and_start_game(ctx, period_id)
    }

    pub fn submit_guess(
        ctx: Context<SubmitGuess>,
        period_id: String,
        guess: String,
    ) -> Result<()> {
        voble_game::submit_guess(ctx, period_id, guess)
    }

    pub fn complete_voble_game(
        ctx: Context<CompleteGame>,
        period_id: String,
    ) -> Result<()> {
        voble_game::complete_voble_game(ctx, period_id)
    }

    pub fn get_voble_stats(ctx: Context<UpdateUserProfile>) -> Result<()> {
        voble_game::get_voble_stats(ctx)
    }
}

