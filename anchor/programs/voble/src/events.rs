use anchor_lang::prelude::*;
use crate::state::{LetterResult, PeriodType};

#[event]
pub struct GlobalConfigInitialized {
    pub authority: Pubkey,
    pub ticket_price: u64,
}

#[event]
pub struct TicketPurchased {
    pub player: Pubkey,
    pub amount: u64,
    pub daily_amount: u64,
    pub weekly_amount: u64,
    pub monthly_amount: u64,
    pub platform_amount: u64,
}

#[event]
pub struct LeaderboardEntryCreated {
    pub player: Pubkey,
    pub session_id: String,
    pub timestamp: i64,
}

#[event]
pub struct ScoreRecorded {
    pub player: Pubkey,
    pub session_id: String,
    pub correct_count: u8,
    pub time_ms: u64,
    pub guesses_used: u8,
    pub timestamp: i64,
}

#[event]
pub struct PeriodFinalized {
    pub period_type: String,
    pub period_id: String,
    pub vault_balance: u64,
    pub winner_amounts: Vec<u64>,
}

#[event]
pub struct PrizeClaimed {
    pub winner: Pubkey,
    pub period_type: String,
    pub period_id: String,
    pub rank: u8,
    pub amount: u64,
}

#[event]
pub struct PeriodFinalizedWithWinners {
    pub period_type: String,
    pub period_id: String,
    pub vault_balance: u64,
    pub winners: Vec<Pubkey>,
    pub winner_amounts: Vec<u64>,
    pub total_participants: u32,
}

#[event]
pub struct VaultsInitialized {
    pub daily_vault: Pubkey,
    pub weekly_vault: Pubkey,
    pub monthly_vault: Pubkey,
    pub platform_vault: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct PlatformRevenueWithdrawn {
    pub authority: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub remaining_balance: u64,
}

#[event]
pub struct SessionEnded {
    pub player: Pubkey,
    pub session_id: String,
    pub rent_returned: u64,
    pub timestamp: i64,
}

// User Profile Events

#[event]
pub struct UserProfileCreated {
    pub player: Pubkey,
    pub username: String,
    pub created_at: i64,
}

#[event]
pub struct GameSessionStarted {
    pub player: Pubkey,
    pub session_id: String,
    pub timestamp: i64,
}

#[event]
pub struct SessionScoreUpdated {
    pub player: Pubkey,
    pub session_id: String,
    pub correct_count: u8,
    pub time_ms: u64,
    pub guesses_used: u8,
    pub score: u32,
}

#[event]
pub struct KeystrokeRecorded {
    pub player: Pubkey,
    pub session_id: String,
    pub key: String,
    pub timestamp_ms: u64,
    pub current_input: String,
    pub guess_index: u8,
}

#[event]
pub struct SessionCompleted {
    pub player: Pubkey,
    pub session_id: String,
    pub final_score: u32,
    pub total_games_played: u32,
}

#[event]
pub struct FriendAdded {
    pub player: Pubkey,
    pub friend: Pubkey,
    pub total_friends: u32,
}

#[event]
pub struct LeaderboardEntryMigrated {
    pub player: Pubkey,
    pub old_session_id: String,
    pub migrated_score: u32,
    pub total_games: u32,
}

#[event]
pub struct AchievementUnlocked {
    pub player: Pubkey,
    pub achievement_id: u8,
    pub unlocked_at: i64,
}

#[event]
pub struct BatchLeaderboardMigrated {
    pub player: Pubkey,
    pub entries_migrated: u32,
    pub total_score_added: u64,
    pub new_total_games: u32,
}

#[event]
pub struct MigrationStatusChecked {
    pub player: Pubkey,
    pub total_games_played: u32,
    pub total_score: u64,
    pub profile_created_at: i64,
    pub migration_complete: bool,
}

#[event]
pub struct ProfileSettingsUpdated {
    pub player: Pubkey,
    pub username: String,
    pub is_premium: bool,
}

#[event]
pub struct UserStatsCalculated {
    pub player: Pubkey,
    pub total_games: u32,
    pub best_score: u32,
    pub average_score: u64,
    pub accuracy_percentage: u32,
    pub total_friends: u32,
    pub achievements_unlocked: u32,
}

// Voble-specific Events

#[event]
pub struct VobleGameStarted {
    pub player: Pubkey,
    pub session_id: String,
    pub period_id: String,
    pub target_word_hash: String, // Should be hashed in production
    pub timestamp: i64,
}

#[event]
pub struct GuessSubmitted {
    pub player: Pubkey,
    pub session_id: String,
    pub guess: String,
    pub guess_number: u8,
    pub is_correct: bool,
    pub result: [LetterResult; 6],
}

#[event]
pub struct VobleGameCompleted {
    pub player: Pubkey,
    pub session_id: String,
    pub target_word: String,
    pub is_solved: bool,
    pub guesses_used: u8,
    pub final_score: u32,
    pub current_streak: u32,
    pub total_games_played: u32,
    pub games_won: u32,
}

#[event]
pub struct VobleStatsCalculated {
    pub player: Pubkey,
    pub total_games: u32,
    pub games_won: u32,
    pub win_rate: f32,
    pub current_streak: u32,
    pub max_streak: u32,
    pub average_guesses: f32,
    pub best_score: u32,
    pub average_score: u64,
    pub guess_distribution: [u32; 7],
    pub achievements_unlocked: u32,
}

// Leaderboard events
#[event]
pub struct LeaderboardInitialized {
    pub period_id: String,
    pub period_type: PeriodType,
    pub created_at: i64,
}

#[event]
pub struct LeaderboardUpdated {
    pub period_id: String,
    pub player: Pubkey,
    pub score: u32,
    pub rank: u8,
    pub total_players: u32,
}

#[event]
pub struct WinnerDetermined {
    pub period_id: String,
    pub player: Pubkey,
    pub rank: u8,
    pub score: u32,
    pub username: String,
}

#[event]
pub struct LeaderboardFinalized {
    pub period_id: String,
    pub period_type: PeriodType,
    pub total_players: u32,
    pub winners_count: u8,
    pub finalized_at: i64,
}

