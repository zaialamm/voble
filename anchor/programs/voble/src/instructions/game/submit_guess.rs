use crate::{constants::*, contexts::*, errors::VobleError, events::*, state::*};
use anchor_lang::prelude::*;

// Import helper modules
use super::{scoring, word_selection};

/// Submit a guess for the current Voble game
///
/// This instruction allows players to submit a word guess and receive
/// instant feedback using Wordle-style color coding:
/// - Green (Correct): Letter is in word and in correct position
/// - Yellow (Present): Letter is in word but wrong position
/// - Gray (Absent): Letter is not in the word
///
/// # Arguments
/// * `ctx` - The context containing session and user profile
/// * `_period_id` - Period ID (used for PDA derivation, prefixed with _ as not used in logic)
/// * `guess` - The 6-letter word guess (will be converted to uppercase)
///
/// # Validation
/// - Guess must be exactly 6 characters
/// - Game must not be completed
/// - Must have guesses remaining (< 7 guesses used)
/// - Word must have been selected (word_index valid)
///
/// # Session Keys Support
/// This instruction supports session keys for gasless gameplay:
/// - If session token valid: Uses session token
/// - If no session token: Requires player signature
/// - Enables smooth UX without constant wallet popups
///
/// # Game Flow
/// 1. Validate guess format and game state
/// 2. Get target word from word list
/// 3. Evaluate guess using Wordle logic
/// 4. Store guess result in session
/// 5. Check if word is solved
/// 6. Emit event with guess result
/// 7. If solved or out of guesses, prompt to complete game
///
/// # Wordle Logic
/// The evaluation follows standard Wordle rules:
/// - First pass: Mark exact matches (correct position)
/// - Second pass: Mark letters in wrong position
/// - Each letter in target can only be "used" once
///
/// # Example
/// Target: "CRANE"
/// Guess:  "ANGER"
/// Result: [Present, Correct, Absent, Correct, Correct]
/// - A: Present (in word but wrong position)
/// - N: Correct (right position)
/// - G: Absent (not in word)
/// - E: Correct (right position)
/// - R: Correct (right position)
///
/// # Notes
/// - Guesses are stored in a fixed-size array (no Vec reallocation)
/// - Session account holds up to 7 guesses
/// - Game doesn't auto-complete - player must call complete_voble_game
pub fn submit_guess(ctx: Context<SubmitGuess>, _period_id: String, guess: String) -> Result<()> {
    // ========== VALIDATION: Guess Format ==========
    require!(guess.len() == WORD_LENGTH, VobleError::InvalidScore);

    let session = &mut ctx.accounts.session;

    msg!("📝 Submitting guess for session: {}", session.session_id);
    msg!("   Guess: {}", guess);
    msg!("   Attempt: {}/{}", session.guesses_used + 1, MAX_GUESSES);

    // ========== VALIDATION: Game State ==========
    require!(!session.completed, VobleError::AlreadyClaimed);
    require!(
        session.guesses_used < MAX_GUESSES,
        VobleError::InvalidGuessCount
    );
    require!(
        session.word_index < word_selection::get_word_count() as u32,
        VobleError::InvalidPeriodState
    );

    // ========== GET TARGET WORD ==========
    let target_word = word_selection::get_word_by_index(session.word_index)?;
    let target_word_string = target_word.to_string();

    msg!("🎯 Evaluating guess against target");

    // ========== EVALUATE GUESS ==========
    let guess_upper = guess.to_uppercase();
    let result = scoring::evaluate_guess(&guess_upper, target_word);

    // Check if all letters are correct (word is solved)
    let is_correct = result.iter().all(|&r| matches!(r, LetterResult::Correct));

    if is_correct {
        session.is_solved = true;
        msg!("🎉 Word solved!");
    }

    // ========== STORE GUESS ==========
    let guess_data = GuessData {
        guess: guess_upper.clone(),
        result,
    };

    let guess_index = session.guesses_used as usize;
    session.guesses[guess_index] = Some(guess_data);
    session.guesses_used += 1;

    msg!(
        "✅ Guess stored (attempt {}/{})",
        session.guesses_used,
        MAX_GUESSES
    );
    msg!("   Result: {:?}", result);

    // ========== EMIT EVENT ==========
    emit!(GuessSubmitted {
        player: session.player,
        session_id: session.session_id.clone(),
        guess: guess_upper.clone(),
        guess_number: session.guesses_used,
        is_correct,
        result,
    });

    // ========== AUTO-COMPLETE GAME ==========
    let game_ended = is_correct || session.guesses_used >= MAX_GUESSES;

    if game_ended {
        msg!("🏁 Game ended - auto-completing on ER");
        
        // Calculate final score
        let now = Clock::get()?.unix_timestamp;
        let time_elapsed = (now - session.vrf_request_timestamp) as u64 * 1000; // Convert to milliseconds
        session.time_ms = time_elapsed;
        
        // Use the scoring module to calculate final score
        let final_score = super::scoring::calculate_final_score(
            session.is_solved,
            session.guesses_used,
            session.time_ms
        );
        session.score = final_score;
        session.completed = true;
        session.target_word = target_word_string;
        
        msg!("   Final score: {}", final_score);
        msg!("   Time: {}ms", time_elapsed);
        msg!("   ✅ Game auto-completed on ER");
    }

    // ========== GAME STATUS LOGGING ==========
    if is_correct {
        msg!("🏆 Congratulations! You guessed the word!");
        msg!("💡 Game auto-completed - leaderboard will update on commit");
    } else if session.guesses_used >= MAX_GUESSES {
        msg!("😔 Out of guesses! Better luck next time.");
        msg!("💡 Game auto-completed - leaderboard will update on commit");
    } else {
        let remaining = MAX_GUESSES - session.guesses_used;
        msg!("🔄 {} guess(es) remaining", remaining);
    }

    // Color coding legend for client
    msg!("");
    msg!("📊 Result Legend:");
    msg!("   🟩 Correct: Letter in correct position");
    msg!("   🟨 Present: Letter in word, wrong position");
    msg!("   ⬜ Absent: Letter not in word");

    Ok(())
}
