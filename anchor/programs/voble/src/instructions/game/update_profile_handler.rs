use crate::{constants::*, contexts::UpdateProfileHandler, state::*};
use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use ephemeral_rollups_sdk::ephem::{MagicInstructionBuilder, MagicAction, CallHandler, CommitType};
use ephemeral_rollups_sdk::{ActionArgs, ShortAccountMeta};

/// Handler that runs on base layer after session commit
/// Updates profile stats using committed session data
pub fn update_profile_handler(ctx: Context<UpdateProfileHandler>) -> Result<()> {
    // Deserialize committed session
    let session_info = &ctx.accounts.committed_session;
    let mut data: &[u8] = &session_info.try_borrow_data()?;
    let session = SessionAccount::try_deserialize(&mut data)?;
    
    // Update profile stats
    let profile = &mut ctx.accounts.user_profile;
    let now = Clock::get()?.unix_timestamp;
    
    profile.total_games_played += 1;
    profile.total_score += session.score as u64;
    
    if session.is_solved {
        profile.games_won += 1;
        profile.current_streak += 1;
        
        if profile.current_streak > profile.max_streak {
            profile.max_streak = profile.current_streak;
        }
        
        // Update guess distribution
        if session.guesses_used > 0 && session.guesses_used <= MAX_GUESSES {
            profile.guess_distribution[(session.guesses_used - 1) as usize] += 1;
        }
        
        // Calculate average guesses
        let total_winning_guesses: u32 = profile
            .guess_distribution
            .iter()
            .enumerate()
            .map(|(i, &count)| (i as u32 + 1) * count)
            .sum();
        
        profile.average_guesses = if profile.games_won > 0 {
            total_winning_guesses as f32 / profile.games_won as f32
        } else {
            0.0
        };
    } else {
        profile.current_streak = 0;
    }
    
    if session.score > profile.best_score {
        profile.best_score = session.score;
    }
    
    profile.last_played = now;
    
    Ok(())
}
