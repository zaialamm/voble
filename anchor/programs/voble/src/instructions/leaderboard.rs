use anchor_lang::prelude::*;
use crate::contexts::leaderboard::{InitializePeriodLeaderboard, UpdateLeaderboard, FinalizeLeaderboard};
use crate::state::*;
use crate::errors::VobleError;
use crate::events::*;

/// Initialize a new period leaderboard
pub fn initialize_period_leaderboard(
    ctx: Context<InitializePeriodLeaderboard>,
    period_id: String,
    period_type: u8,
) -> Result<()> {
    require!(period_id.len() <= 20, VobleError::SessionIdTooLong);
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);
    
    let leaderboard = &mut ctx.accounts.leaderboard;
    let now = Clock::get()?.unix_timestamp;
    
    let period_type_enum = match period_type {
        0 => PeriodType::Daily,
        1 => PeriodType::Weekly,
        2 => PeriodType::Monthly,
        _ => return Err(VobleError::InvalidPeriodState.into()),
    };
    
    leaderboard.period_id = period_id.clone();
    leaderboard.period_type = period_type_enum;
    leaderboard.entries = Vec::new();
    leaderboard.total_players = 0;
    leaderboard.prize_pool = 0;
    leaderboard.finalized = false;
    leaderboard.created_at = now;
    leaderboard.finalized_at = None;
    
    emit!(LeaderboardInitialized {
        period_id: period_id.clone(),
        period_type: period_type_enum,
        created_at: now,
    });
    
    msg!("📊 Leaderboard initialized for period: {}", period_id);
    
    Ok(())
}

/// Update leaderboard with a new score (called automatically after games)
pub fn update_leaderboard(
    ctx: Context<UpdateLeaderboard>,
    _period_id: String,
    _period_type: u8,
    score: u32,
    guesses_used: u8,
    time_ms: u64,
) -> Result<()> {
    let leaderboard = &mut ctx.accounts.leaderboard;
    let user_profile = &ctx.accounts.user_profile;
    let player = ctx.accounts.player.key();
    let now = Clock::get()?.unix_timestamp;
    
    require!(!leaderboard.finalized, VobleError::AlreadyClaimed);
    require!(score > 0, VobleError::InvalidScore);
    require!(guesses_used <= 7, VobleError::InvalidGuessCount);
    
    // Create new leaderboard entry
    let new_entry = LeaderEntry {
        player,
        score,
        guesses_used,
        time_ms,
        timestamp: now,
        username: user_profile.username.clone(),
    };
    
    // Check if player already has an entry (update if better score)
    let mut updated_existing = false;
    for entry in &mut leaderboard.entries {
        if entry.player == player {
            if score > entry.score {
                *entry = new_entry.clone();
                updated_existing = true;
                msg!("🔄 Updated existing leaderboard entry for player: {}", player);
            } else {
                msg!("⏭️  Score not better than existing entry, skipping update");
                return Ok(());
            }
            break;
        }
    }
    
    // If not updated existing, add new entry
    if !updated_existing {
        leaderboard.entries.push(new_entry.clone());
        leaderboard.total_players += 1;
        msg!("✨ Added new leaderboard entry for player: {}", player);
    }
    
    // Sort entries by score (highest first)
    leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));
    
    // Keep only top 10 entries
    if leaderboard.entries.len() > MAX_LEADERBOARD_SIZE {
        leaderboard.entries.truncate(MAX_LEADERBOARD_SIZE);
    }
    
    // Check if player made it to top 10
    let player_rank = leaderboard.entries
        .iter()
        .position(|entry| entry.player == player)
        .map(|pos| pos + 1);
    
    if let Some(rank) = player_rank {
        emit!(LeaderboardUpdated {
            period_id: leaderboard.period_id.clone(),
            player,
            score,
            rank: rank as u8,
            total_players: leaderboard.total_players,
        });
        
        msg!("🏆 Player {} ranked #{} with score {}", player, rank, score);
    } else {
        msg!("📊 Player {} score {} not in top 10", player, score);
    }
    
    Ok(())
}

/// Finalize leaderboard and determine winners (admin only)
pub fn finalize_leaderboard(
    ctx: Context<FinalizeLeaderboard>,
    period_id: String,
    _period_type: u8,
) -> Result<()> {
    let leaderboard = &mut ctx.accounts.leaderboard;
    let now = Clock::get()?.unix_timestamp;
    
    require!(!leaderboard.finalized, VobleError::AlreadyClaimed);
    require!(leaderboard.entries.len() > 0, VobleError::InvalidWinnerCount);
    
    leaderboard.finalized = true;
    leaderboard.finalized_at = Some(now);
    
    // Emit winner events for top 3
    let winners_count = leaderboard.entries.len().min(3);
    for (i, entry) in leaderboard.entries.iter().take(winners_count).enumerate() {
        emit!(WinnerDetermined {
            period_id: leaderboard.period_id.clone(),
            player: entry.player,
            rank: (i + 1) as u8,
            score: entry.score,
            username: entry.username.clone(),
        });
    }
    
    emit!(LeaderboardFinalized {
        period_id: leaderboard.period_id.clone(),
        period_type: leaderboard.period_type.clone(),
        total_players: leaderboard.total_players,
        winners_count: winners_count as u8,
        finalized_at: now,
    });
    
    msg!("🏁 Leaderboard finalized for period: {}", period_id);
    msg!("🏆 {} winners determined from {} total players", 
         winners_count, leaderboard.total_players);
    
    Ok(())
}

/// Get leaderboard information (view function)
pub fn get_leaderboard(
    ctx: Context<UpdateLeaderboard>,
    _period_id: String,
    _period_type: u8,
) -> Result<()> {
    let leaderboard = &ctx.accounts.leaderboard;
    
    msg!("📊 Leaderboard for period: {}", leaderboard.period_id);
    msg!("🎯 Period type: {:?}", leaderboard.period_type);
    msg!("👥 Total players: {}", leaderboard.total_players);
    msg!("💰 Prize pool: {} lamports", leaderboard.prize_pool);
    msg!("✅ Finalized: {}", leaderboard.finalized);
    
    for (i, entry) in leaderboard.entries.iter().enumerate() {
        msg!("#{}: {} - {} points ({})", 
             i + 1, entry.username, entry.score, entry.player);
    }
    
    Ok(())
}
