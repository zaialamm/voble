use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

/// Finalize the period leaderboard and officially determine winners
///
/// This instruction locks the leaderboard at the end of a period and
/// officially determines the top 3 winners who will receive prizes.
/// After finalization, no more scores can be added to this leaderboard.
///
/// # Arguments
/// * `ctx` - The context containing the leaderboard account and authority
/// * `period_id` - The period ID being finalized (for logging/validation)
/// * `_period_type` - Period type (prefixed with _ as not used in logic)
///
/// # Validation
/// - Only authority can finalize leaderboards
/// - Leaderboard must not already be finalized
/// - Leaderboard must have at least 1 entry (at least one player played)
/// - Period ID must match leaderboard's period_id
///
/// # What Happens
/// 1. Marks leaderboard as finalized (locked)
/// 2. Sets finalization timestamp
/// 3. Determines top 3 winners from sorted entries
/// 4. Emits WinnerDetermined event for each winner (top 3)
/// 5. Emits LeaderboardFinalized event
///
/// # Winner Determination
/// Winners are determined by:
/// - Primary: Highest score
/// - Leaderboard entries are already sorted by score (descending)
/// - Top 3 entries become 1st, 2nd, 3rd place winners
///
/// # After Finalization
/// - Leaderboard is locked (no more updates)
/// - Admin can create winner entitlements
/// - Admin can finalize the period (distribute prizes)
/// - Winners can claim their prizes
///
/// # When to Call
/// This should be called at the END of each period:
/// - Daily: After 7 minutes (testing) / 24 hours (production)
/// - Weekly: After 12 minutes (testing) / 7 days (production)
/// - Monthly: After 15 minutes (testing) / 30 days (production)
///
/// # Notes
/// - Usually called by admin or automated cron job
/// - Must be called BEFORE prize finalization
/// - Cannot be undone - leaderboard is permanently locked
/// - If fewer than 3 players, only available positions get prizes
///
/// # Example Flow
/// 1. Initialize leaderboard (period starts)
/// 2. Players complete games (leaderboard updates)
/// 3. **Finalize leaderboard (this instruction)** ← You are here
/// 4. Admin creates winner entitlements
/// 5. Winners claim prizes
pub fn finalize_leaderboard(
    ctx: Context<FinalizeLeaderboard>,
    period_id: String,
    _period_type: u8,
) -> Result<()> {
    let leaderboard = &mut ctx.accounts.leaderboard;
    let now = Clock::get()?.unix_timestamp;

    msg!("🏁 Finalizing leaderboard");
    msg!("   Period: {}", period_id);
    msg!("   Total players: {}", leaderboard.total_players);
    msg!("   Total entries: {}", leaderboard.entries.len());

    // ========== VALIDATION ==========
    // Must not already be finalized
    require!(!leaderboard.finalized, VobleError::AlreadyClaimed);

    // Must have at least one player
    require!(
        leaderboard.entries.len() > 0,
        VobleError::InvalidWinnerCount
    );

    // Validate period ID matches
    require!(
        leaderboard.period_id == period_id,
        VobleError::InvalidPeriodState
    );

    msg!("✅ Validation passed");

    // ========== FINALIZE LEADERBOARD ==========
    leaderboard.finalized = true;
    leaderboard.finalized_at = Some(now);

    msg!("🔒 Leaderboard locked (finalized)");
    msg!("   Finalized at: {}", now);
    msg!("   No more entries can be added");

    // ========== DETERMINE WINNERS ==========
    // Top 3 players from the sorted leaderboard
    let winners_count = leaderboard.entries.len().min(TOP_WINNERS_COUNT);

    msg!("");
    msg!("🏆 ========== WINNERS DETERMINED ========== 🏆");
    msg!(
        "   {} winner(s) from {} total players",
        winners_count,
        leaderboard.total_players
    );
    msg!("");

    // Emit winner events for top 3 (or fewer if less than 3 players)
    for (i, entry) in leaderboard.entries.iter().take(winners_count).enumerate() {
        let rank = (i + 1) as u8;

        emit!(WinnerDetermined {
            period_id: leaderboard.period_id.clone(),
            player: entry.player,
            rank,
            score: entry.score,
            username: entry.username.clone(),
        });

        msg!(
            "   🥇 Rank #{}: {} - {} points ({})",
            rank,
            entry.username,
            entry.score,
            entry.player
        );
    }

    msg!("==========================================");

    // ========== EMIT FINALIZATION EVENT ==========
    emit!(LeaderboardFinalized {
        period_id: leaderboard.period_id.clone(),
        period_type: leaderboard.period_type.clone(),
        total_players: leaderboard.total_players,
        winners_count: winners_count as u8,
        finalized_at: now,
    });

    // ========== FINAL LOGGING ==========
    msg!("");
    msg!("✅ Leaderboard finalized successfully");
    msg!("   Period: {} ({:?})", period_id, leaderboard.period_type);
    msg!("   Winners: {}", winners_count);
    msg!("   Total players: {}", leaderboard.total_players);
    msg!("");
    msg!("💡 Next steps:");
    msg!("   1. Create winner entitlements (admin)");
    msg!("   2. Finalize period prizes (admin)");
    msg!("   3. Winners can claim their prizes");

    Ok(())
}
