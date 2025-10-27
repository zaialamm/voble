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
    
    // ========== UPDATE LEADERBOARD ==========
    msg!("📊 Updating leaderboard");
    
    let leaderboard = &mut ctx.accounts.leaderboard;
    
    if !leaderboard.finalized && final_score > 0 {
        let new_entry = crate::state::LeaderEntry {
            player,
            score: final_score,
            guesses_used: session.guesses_used,
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
                    msg!("   ✅ Updated existing entry with better score");
                } else {
                    msg!("   ℹ️  Score not higher than existing entry");
                }
                break;
            }
        }
        
        // Add new entry if player not on leaderboard
        if !updated_existing {
            leaderboard.entries.push(new_entry);
            leaderboard.total_players += 1;
            msg!("   ✅ Added new leaderboard entry");
        }
        
        // Sort by score (highest first)
        leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));
        
        // Keep only top 100
        if leaderboard.entries.len() > 100 {
            leaderboard.entries.truncate(100);
        }
        
        // Log player's rank
        let player_rank = leaderboard
            .entries
            .iter()
            .position(|entry| entry.player == player)
            .map(|pos| pos + 1);
            
        if let Some(rank) = player_rank {
            msg!("   🏆 Player rank: #{} (score: {})", rank, final_score);
        }
    } else if leaderboard.finalized {
        msg!("   ⚠️  Leaderboard finalized for this period");
    } else {
        msg!("   ⚠️  Score is 0, not added to leaderboard");
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
    
    profile.last_played = now;
    
    msg!("✅ [Magic Handler] Game completion processed successfully");
    
    Ok(())
}

