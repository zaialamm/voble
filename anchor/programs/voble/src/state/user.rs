use anchor_lang::prelude::*;

/// User profile for Voble game - Optimized for minimal rent cost
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub player: Pubkey,
    #[max_len(32)]
    pub username: String,
    
    // Voble-specific stats
    pub total_games_played: u32,
    pub games_won: u32, // Successfully guessed the word
    pub current_streak: u32, // Current winning streak
    pub max_streak: u32, // Best winning streak
    pub total_score: u64,
    pub best_score: u32,
    pub average_guesses: f32, // Average guesses when winning
    
    // Guess distribution (how many games won in 1, 2, 3, 4, 5, 6, 7 guesses)
    pub guess_distribution: [u32; 7],
    
    // Period tracking (7-minute periods for testing)
    #[max_len(20)]
    pub last_played_period: String, // Period ID like "D123"
    pub has_played_this_period: bool,
    
    // Achievements (optimized - only ID and unlock timestamp)
    #[max_len(10)]
    pub achievements: Vec<Achievement>,
    
    // Timestamps
    pub created_at: i64,
    pub last_played: i64,
}

/// Separate SessionAccount for active game (Priority 1 & 3: Separate account + Fixed arrays)
#[account]
#[derive(InitSpace)]
pub struct SessionAccount {
    pub player: Pubkey,
    #[max_len(50)]
    pub session_id: String,
    pub target_word_hash: [u8; 32], // Hash of target word (hidden during game)
    pub word_index: u32, // Index of word in VOCABRUSH_WORDS array (for validation)
    #[max_len(6)]
    pub target_word: String, // Revealed only after game completion (empty during game)
    pub guesses: [Option<GuessData>; 7], // Fixed array for up to 7 guesses (optimized!)
    pub is_solved: bool, // Did player guess correctly?
    pub guesses_used: u8, // Number of guesses used (max 7)
    pub time_ms: u64, // Time taken to complete
    pub score: u32, // Final score
    pub completed: bool,
    #[max_len(20)]
    pub period_id: String, // Period ID like "D123" for 7-minute periods
    pub vrf_request_timestamp: i64, // Timestamp when VRF was requested (for freshness validation)
}

/// Guess data with result (used in fixed array)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct GuessData {
    #[max_len(6)]
    pub guess: String, // The guessed word
    pub result: [LetterResult; 6], // Result for each letter position
}

/// Result for a single guess
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct GuessResult {
    #[max_len(6)]
    pub guess: String, // The guessed word
    pub result: [LetterResult; 6], // Result for each letter position
}

/// Result for each letter in a guess
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, InitSpace, PartialEq, Eq)]
pub enum LetterResult {
    Correct,   // Green - correct letter in correct position
    Present,   // Yellow - correct letter in wrong position
    Absent,    // Gray - letter not in word
}

/// Achievement tracking - Optimized (name/description stored in frontend)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Achievement {
    pub id: u8,
    pub unlocked_at: Option<i64>,
}

// Voble-specific Achievement IDs
pub const ACHIEVEMENT_FIRST_GAME: u8 = 1;
pub const ACHIEVEMENT_FIRST_WIN: u8 = 2;
pub const ACHIEVEMENT_LUCKY_GUESS: u8 = 3; // Win in 1-2 guesses
pub const ACHIEVEMENT_STREAK_3: u8 = 4; // 3-game winning streak
pub const ACHIEVEMENT_STREAK_7: u8 = 5; // 7-game winning streak
pub const ACHIEVEMENT_PERFECTIONIST: u8 = 6; // Win 10 games with 3 or fewer guesses
pub const ACHIEVEMENT_SOCIAL_BUTTERFLY: u8 = 7; // Fixed: was duplicate ID 5
