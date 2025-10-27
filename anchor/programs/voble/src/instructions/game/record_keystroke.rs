use crate::{constants::*, contexts::*, errors::VobleError, events::*, state::*};
use anchor_lang::prelude::*;

/// Record a single keystroke during gameplay
pub fn record_keystroke(
    ctx: Context<RecordKeystroke>,
    key: String,
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    let now = Clock::get()?.unix_timestamp;
    
    // Validate game is active
    require!(!session.completed, VobleError::AlreadyClaimed);
    require!(
        session.guesses_used < MAX_GUESSES,
        VobleError::InvalidGuessCount
    );
    
    // Prevent account bloat
    require!(
        session.keystrokes.len() < 200,
        VobleError::TooManyKeystrokes
    );
    
    // Calculate relative timestamp
    let timestamp_ms = ((now - session.vrf_request_timestamp) * 1000) as u64;
    
    // Handle different key types
    match key.as_str() {
        "Backspace" => {
            if !session.current_input.is_empty() {
                session.current_input.pop();
            }
        }
        "Enter" => {
            // Enter is handled by submit_guess, just record it
        }
        _ if key.len() == 1 && key.chars().next().unwrap().is_alphabetic() => {
            // Only allow letters
            if session.current_input.len() < 6 {
                session.current_input.push_str(&key.to_uppercase());
            }
        }
        _ => return Err(VobleError::InvalidInput.into()),
    }

    // Read value before mutable borrow
    let guess_index = session.guesses_used; 
    
    // Record keystroke
    session.keystrokes.push(KeystrokeData {
        key: key.clone(),
        timestamp_ms,
        guess_index,
    });
    
    msg!("⌨️  Keystroke recorded: {} (buffer: {})", key, session.current_input);
    
    // Emit event for real-time tracking
    emit!(KeystrokeRecorded {
        player: session.player,
        session_id: session.session_id.clone(),
        key,
        timestamp_ms,
        current_input: session.current_input.clone(),
        guess_index: session.guesses_used,
    });
    
    Ok(())
}


