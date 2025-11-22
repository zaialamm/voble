use crate::contexts::*;
use anchor_lang::prelude::*;

/// Reset session state after session delegated on ER (useful for 2nd, 3rd, time of playing)
pub fn reset_session(ctx: Context<RecordKeystroke>) -> Result<()> {
    let session = &mut ctx.accounts.session;

    msg!("Resetting session state for next game");

    // Clear gameplay state but keep identifying fields like player and period_id
    session.is_solved = false;
    session.guesses_used = 0;
    session.time_ms = 0;
    session.score = 0;
    session.completed = false;
    session.guesses = [None, None, None, None, None, None, None];
    session.keystrokes.clear();
    session.current_input.clear();

    Ok(())
}
