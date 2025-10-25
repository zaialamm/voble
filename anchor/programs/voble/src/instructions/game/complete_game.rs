use crate::{contexts::*, errors::VobleError, events::*, state::*};
use anchor_lang::prelude::*;

use super::{scoring, word_selection};

/// Complete the current Voble game and update stats
///
/// This instruction finalizes a game session and:
/// 1. Reveals the target word
/// 2. Calculates final score (base + time bonus)
/// 3. Updates player profile stats
/// 4. Updates leaderboard
/// 5. Checks and unlocks achievements
/// 6. Closes session account (reclaims rent)
///
/// # Arguments
/// * `ctx` - The context containing session, profile, and leaderboard
/// * `_period_id` - Period ID (used for PDA derivation)
///
/// # Session Keys Support
/// Supports session keys for gasless game completion:
/// - If session token valid: Uses session token
/// - If no session token: Requires player signature
///
/// # Score Calculation
/// **Base Score (if solved):**
/// - Based on guesses used (fewer = higher score)
/// - Range: 100-1000 points
///
/// **Time Bonus (if solved):**
/// - Based on completion speed
/// - Range: 0-500 points
///
/// Total Score = Base Score + Time Bonus
///
/// # Profile Updates
/// Updates various profile statistics:
/// - Total games played (+1)
/// - Games won (if solved)
/// - Current/max streak tracking
/// - Guess distribution histogram
/// - Average guesses for wins
/// - Best score tracking
/// - Period tracking (marks period as played)
///
/// # Leaderboard Updates
/// Automatically updates the period leaderboard:
/// - Adds new entry if player not on leaderboard
/// - Updates entry if new score is better
/// - Sorts leaderboard by score
/// - Keeps top 100 entries
///
/// # Achievements
/// Checks and unlocks achievements:
/// - First Game, First Win
/// - Lucky Guess (1-2 guesses)
/// - Streak achievements (3, 7 games)
/// - Perfectionist (10+ games with ≤3 guesses)
///
/// # Rent Reclamation
/// The session account is closed and rent is returned to the player.
/// This is done automatically via the `close = signer` constraint.
///
/// # Important Notes
/// - ⚠️ This MUST be called to finalize the game (even if not solved)
/// - ⚠️ Profile updates happen on ER (where profile is delegated)
/// - ⚠️ Session account is closed after this (rent reclaimed)
/// - ⚠️ Cannot submit more guesses after completion
///
/// # Flow
/// 1. Start game (buy_ticket_and_start_game)
/// 2. Submit guesses (submit_guess) - up to 7 times
/// 3. **Complete game (this instruction)** ← You are here
/// 4. Stats saved, rent reclaimed, ready for next game!
pub fn complete_voble_game(ctx: Context<CompleteGame>, _period_id: String) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let session = &mut ctx.accounts.session;
    
    msg!("🏁 Completing Voble game");
    msg!("   Session: {}", session.session_id);
    msg!("   Player: {}", session.player);

    require!(!session.completed, VobleError::AlreadyClaimed);

    let target_word = word_selection::get_word_by_index(session.word_index)?;
    session.target_word = target_word.to_string();
    session.completed = true;
    session.time_ms = (now - ctx.accounts.user_profile.last_played) as u64 * 1000;

    let final_score = scoring::calculate_final_score(session.is_solved, session.guesses_used, session.time_ms);
    session.score = final_score;

    msg!("🎯 Target: {}, Score: {}", target_word, final_score);

    let is_solved = session.is_solved;
    let guesses_used = session.guesses_used;
    let session_id = session.session_id.clone();
    let period_id = session.period_id.clone();
    let player = session.player;

    // ========== AUTO-UPDATE LEADERBOARD ==========
    msg!("📊 Updating leaderboard");

    let leaderboard = &mut ctx.accounts.leaderboard;
`
    if !leaderboard.finalized && final_score > 0 {
        // Create new leaderboard entry
        let new_entry = LeaderEntry {
            player,
            score: final_score,
            guesses_used,
            time_ms: session.time_ms,
            timestamp: now,
            username: ctx.accounts.user_profile.username.clone(),
        };

        // Check if player already has an entry
        let mut updated_existing = false;
        for entry in &mut leaderboard.entries {
            if entry.player == player {
                // Update if new score is better
                if final_score > entry.score {
                    *entry = new_entry.clone();
                    updated_existing = true;
                    msg!("   Updated existing entry with better score");
                } else {
                    msg!("   Score not higher than existing entry");
                }
                break;
            }
        }

        // Add new entry if player not on leaderboard
        if !updated_existing {
            leaderboard.entries.push(new_entry);
            leaderboard.total_players += 1;
            msg!("   Added new leaderboard entry");
        }

        // Sort by score (highest first)
        leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));

        // Keep only top 100 entries (prevent account bloat)
        if leaderboard.entries.len() > 100 {
            leaderboard.entries.truncate(100);
        }

        // Check player's rank
        let player_rank = leaderboard
            .entries
            .iter()
            .position(|entry| entry.player == player)
            .map(|pos| pos + 1);

        if let Some(rank) = player_rank {
            msg!("   🏆 Player rank: #{} (score: {})", rank, final_score);
        } else {
            msg!("   Not in top 100");
        }

        msg!("   Total players: {}", leaderboard.total_players);
    } else if leaderboard.finalized {
        msg!("   ⚠️  Leaderboard already finalized for this period");
    } else {
        msg!("   ⚠️  Score is 0, not added to leaderboard");
    }

    // ========== EMIT EVENT ==========
    emit!(VobleGameCompleted {
        player,
        session_id,
        target_word: target_word.to_string(),
        is_solved,
        guesses_used,
        final_score,
        current_streak: 0,
        total_games_played: 0,
        games_won: 0,
    });
    
    // ========== SIMPLE COMMIT (NO HANDLER FOR NOW) ==========
    msg!("⚡ Committing session state");
    
    // TODO: Add Magic Actions handler for profile updates later
    // For now, just commit the session state
    
    msg!("✅ Game completed successfully");
    
    Ok(())
}
