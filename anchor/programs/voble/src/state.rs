//! State module - All on-chain account structures for the Voble game

use anchor_lang::prelude::*;

// ============================================================================
// GLOBAL CONFIGURATION
// ============================================================================

/// Global configuration for the Voble game
#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub ticket_price: u64,
    pub prize_split_daily: u16,
    pub prize_split_weekly: u16,
    pub prize_split_monthly: u16,
    pub platform_revenue_split: u16,
    pub lucky_draw_split: u16,
    #[max_len(3)]
    pub winner_splits: Vec<u16>,
    pub paused: bool,
    pub usdc_mint: Pubkey,
}

// ============================================================================
// USER PROFILE & SESSION
// ============================================================================

/// User profile for Voble game - Optimized for minimal rent cost
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub player: Pubkey,
    #[max_len(32)]
    pub username: String,

    // Voble-specific stats
    pub total_games_played: u32,
    pub games_won: u32,      // Successfully guessed the word
    pub current_streak: u32, // Current winning streak
    pub max_streak: u32,     // Best winning streak
    pub total_score: u64,
    pub best_score: u32,
    pub average_guesses: f32, // Average guesses when winning

    // Guess distribution (how many games won in 1, 2, 3, 4, 5, 6, 7 guesses)
    pub guess_distribution: [u32; 7],

    // Period tracking (7-minute periods for testing)
    #[max_len(20)]
    pub last_played_period: String, // Period ID like "D123"
    #[max_len(20)]
    pub last_paid_period: String,   // Track last payment to prevent free play on ER
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
    pub word_index: u32,            // Index of word in VOCABRUSH_WORDS array (for validation)
    #[max_len(6)]
    pub target_word: String, // Revealed only after game completion (empty during game)
    pub guesses: [Option<GuessData>; 7], // Fixed array for up to 7 guesses (optimized!)
    pub is_solved: bool,            // Did player guess correctly?
    pub guesses_used: u8,           // Number of guesses used (max 7)
    pub time_ms: u64,               // Time taken to complete
    pub score: u32,                 // Final score
    pub completed: bool,
    #[max_len(20)]
    pub period_id: String, // Period ID like "D123" for 7-minute periods
    pub vrf_request_timestamp: i64, // Timestamp when VRF was requested (for freshness validation)
    #[max_len(200)]
    pub keystrokes: Vec<KeystrokeData>,
    #[max_len(6)]
    pub current_input: String,  // Current typing buffer
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
    Correct, // Green - correct letter in correct position
    Present, // Yellow - correct letter in wrong position
    Absent,  // Gray - letter not in word
}

/// Achievement tracking - Optimized (name/description stored in frontend)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Achievement {
    pub id: u8,
    pub unlocked_at: Option<i64>,
}

// ============================================================================
// PERIOD TRACKING
// ============================================================================

/// Period identifiers for daily, weekly, and monthly competitions
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct PeriodIds {
    #[max_len(20)]
    pub day_id: String,
    #[max_len(20)]
    pub week_id: String,
    #[max_len(20)]
    pub month_id: String,
}

// ============================================================================
// PRIZE & WINNER MANAGEMENT
// ============================================================================

/// Winner entitlement for prize claiming
#[account]
#[derive(InitSpace)]
pub struct WinnerEntitlement {
    pub player: Pubkey,
    #[max_len(10)]
    pub period_type: String,
    #[max_len(20)]
    pub period_id: String,
    pub rank: u8,
    pub amount: u64,
    pub claimed: bool,
}

/// Period state tracking finalization and winners
#[account]
#[derive(InitSpace)]
pub struct PeriodState {
    #[max_len(10)]
    pub period_type: String,
    #[max_len(20)]
    pub period_id: String,
    pub finalized: bool,
    pub total_participants: u32,
    pub vault_balance_at_finalization: u64,
    #[max_len(3)]
    pub winners: Vec<Pubkey>,
}

// ============================================================================
// LEADERBOARD
// ============================================================================

/// Leaderboard entry (legacy, may not be used)
#[account]
#[derive(InitSpace)]
pub struct LeaderboardEntry {
    pub player: Pubkey,
    #[max_len(50)]
    pub session_id: String,
    pub correct_count: u8,
    pub time_ms: u64,
    pub guesses_used: u8,
    pub timestamp: i64,
    pub period_ids: PeriodIds,
}

/// Period type enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum PeriodType {
    Daily = 0,
    Weekly = 1,
    Monthly = 2,
}

// Implement Space manually for PeriodType
impl anchor_lang::Space for PeriodType {
    const INIT_SPACE: usize = 1; // u8 repr
}

impl PeriodType {
    pub fn to_string(&self) -> String {
        match self {
            PeriodType::Daily => "daily".to_string(),
            PeriodType::Weekly => "weekly".to_string(),
            PeriodType::Monthly => "monthly".to_string(),
        }
    }
}

/// Single leaderboard entry
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct LeaderEntry {
    pub player: Pubkey,
    pub score: u32,
    pub guesses_used: u8,
    pub time_ms: u64,
    pub timestamp: i64,
    #[max_len(32)]
    pub username: String,
}

/// Period leaderboard tracking top players
#[account]
#[derive(InitSpace)]
pub struct PeriodLeaderboard {
    #[max_len(20)]
    pub period_id: String,
    pub period_type: PeriodType,
    #[max_len(100)] // Using MAX_LEADERBOARD_SIZE constant
    pub entries: Vec<LeaderEntry>,
    pub total_players: u32,
    pub prize_pool: u64,
    pub finalized: bool,
    pub created_at: i64,
    pub finalized_at: Option<i64>,
}

/// Individual keystroke data for anti-cheat and analytics
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct KeystrokeData {
    #[max_len(10)]
    pub key: String,        // "A", "Backspace", "Enter", etc.
    pub timestamp_ms: u64,  // Relative to game start
    pub guess_index: u8,    // Which guess (0-6)
}
