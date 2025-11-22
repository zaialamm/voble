use anchor_lang::prelude::*;
use crate::contexts::*;
use crate::state::*;

/// Magic Actions handler - runs on base layer after session commit
/// Updates leaderboard automatically when game is completed
pub fn update_player_stats(ctx: Context<UpdatePlayerStats>) -> Result<()> {
    msg!("🎮 [Magic Handler] Processing game completion");
    
    // Manually deserialize the committed session account
    let session_info = &ctx.accounts.committed_session.to_account_info();
    let mut data: &[u8] = &session_info.try_borrow_data()?;
    let session = crate::state::SessionAccount::try_deserialize(&mut data)?;
    
    msg!("   Session: {}", session.session_id);
    msg!("   Completed: {}", session.completed);
    msg!("   Score: {}", session.score);
    
    // Only process if game is completed
    if !session.completed {
        msg!("   ⏭️  Game not completed, skipping");
        return Ok(());
    }
    
    let final_score = session.score;
    let player = session.player;
    let now = Clock::get()?.unix_timestamp;
    
    // ========== UPDATE LEADERBOARDS ==========
    msg!("📊 Updating period leaderboards");

    let mut update_daily = |leaderboard: &mut PeriodLeaderboard| {
        if leaderboard.finalized || final_score == 0 {
            return;
        }

        let new_entry = LeaderEntry {
            player,
            score: final_score,
            guesses_used: session.guesses_used,
            time_ms: session.time_ms,
            timestamp: now,
            username: ctx.accounts.user_profile.username.clone(),
        };

        let mut updated_existing = false;
        for entry in &mut leaderboard.entries {
            if entry.player == player {
                if final_score > entry.score {
                    *entry = new_entry.clone();
                    updated_existing = true;
                    msg!("   ✅ Updated daily entry with better score");
                }
                return;
            }
        }

        leaderboard.entries.push(new_entry);
        leaderboard.total_players += 1;
        msg!("   ✅ Added daily leaderboard entry");
    };

    let mut accumulate_score = |leaderboard: &mut PeriodLeaderboard| {
        if leaderboard.finalized || final_score == 0 {
            return;
        }

        let mut updated_existing = false;
        for entry in &mut leaderboard.entries {
            if entry.player == player {
                entry.score = entry.score.saturating_add(final_score);
                entry.timestamp = now;
                entry.username = ctx.accounts.user_profile.username.clone();
                entry.guesses_used = session.guesses_used;
                entry.time_ms = session.time_ms;
                updated_existing = true;
                msg!("   ➕ Aggregated score for existing entry");
                break;
            }
        }

        if !updated_existing {
            leaderboard.entries.push(LeaderEntry {
                player,
                score: final_score,
                guesses_used: session.guesses_used,
                time_ms: session.time_ms,
                timestamp: now,
                username: ctx.accounts.user_profile.username.clone(),
            });
            leaderboard.total_players += 1;
            msg!("   ✅ Added aggregated entry");
        }
    };

    update_daily(&mut ctx.accounts.daily_leaderboard);
    accumulate_score(&mut ctx.accounts.weekly_leaderboard);
    accumulate_score(&mut ctx.accounts.monthly_leaderboard);

    for leaderboard in [
        &mut ctx.accounts.daily_leaderboard,
        &mut ctx.accounts.weekly_leaderboard,
        &mut ctx.accounts.monthly_leaderboard,
    ] {
        // Sort by score (highest first, tie-breaker by time)
        leaderboard.entries.sort_by(|a, b| {
            match b.score.cmp(&a.score) {
                std::cmp::Ordering::Equal => a.time_ms.cmp(&b.time_ms),
                other => other,
            }
        });

        // Keep only top 100
        if leaderboard.entries.len() > 100 {
            leaderboard.entries.truncate(100);
        }
    }
    
    // ========== UPDATE USER PROFILE STATS ==========
    msg!("📈 Updating user profile stats");
    
    let profile = &mut ctx.accounts.user_profile;
    profile.total_games_played += 1;
    
    if session.is_solved {
        profile.games_won += 1;
        profile.current_streak += 1;
        
        if profile.current_streak > profile.max_streak {
            profile.max_streak = profile.current_streak;
        }
        
        msg!("   ✅ Win recorded! Streak: {}", profile.current_streak);
    } else {
        profile.current_streak = 0;
        msg!("   📊 Loss recorded. Streak reset.");
    }

    profile.total_score += final_score as u64;

    if final_score > profile.best_score {
        profile.best_score = final_score;
    }

    if session.is_solved && session.guesses_used > 0 && session.guesses_used <= 7 {
        let idx = (session.guesses_used - 1) as usize;
        profile.guess_distribution[idx] += 1;
    }

    if profile.games_won > 0 {
        let total_guesses: u32 = profile
            .guess_distribution
            .iter()
            .enumerate()
            .map(|(i, &count)| (i as u32 + 1) * count)
            .sum();
        profile.average_guesses = total_guesses as f32 / profile.games_won as f32;
    }

    profile.last_played_period = session.period_id.clone();
    profile.has_played_this_period = true;
    profile.last_played = now;
    
    msg!("✅ [Magic Handler] Game completion processed successfully");
    
    Ok(())
}

