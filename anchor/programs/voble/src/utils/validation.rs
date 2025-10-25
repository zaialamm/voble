//! Input Validation Utilities
//!
//! This module provides validation functions for user inputs, ensuring data
//! integrity and security throughout the Voble program.
//!
//! # Validation Categories
//! - Username validation
//! - Period ID validation
//! - Guess validation (for Wordle game)
//! - Amount validation
//! - String sanitization
//!
//! # Security Considerations
//! - Prevent injection attacks
//! - Enforce length limits
//! - Validate character sets
//! - Sanitize user inputs

use crate::constants::*;
use crate::errors::VobleError;
use anchor_lang::prelude::*;

// ================================
// USERNAME VALIDATION
// ================================

/// Validate a username
///
/// # Rules
/// - Must be 3-20 characters
/// - Can contain: letters, numbers, underscores, hyphens
/// - Cannot start or end with underscore or hyphen
/// - Cannot contain consecutive special characters
/// - Case insensitive
///
/// # Arguments
/// * `username` - The username to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
///
/// # Example
/// ```
/// validate_username("alice_123")?; // OK
/// validate_username("a")?; // Error: too short
/// validate_username("alice__bob")?; // Error: consecutive underscores
/// ```
pub fn validate_username(username: &str) -> Result<()> {
    // Check length
    let len = username.len();
    require!(
        len >= MIN_USERNAME_LENGTH && len <= MAX_USERNAME_LENGTH,
        VobleError::InvalidUsername
    );

    // Check if empty or only whitespace
    require!(!username.trim().is_empty(), VobleError::InvalidUsername);

    // Check first and last characters
    let first_char = username.chars().next().unwrap();
    let last_char = username.chars().last().unwrap();
    require!(first_char.is_alphanumeric(), VobleError::InvalidUsername);
    require!(last_char.is_alphanumeric(), VobleError::InvalidUsername);

    // Check for valid characters and no consecutive special chars
    let mut prev_was_special = false;
    for ch in username.chars() {
        let is_valid = ch.is_alphanumeric() || ch == '_' || ch == '-';
        require!(is_valid, VobleError::InvalidUsername);

        let is_special = ch == '_' || ch == '-';
        if is_special && prev_was_special {
            return Err(VobleError::InvalidUsername.into());
        }
        prev_was_special = is_special;
    }

    Ok(())
}

/// Check if username contains profanity or inappropriate content
///
/// Note: This is a basic filter. Production systems should use
/// more sophisticated profanity filtering.
///
/// # Arguments
/// * `username` - The username to check
///
/// # Returns
/// `true` if username appears clean, `false` if suspicious
pub fn is_username_appropriate(username: &str) -> bool {
    let lowercase = username.to_lowercase();

    // Basic profanity filter (extend as needed)
    let blocked_words = [
        "admin", "root", "system", "official",
        // Add more blocked words as needed
    ];

    for word in blocked_words.iter() {
        if lowercase.contains(word) {
            return false;
        }
    }

    true
}

// ================================
// PERIOD ID VALIDATION
// ================================

/// Validate a period ID
///
/// # Rules
/// - Must start with D, W, or M (for daily, weekly, monthly)
/// - Must be followed by a positive integer
/// - Maximum length: MAX_PERIOD_ID_LENGTH
///
/// # Arguments
/// * `period_id` - The period ID to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
///
/// # Example
/// ```
/// validate_period_id("D123")?; // OK
/// validate_period_id("W45")?; // OK
/// validate_period_id("X999")?; // Error: invalid prefix
/// ```
pub fn validate_period_id(period_id: &str) -> Result<()> {
    // Check if empty
    require!(!period_id.is_empty(), VobleError::SessionIdEmpty);

    // Check length
    require!(
        period_id.len() <= MAX_PERIOD_ID_LENGTH,
        VobleError::PeriodIdTooLong
    );

    // Must be at least 2 characters (prefix + number)
    require!(period_id.len() >= 2, VobleError::InvalidPeriodState);

    // Check prefix
    let prefix = period_id.chars().next().unwrap();
    require!(
        prefix == 'D' || prefix == 'W' || prefix == 'M',
        VobleError::InvalidPeriodState
    );

    // Check number part
    let number_part = &period_id[1..];
    require!(
        number_part.parse::<u64>().is_ok(),
        VobleError::InvalidPeriodState
    );

    Ok(())
}

