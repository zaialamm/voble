use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

// Import helper module
use super::distribution;

/// Finalize a period and calculate prize distribution
///
/// This instruction finalizes a period (daily, weekly, or monthly) and
/// calculates the prize amounts for the top 3 winners based on the vault
/// balance and configured winner split percentages.
///
/// # What This Does
/// 1. Validates period is not already finalized
/// 2. Validates leaderboard is finalized (winners determined)
/// 3. Reads top 3 winners from finalized leaderboard
/// 4. Calculates prize amounts from vault balance
/// 5. Creates PeriodState to track finalization
/// 6. Emits PeriodFinalized event
///
/// # Arguments
/// * `ctx` - Context with config, period state, vault, and leaderboard
/// * `period_id` - Period identifier (e.g., "D123", "W45", "M12")
///
/// # Validation
/// - Game must not be paused
/// - Period ID must be valid length
/// - Vault must have sufficient balance
/// - Leaderboard must be finalized
/// - Period must not already be finalized
///
/// # Prize Calculation
/// Prizes are calculated from the vault balance using winner_splits config:
/// - 1st place: winner_splits[0] % of vault + remainder
/// - 2nd place: winner_splits[1] % of vault
/// - 3rd place: winner_splits[2] % of vault
///
/// The remainder from integer division is added to 1st place to ensure
/// ALL lamports are distributed (no lamports left behind).
///
/// # After Finalization
/// Admin must:
/// 1. Create winner entitlements for each winner
/// 2. Winners can then claim their prizes
///
/// # Notes
/// - This does NOT transfer funds - only calculates amounts
/// - Actual transfers happen when winners claim prizes
/// - If fewer than 3 players, only available positions get prizes
/// - Period is permanently finalized (cannot be undone)
///
/// # Example Flow
/// 1. Period ends → leaderboard::finalize_leaderboard()
/// 2. **Admin calls this instruction** ← You are here
/// 3. Admin creates entitlements (3 transactions)
/// 4. Winners claim prizes
pub fn finalize_daily(ctx: Context<FinalizeDaily>, period_id: String) -> Result<()> {
    finalize_period_internal(
        ctx.accounts,
        period_id,
        "daily",
        ctx.bumps.daily_prize_vault,
    )
}

pub fn finalize_weekly(ctx: Context<FinalizeWeekly>, period_id: String) -> Result<()> {
    finalize_period_internal(
        ctx.accounts,
        period_id,
        "weekly",
        ctx.bumps.weekly_prize_vault,
    )
}

pub fn finalize_monthly(ctx: Context<FinalizeMonthly>, period_id: String) -> Result<()> {
    finalize_period_internal(
        ctx.accounts,
        period_id,
        "monthly",
        ctx.bumps.monthly_prize_vault,
    )
}

