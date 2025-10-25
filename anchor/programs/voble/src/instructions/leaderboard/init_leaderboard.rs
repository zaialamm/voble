use crate::state::PeriodType;
use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

/// Initialize a new period leaderboard
///
/// This instruction creates a fresh leaderboard account for a specific period.
/// Each period (daily, weekly, monthly) needs its own leaderboard to track
/// player rankings and scores.
///
/// # Arguments
/// * `ctx` - The context containing the leaderboard account and authority
/// * `period_id` - Unique identifier for this period (e.g., "D123", "W45", "M12")
/// * `period_type` - Type of period: 0=Daily, 1=Weekly, 2=Monthly
///
/// # Validation
/// - Period ID must be 1-20 characters
/// - Period type must be 0, 1, or 2
/// - Only authority can initialize leaderboards
/// - Leaderboard PDA must not already exist (enforced by init constraint)
///
/// # Leaderboard Initialization
/// Creates an empty leaderboard with:
/// - Period ID and type set
/// - Empty entries array (will be populated as games complete)
/// - Total players count at 0
/// - Prize pool at 0 (updated during finalization)
/// - Not finalized status
/// - Creation timestamp
///
/// # When to Call
/// This should be called at the START of each new period:
/// - Daily: Every 7 minutes (testing) / 24 hours (production)
/// - Weekly: Every 12 minutes (testing) / 7 days (production)
/// - Monthly: Every 15 minutes (testing) / 30 days (production)
///
/// # Notes
/// - Usually called by admin or automated cron job
/// - Must be initialized BEFORE players can play that period
/// - Leaderboard is automatically updated when players complete games
/// - Leaderboard is finalized at the end of the period
///
/// # Example Flow
/// 1. **Initialize leaderboard (this instruction)** ← You are here
/// 2. Players complete games (auto-updates leaderboard)
/// 3. Period ends → finalize_leaderboard()
/// 4. Winners claim prizes
pub fn initialize_period_leaderboard(
    ctx: Context<InitializePeriodLeaderboard>,
    period_id: String,
    period_type: u8,
) -> Result<()> {
    // ========== VALIDATION: Period ID ==========
    require!(
        period_id.len() <= MAX_PERIOD_ID_LENGTH,
        VobleError::PeriodIdTooLong
    );
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);

    msg!("📊 Initializing leaderboard");
    msg!("   Period ID: {}", period_id);
    msg!("   Period type: {}", period_type);

    // ========== VALIDATION: Period Type ==========
    let period_type_enum = match period_type {
        0 => PeriodType::Daily,
        1 => PeriodType::Weekly,
        2 => PeriodType::Monthly,
        _ => {
            msg!(
                "❌ Invalid period type: {} (must be 0, 1, or 2)",
                period_type
            );
            return Err(VobleError::InvalidPeriodState.into());
        }
    };

    msg!("   Period type enum: {:?}", period_type_enum);

    // ========== INITIALIZE LEADERBOARD ==========
    let leaderboard = &mut ctx.accounts.leaderboard;
    let now = Clock::get()?.unix_timestamp;

    // Set period identification
    leaderboard.period_id = period_id.clone();
    leaderboard.period_type = period_type_enum;

    // Initialize empty state
    leaderboard.entries = Vec::new();
    leaderboard.total_players = 0;
    leaderboard.prize_pool = 0;

    // Set status flags
    leaderboard.finalized = false;

    // Set timestamps
    leaderboard.created_at = now;
    leaderboard.finalized_at = None;

    msg!("✅ Leaderboard data initialized");
    msg!("   Entries: {} (empty)", leaderboard.entries.len());
    msg!("   Total players: {}", leaderboard.total_players);
    msg!("   Finalized: {}", leaderboard.finalized);
    msg!("   Created at: {}", now);

    // ========== EMIT EVENT ==========
    emit!(LeaderboardInitialized {
        period_id: period_id.clone(),
        period_type: period_type_enum,
        created_at: now,
    });

    // ========== FINAL LOGGING ==========
    msg!("");
    msg!("✅ ========== LEADERBOARD READY ========== ✅");
    msg!("   Period: {} ({:?})", period_id, period_type_enum);
    msg!("   Status: Open for submissions");
    msg!("   Players can now compete for top positions!");
    msg!("   Leaderboard will auto-update as games complete");
    msg!("==========================================");

    Ok(())
}
