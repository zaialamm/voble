use crate::contexts::*;
use crate::constants::*;
use crate::errors::VobleError;
use crate::instructions::game::word_selection;
use anchor_lang::prelude::*;

/// Reset session state after session delegated on ER (useful for 2nd, 3rd, time of playing)
/// Now includes payment verification via TicketReceipt
pub fn reset_session(ctx: Context<ResetSession>, period_id: String) -> Result<()> {
    let session = &mut ctx.accounts.session;
    let user_profile = &ctx.accounts.user_profile;
    let now = Clock::get()?.unix_timestamp;

    msg!("🔄 Resetting session for period: {}", period_id);

    // 1. Verify Payment via UserProfile
    // The Base layer updates last_paid_period when ticket is bought
    require!(
        user_profile.last_paid_period == period_id,
        VobleError::InvalidTicketReceipt // Reusing error code for clarity
    );
    require!(
        user_profile.player == session.player,
        VobleError::Unauthorized
    );

    // 2. Prevent Replay (Session period_id must NOT match receipt period_id yet)
    // If they match, it means this payment was already used to initialize this session
    require!(
        session.period_id != period_id,
        VobleError::TicketAlreadyUsed
    );

    // 3. Word Selection (Moved from start_game)
    // Note: We use 0 for total_games as we can't access profile on ER easily
    // For demo mode with deterministic selection, this is acceptable
    let word_data = word_selection::select_word_for_session(session.player, &period_id, 0)?;

    // 4. Reset Session State
    session.period_id = period_id.clone();
    session.target_word_hash = word_data.word_hash;
    session.word_index = word_data.word_index;
    session.target_word = String::new(); // Hidden
    session.guesses = [None, None, None, None, None, None, None];
    session.is_solved = false;
    session.guesses_used = 0;
    session.time_ms = 0;
    session.score = 0;
    session.completed = false;
    session.vrf_request_timestamp = now;
    session.keystrokes.clear();
    session.current_input.clear();

    msg!("✅ Session reset and initialized for new game!");
    msg!("   Word Hash: {:x?}", word_data.word_hash);

    Ok(())
}
