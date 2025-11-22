use crate::constants::*;
use crate::state::LetterResult;
use anchor_lang::prelude::*;

/// Calculate the final score for a completed game
///
/// The scoring system rewards both speed and efficiency:
/// - Base score: Based on number of guesses used (fewer = higher)
/// - Time bonus: Additional points for fast completion
///
/// # Arguments
/// * `is_solved` - Whether the player successfully guessed the word
/// * `guesses_used` - Number of guesses taken (1-7)
/// * `time_ms` - Time taken to complete in milliseconds
///
/// # Returns
/// Total score (base + time bonus), or 0 if not solved
///
/// # Scoring Breakdown
/// **Base Scores (if solved):**
/// - 1 guess: 1000 points (incredible!)
/// - 2 guesses: 800 points (amazing!)
/// - 3 guesses: 600 points (great!)
/// - 4 guesses: 400 points (good)
/// - 5 guesses: 300 points (okay)
/// - 6 guesses: 200 points (close)
/// - 7 guesses: 100 points (last chance)
///
/// **Time Bonuses (if solved):**
/// - Under 30 seconds: +500 points (speed demon!)
/// - Under 1 minute: +300 points (fast solver!)
/// - Under 2 minutes: +150 points (quick!)
/// - Under 5 minutes: +50 points (decent)
/// - Over 5 minutes: +0 points
pub fn calculate_final_score(is_solved: bool, guesses_used: u8, time_ms: u64) -> u32 {
    if !is_solved {
        return 0; // No points for unsolved games
    }

    let base_score = calculate_base_score(guesses_used);
    let time_bonus = calculate_time_bonus(time_ms);

    base_score + time_bonus
}

/// Calculate base score from number of guesses used
///
/// # Arguments
/// * `guesses_used` - Number of guesses taken (1-7)
///
/// # Returns
/// Base score based on efficiency
fn calculate_base_score(guesses_used: u8) -> u32 {
    match guesses_used {
        1 => SCORE_GUESS_1, // 1000 - Incredible (almost impossible)
        2 => SCORE_GUESS_2, // 800 - Amazing
        3 => SCORE_GUESS_3, // 600 - Great
        4 => SCORE_GUESS_4, // 400 - Good
        5 => SCORE_GUESS_5, // 300 - Okay
        6 => SCORE_GUESS_6, // 200 - Close
        7 => SCORE_GUESS_7, // 100 - Last chance
        _ => 0,             // Invalid guess count
    }
}

/// Calculate time bonus for fast completion
///
/// # Arguments
/// * `time_ms` - Time taken in milliseconds
///
/// # Returns
/// Bonus points based on speed
fn calculate_time_bonus(time_ms: u64) -> u32 {
    if time_ms < TIME_BONUS_TIER_1 {
        BONUS_TIER_1 // 500 - Under 30 seconds (speed demon!)
    } else if time_ms < TIME_BONUS_TIER_2 {
        BONUS_TIER_2 // 300 - Under 1 minute (fast solver!)
    } else if time_ms < TIME_BONUS_TIER_3 {
        BONUS_TIER_3 // 150 - Under 2 minutes (quick!)
    } else if time_ms < TIME_BONUS_TIER_4 {
        BONUS_TIER_4 // 50 - Under 5 minutes (decent)
    } else {
        0 // No bonus for slow solvers
    }
}

/// Evaluate a guess against the target word (Wordle/Voble logic)
///
/// This implements the classic Wordle color-coding system:
/// - Green (Correct): Letter is in the word and in the correct position
/// - Yellow (Present): Letter is in the word but in wrong position
/// - Gray (Absent): Letter is not in the word
///
/// # Arguments
/// * `guess` - The player's guessed word (must be uppercase)
/// * `target` - The target word to compare against (uppercase)
///
/// # Returns
/// Array of 6 LetterResult indicating the status of each letter
///
/// # Algorithm
/// 1. First pass: Mark all exact matches (correct position) as Green
/// 2. Second pass: For remaining letters, check if they exist elsewhere (Yellow)
/// 3. Letters marked in previous passes are consumed and won't be reused
///
/// # Example
/// ```
/// Target: "CRANE"
/// Guess:  "ANGER"
/// Result: [Present, Correct, Absent, Correct, Correct]
///         (A is in word but wrong pos, N is correct, G not in word, E & R correct)
/// ```
pub fn evaluate_guess(guess: &str, target: &str) -> [LetterResult; WORD_LENGTH] {
    let mut result = [LetterResult::Absent; WORD_LENGTH];
    let mut target_chars: Vec<char> = target.chars().collect();
    let guess_chars: Vec<char> = guess.to_uppercase().chars().collect();

    // First pass: Mark correct positions (Green)
    for i in 0..WORD_LENGTH {
        if guess_chars[i] == target_chars[i] {
            result[i] = LetterResult::Correct;
            target_chars[i] = '\0'; // Mark as used
        }
    }

    // Second pass: Mark present letters in wrong positions (Yellow)
    for i in 0..WORD_LENGTH {
        if matches!(result[i], LetterResult::Absent) {
            if let Some(pos) = target_chars
                .iter()
                .position(|&c| c == guess_chars[i] && c != '\0')
            {
                result[i] = LetterResult::Present;
                target_chars[pos] = '\0'; // Mark as used
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_final_score_solved() {
        // Perfect game: 1 guess in under 30 seconds
        assert_eq!(calculate_final_score(true, 1, 25_000), 1500); // 1000 + 500

        // Good game: 3 guesses in 45 seconds
        assert_eq!(calculate_final_score(true, 3, 45_000), 900); // 600 + 300

        // Slow game: 7 guesses in 10 minutes
        assert_eq!(calculate_final_score(true, 7, 600_000), 100); // 100 + 0
    }

    #[test]
    fn test_calculate_final_score_unsolved() {
        assert_eq!(calculate_final_score(false, 7, 60_000), 0);
        assert_eq!(calculate_final_score(false, 3, 30_000), 0);
    }

    #[test]
    fn test_evaluate_guess_all_correct() {
        let result = evaluate_guess("CRANE", "CRANE");
        assert!(result
            .iter()
            .all(|&r| matches!(r, LetterResult::Correct)));
    }

    #[test]
    fn test_evaluate_guess_all_absent() {
        let result = evaluate_guess("ABCDE", "FGHIJ");
        assert!(result.iter().all(|&r| matches!(r, LetterResult::Absent)));
    }

    #[test]
    fn test_evaluate_guess_mixed() {
        let result = evaluate_guess("ANGER", "CRANE");
        // A - Present (in word but wrong position)
        // N - Correct (right position)
        // G - Absent (not in word)
        // E - Correct (right position)
        // R - Correct (right position)
        assert!(matches!(result[0], LetterResult::Present)); // A
        assert!(matches!(result[1], LetterResult::Correct)); // N
        assert!(matches!(result[2], LetterResult::Absent)); // G
        assert!(matches!(result[3], LetterResult::Correct)); // E
        assert!(matches!(result[4], LetterResult::Correct)); // R
    }

    #[test]
    fn test_evaluate_guess_duplicate_letters() {
        let result = evaluate_guess("SPEED", "ERASE");
        // S - Correct
        // P - Absent
        // E - Present (one E is correct position, this one is wrong position)
        // E - Correct
        // D - Absent
        assert!(matches!(result[0], LetterResult::Correct)); // S
        assert!(matches!(result[1], LetterResult::Absent)); // P
        assert!(matches!(result[2], LetterResult::Present)); // E
        assert!(matches!(result[3], LetterResult::Correct)); // E
        assert!(matches!(result[4], LetterResult::Absent)); // D
    }
}
