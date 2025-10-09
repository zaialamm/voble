use anchor_lang::prelude::*;
use super::period::PeriodIds;

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
    #[max_len(MAX_LEADERBOARD_SIZE)]
    pub entries: Vec<LeaderEntry>,
    pub total_players: u32,
    pub prize_pool: u64,
    pub finalized: bool,
    pub created_at: i64,
    pub finalized_at: Option<i64>,
}

// Leaderboard constants
pub const MAX_LEADERBOARD_SIZE: usize = 10; // Top 10 players per period