// ================================
// GUESS VALIDATION (WORDLE)
// ================================

/// Validate a Wordle guess
///
/// # Rules
/// - Must be exactly WORD_LENGTH characters (typically 5)
/// - Must contain only alphabetic characters
/// - Case insensitive (will be converted to uppercase)
///
/// # Arguments
/// * `guess` - The guess to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
///
/// # Example
/// ```
/// validate_guess("HELLO")?; // OK
/// validate_guess("HEL")?; // Error: too short
/// validate_guess("HELLO1")?; // Error: contains number
/// ```
pub fn validate_guess(guess: &str) -> Result<()> {
    // Check length
    require!(guess.len() == WORD_LENGTH, VobleError::InvalidGuessLength);

    // Check if all characters are alphabetic
    for ch in guess.chars() {
        require!(ch.is_alphabetic(), VobleError::InvalidGuess);
    }

    Ok(())
}

/// Normalize a guess (convert to uppercase)
///
/// # Arguments
/// * `guess` - The guess to normalize
///
/// # Returns
/// Normalized guess string
pub fn normalize_guess(guess: &str) -> String {
    guess.to_uppercase()
}

// ================================
// AMOUNT VALIDATION
// ================================

/// Validate a lamports amount is positive and non-zero
///
/// # Arguments
/// * `amount` - Amount in lamports
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_amount_positive(amount: u64) -> Result<()> {
    require!(amount > 0, VobleError::InvalidPrizeAmount);
    Ok(())
}

/// Validate a lamports amount is within a range
///
/// # Arguments
/// * `amount` - Amount to validate
/// * `min` - Minimum allowed amount (inclusive)
/// * `max` - Maximum allowed amount (inclusive)
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_amount_range(amount: u64, min: u64, max: u64) -> Result<()> {
    require!(
        amount >= min && amount <= max,
        VobleError::InvalidPrizeAmount
    );
    Ok(())
}

// ================================
// RANK VALIDATION
// ================================

/// Validate a winner rank (1, 2, or 3)
///
/// # Arguments
/// * `rank` - Rank to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_rank(rank: u8) -> Result<()> {
    require!(
        rank >= 1 && rank <= TOP_WINNERS_COUNT as u8,
        VobleError::InvalidWinnerSplits
    );
    Ok(())
}

// ================================
// BASIS POINTS VALIDATION
// ================================

/// Validate basis points don't exceed 100%
///
/// # Arguments
/// * `bps` - Basis points to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_basis_points(bps: u16) -> Result<()> {
    require!(
        bps <= BASIS_POINTS_TOTAL as u16,
        VobleError::InvalidWinnerSplits
    );
    Ok(())
}

/// Validate that winner splits array is correct length and sums to 100%
///
/// # Arguments
/// * `splits` - Array of winner split percentages in basis points
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_winner_splits(splits: &[u16]) -> Result<()> {
    // Must have exactly TOP_WINNERS_COUNT splits
    require!(
        splits.len() == TOP_WINNERS_COUNT,
        VobleError::InvalidWinnerSplits
    );

    // Each split must be valid
    for &split in splits.iter() {
        validate_basis_points(split)?;
    }

    // Sum must equal 100%
    let sum: u32 = splits.iter().map(|&x| x as u32).sum();
    require!(
        sum == BASIS_POINTS_TOTAL as u32,
        VobleError::InvalidWinnerSplits
    );

    Ok(())
}

// ================================
// STRING SANITIZATION
// ================================

/// Sanitize a string by removing control characters
///
/// # Arguments
/// * `input` - String to sanitize
///
/// # Returns
/// Sanitized string
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
        .collect()
}

/// Trim and sanitize a string
///
/// # Arguments
/// * `input` - String to clean
///
/// # Returns
/// Cleaned string
pub fn clean_string(input: &str) -> String {
    sanitize_string(input.trim())
}

// ================================
// ACCOUNT VALIDATION
// ================================

/// Validate that a public key is not the default/system key
///
/// # Arguments
/// * `pubkey` - Public key to validate
///
/// # Returns
/// `Ok(())` if valid, `Err` otherwise
pub fn validate_pubkey_not_default(pubkey: &Pubkey) -> Result<()> {
    require!(*pubkey != Pubkey::default(), VobleError::Unauthorized);
    Ok(())
}