/// Internal function to finalize any period type
///
/// This consolidates the logic for daily, weekly, and monthly periods to avoid
/// code duplication. The only differences are the vault account and period type.
fn finalize_period_internal<'info>(
    mut accounts: impl FinalizePeriodAccounts<'info>,
    period_id: String,
    period_type: &str,
    vault_bump: u8,
) -> Result<()> {
    msg!("🏁 Finalizing {} period", period_type);
    msg!("   Period ID: {}", period_id);

    // ========== VALIDATION ==========
    require!(
        period_id.len() <= MAX_PERIOD_ID_LENGTH,
        VobleError::PeriodIdTooLong
    );

    // Scope all immutable borrows together to extract needed data
    let (
        paused,
        winner_splits_vec,
        vault_balance,
        leaderboard_finalized,
        total_players,
        winners_data,
    ) = {
        let config = accounts.get_config();
        let vault = accounts.get_vault();
        let leaderboard = accounts.get_leaderboard();

        require!(!config.paused, VobleError::GamePaused);
        require!(leaderboard.finalized, VobleError::PeriodAlreadyFinalized);

        let vault_balance = vault.lamports();
        require!(vault_balance > 0, VobleError::InsufficientVaultBalance);

        // Extract winner data from leaderboard
        let winners_count = leaderboard.entries.len().min(TOP_WINNERS_COUNT);
        let mut winners_data = Vec::new();
        for entry in leaderboard.entries.iter().take(winners_count) {
            winners_data.push((entry.player, entry.username.clone(), entry.score));
        }

        (
            config.paused,
            config.winner_splits.clone(),
            vault_balance,
            leaderboard.finalized,
            leaderboard.total_players,
            winners_data,
        )
    };

    msg!("✅ Validation passed");
    msg!("   Leaderboard finalized: {}", leaderboard_finalized);
    msg!("   Total players: {}", total_players);
    msg!("💰 Vault balance: {} lamports", vault_balance);

    // ========== CALCULATE PRIZE SPLITS ==========
    // Convert Vec to fixed array slice
    require!(
        winner_splits_vec.len() == 3,
        VobleError::InvalidWinnerSplits
    );
    let winner_splits_array: [u16; 3] = [
        winner_splits_vec[0],
        winner_splits_vec[1],
        winner_splits_vec[2],
    ];
    let splits = distribution::calculate_prize_splits(vault_balance, &winner_splits_array);

    // Validate splits add up exactly to vault balance
    distribution::validate_prize_splits(vault_balance, &splits)?;

    msg!("📊 Prize calculation:");
    msg!("   1st place: {} lamports", splits.first_place);
    msg!("   2nd place: {} lamports", splits.second_place);
    msg!("   3rd place: {} lamports", splits.third_place);
    msg!(
        "   Total: {} lamports (verified)",
        splits.first_place + splits.second_place + splits.third_place
    );

    // ========== DETERMINE WINNERS ==========
    let mut winners = Vec::new();
    let winners_count = winners_data.len();

    msg!("");
    msg!("🏆 Winners from leaderboard:");
    for (i, (player, username, score)) in winners_data.iter().enumerate() {
        winners.push(*player);
        let rank = i + 1;
        let prize_amount = match rank {
            1 => splits.first_place,
            2 => splits.second_place,
            3 => splits.third_place,
            _ => 0,
        };
        msg!(
            "   Rank #{}: {} - {} points (Prize: {} lamports)",
            rank,
            username,
            score,
            prize_amount
        );
    }

    // ========== INITIALIZE PERIOD STATE ==========
    // Now we can safely get mutable borrow of period_state
    let period_state = accounts.get_period_state();
    period_state.period_type = period_type.to_string();
    period_state.period_id = period_id.clone();
    period_state.finalized = true;
    period_state.total_participants = total_players;
    period_state.vault_balance_at_finalization = vault_balance;
    period_state.winners = winners.clone();

    msg!("");
    msg!("✅ Period state initialized");
    msg!("   Period: {} ({:?})", period_id, period_type);
    msg!("   Total participants: {}", period_state.total_participants);
    msg!("   Winners: {}", winners.len());

    // ========== EMIT EVENT ==========
    emit!(PeriodFinalized {
        period_type: period_type.to_string(),
        period_id,
        vault_balance,
        winner_amounts: vec![splits.first_place, splits.second_place, splits.third_place],
    });

    // ========== FINAL LOGGING ==========
    msg!("");
    msg!("✅ ========== PERIOD FINALIZED ========== ✅");
    msg!("   Type: {}", period_type);
    msg!("   Total participants: {}", period_state.total_participants);
    msg!("   Winners: {}", winners_count);
    msg!("   Total prizes: {} lamports", vault_balance);
    msg!("");
    msg!("💡 Next steps:");
    msg!("   1. Create entitlements for winners (admin)");
    msg!("   2. Winners can claim their prizes");
    msg!("==========================================");

    Ok(())
}

/// Trait to abstract over different period finalization contexts
trait FinalizePeriodAccounts<'info> {
    fn get_config(&self) -> &Account<'info, crate::state::GlobalConfig>;
    fn get_period_state(&mut self) -> &mut Account<'info, crate::state::PeriodState>;
    fn get_vault(&self) -> &AccountInfo<'info>;
    fn get_leaderboard(&self) -> &Account<'info, crate::state::PeriodLeaderboard>;
}

impl<'info> FinalizePeriodAccounts<'info> for &mut FinalizeDaily<'info> {
    fn get_config(&self) -> &Account<'info, crate::state::GlobalConfig> {
        &self.global_config
    }
    fn get_period_state(&mut self) -> &mut Account<'info, crate::state::PeriodState> {
        &mut self.period_state
    }
    fn get_vault(&self) -> &AccountInfo<'info> {
        &self.daily_prize_vault
    }
    fn get_leaderboard(&self) -> &Account<'info, crate::state::PeriodLeaderboard> {
        &self.leaderboard
    }
}

impl<'info> FinalizePeriodAccounts<'info> for &mut FinalizeWeekly<'info> {
    fn get_config(&self) -> &Account<'info, crate::state::GlobalConfig> {
        &self.global_config
    }
    fn get_period_state(&mut self) -> &mut Account<'info, crate::state::PeriodState> {
        &mut self.period_state
    }
    fn get_vault(&self) -> &AccountInfo<'info> {
        &self.weekly_prize_vault
    }
    fn get_leaderboard(&self) -> &Account<'info, crate::state::PeriodLeaderboard> {
        &self.leaderboard
    }
}

impl<'info> FinalizePeriodAccounts<'info> for &mut FinalizeMonthly<'info> {
    fn get_config(&self) -> &Account<'info, crate::state::GlobalConfig> {
        &self.global_config
    }
    fn get_period_state(&mut self) -> &mut Account<'info, crate::state::PeriodState> {
        &mut self.period_state
    }
    fn get_vault(&self) -> &AccountInfo<'info> {
        &self.monthly_prize_vault
    }
    fn get_leaderboard(&self) -> &Account<'info, crate::state::PeriodLeaderboard> {
        &self.leaderboard
    }
}
