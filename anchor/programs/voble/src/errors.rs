use anchor_lang::prelude::*;

#[error_code]
pub enum VobleError {
    #[msg("Game is currently paused")]
    GamePaused,
    #[msg("Invalid correct count (must be 0-3)")]
    InvalidCorrectCount,
    #[msg("Invalid guesses used (must be 0-15)")]
    InvalidGuessesUsed,
    #[msg("Prize already claimed")]
    AlreadyClaimed,
    #[msg("Period already finalized")]
    PeriodAlreadyFinalized,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("No participants found for this period")]
    NoParticipants,
    #[msg("Invalid winner splits configuration")]
    InvalidWinnerSplits,
    #[msg("Invalid prize split percentages")]
    InvalidPrizeSplits,
    #[msg("Session ID too long (max 50 characters)")]
    SessionIdTooLong,
    #[msg("Period ID too long (max 20 characters)")]
    PeriodIdTooLong,
    #[msg("Period type too long (max 10 characters)")]
    PeriodTypeTooLong,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Period not found")]
    PeriodNotFound,
    #[msg("Invalid period state")]
    InvalidPeriodState,
    #[msg("Daily play limit exceeded (1 game per day)")]
    DailyLimitExceeded,
    #[msg("Session ID cannot be empty")]
    SessionIdEmpty,
    #[msg("Invalid score (must be 0-3)")]
    InvalidScore,
    #[msg("Invalid guess count (must be 0-15)")]
    InvalidGuessCount,
    #[msg("Invalid winner count (must be exactly 3)")]
    InvalidWinnerCount,
    #[msg("Winners not sorted correctly by score")]
    InvalidWinnerOrder,
    #[msg("Invalid prize amount")]
    InvalidPrizeAmount,
    #[msg("Invalid time in milliseconds")]
    InvalidTimeMs,
    #[msg("Target word not set - VRF callback pending")]
    WordNotSet,
    #[msg("Invalid username format or length")]
    InvalidUsername,
    #[msg("Invalid guess length (must be 6 characters)")]
    InvalidGuessLength,
    #[msg("Invalid guess format (must contain only letters)")]
    InvalidGuess,
    #[msg("Player has already played this period")]
    AlreadyPlayedThisPeriod,
    #[msg("Too many keystrokes (max 200)")]
    TooManyKeystrokes,
    #[msg("Invalid input")]
    InvalidInput,
}