/// Validate that two public keys match
///
/// # Arguments
/// * `expected` - Expected public key
/// * `actual` - Actual public key
///
/// # Returns
/// `Ok(())` if they match, `Err` otherwise
pub fn validate_pubkey_match(expected: &Pubkey, actual: &Pubkey) -> Result<()> {
    require!(expected == actual, VobleError::Unauthorized);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_username() {
        // Valid usernames
        assert!(validate_username("alice").is_ok());
        assert!(validate_username("bob_123").is_ok());
        assert!(validate_username("user-name").is_ok());
        assert!(validate_username("Player1").is_ok());

        // Invalid usernames
        assert!(validate_username("ab").is_err()); // Too short
        assert!(validate_username("a".repeat(21).as_str()).is_err()); // Too long
        assert!(validate_username("_alice").is_err()); // Starts with underscore
        assert!(validate_username("alice_").is_err()); // Ends with underscore
        assert!(validate_username("alice__bob").is_err()); // Consecutive underscores
        assert!(validate_username("alice bob").is_err()); // Contains space
        assert!(validate_username("alice@bob").is_err()); // Invalid character
    }

    #[test]
    fn test_validate_period_id() {
        // Valid period IDs
        assert!(validate_period_id("D123").is_ok());
        assert!(validate_period_id("W45").is_ok());
        assert!(validate_period_id("M12").is_ok());
        assert!(validate_period_id("D0").is_ok());

        // Invalid period IDs
        assert!(validate_period_id("").is_err()); // Empty
        assert!(validate_period_id("D").is_err()); // No number
        assert!(validate_period_id("X123").is_err()); // Invalid prefix
        assert!(validate_period_id("123").is_err()); // No prefix
        assert!(validate_period_id("Dabc").is_err()); // Non-numeric
    }

    #[test]
    fn test_validate_guess() {
        // Valid guesses
        assert!(validate_guess("HELLO").is_ok());
        assert!(validate_guess("hello").is_ok());
        assert!(validate_guess("WoRdS").is_ok());

        // Invalid guesses
        assert!(validate_guess("HEL").is_err()); // Too short
        assert!(validate_guess("HELLOO").is_err()); // Too long
        assert!(validate_guess("HEL10").is_err()); // Contains number
        assert!(validate_guess("HEL O").is_err()); // Contains space
    }

    #[test]
    fn test_normalize_guess() {
        assert_eq!(normalize_guess("hello"), "HELLO");
        assert_eq!(normalize_guess("WoRdS"), "WORDS");
        assert_eq!(normalize_guess("HELLO"), "HELLO");
    }

    #[test]
    fn test_validate_rank() {
        assert!(validate_rank(1).is_ok());
        assert!(validate_rank(2).is_ok());
        assert!(validate_rank(3).is_ok());
        assert!(validate_rank(0).is_err());
        assert!(validate_rank(4).is_err());
    }

    #[test]
    fn test_validate_winner_splits() {
        // Valid splits
        assert!(validate_winner_splits(&[5000, 3000, 2000]).is_ok()); // 50%, 30%, 20%

        // Invalid splits
        assert!(validate_winner_splits(&[5000, 3000]).is_err()); // Wrong length
        assert!(validate_winner_splits(&[5000, 3000, 1000]).is_err()); // Sum != 100%
        assert!(validate_winner_splits(&[6000, 3000, 2000]).is_err()); // Sum > 100%
        assert!(validate_winner_splits(&[11000, 0, 0]).is_err()); // Individual > 100%
    }

    #[test]
    fn test_sanitize_string() {
        assert_eq!(sanitize_string("hello"), "hello");
        assert_eq!(sanitize_string("hello\x00world"), "helloworld");
        assert_eq!(sanitize_string("hello\nworld"), "hello\nworld"); // Newline preserved
    }

    #[test]
    fn test_clean_string() {
        assert_eq!(clean_string("  hello  "), "hello");
        assert_eq!(clean_string("hello\x00world"), "helloworld");
    }

    #[test]
    fn test_is_username_appropriate() {
        assert!(is_username_appropriate("alice_123"));
        assert!(is_username_appropriate("player_one"));

        // Blocked words
        assert!(!is_username_appropriate("admin"));
        assert!(!is_username_appropriate("Admin123"));
        assert!(!is_username_appropriate("root_user"));
    }
}
