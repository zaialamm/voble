use anchor_lang::prelude::*;

// ============ PROGRAM SEEDS (PDA) ============

/// Global config account seed
pub const SEED_GLOBAL_CONFIG: &[u8] = b"global_config_v2";

/// User profile account seed
pub const SEED_USER_PROFILE: &[u8] = b"user_profile";

/// Game session account seed
pub const SEED_SESSION: &[u8] = b"session";

/// Leaderboard account seed
pub const SEED_LEADERBOARD: &[u8] = b"leaderboard";

/// Period state account seeds
pub const SEED_DAILY_PERIOD: &[u8] = b"daily_period";
pub const SEED_WEEKLY_PERIOD: &[u8] = b"weekly_period";
pub const SEED_MONTHLY_PERIOD: &[u8] = b"monthly_period";

/// Winner entitlement account seed
pub const SEED_WINNER_ENTITLEMENT: &[u8] = b"winner_entitlement";

/// Prize vault seeds
pub const SEED_DAILY_PRIZE_VAULT: &[u8] = b"daily_prize_vault";
pub const SEED_WEEKLY_PRIZE_VAULT: &[u8] = b"weekly_prize_vault";
pub const SEED_MONTHLY_PRIZE_VAULT: &[u8] = b"monthly_prize_vault";
pub const SEED_PLATFORM_VAULT: &[u8] = b"platform_vault";
pub const SEED_LUCKY_DRAW_VAULT: &[u8] = b"lucky_draw_vault";

/// Ticket receipt account seed
pub const SEED_TICKET_RECEIPT: &[u8] = b"ticket_receipt";

// ============ PERIOD CONFIGURATION ============

/// Daily period duration (24 hours)
pub const PERIOD_DAILY_DURATION: i64 = 24 * 60 * 60; // seconds

/// Weekly period duration (7 days)
pub const PERIOD_WEEKLY_DURATION: i64 = 7 * 24 * 60 * 60; // seconds

/// Monthly period duration (30 days)
pub const PERIOD_MONTHLY_DURATION: i64 = 30 * 24 * 60 * 60; // seconds

/// Epoch start timestamp (2024-01-01 00:00:00 UTC+8)
pub const PERIOD_EPOCH_START: i64 = 1704038400; // January 1, 2024 00:00:00 UTC+8

// ============ GAME CONFIGURATION ============

/// Word length for Voble game
pub const WORD_LENGTH: usize = 6;

/// Maximum number of guesses allowed
pub const MAX_GUESSES: u8 = 7;

/// Minimum ticket price (0.001 SOL)
pub const MIN_TICKET_PRICE: u64 = 1_000_000; // lamports

// ============ LEADERBOARD CONFIGURATION ============

/// Maximum leaderboard entries to track
pub const MAX_LEADERBOARD_SIZE: usize = 10;

/// Number of top winners per period
pub const TOP_WINNERS_COUNT: usize = 3;

// ============ STRING LENGTH LIMITS ============

/// Minimum username length
pub const MIN_USERNAME_LENGTH: usize = 3;

/// Maximum username length
pub const MAX_USERNAME_LENGTH: usize = 32;

/// Maximum period ID length
pub const MAX_PERIOD_ID_LENGTH: usize = 20;

/// Maximum session ID length
pub const MAX_SESSION_ID_LENGTH: usize = 50;

/// Maximum period type string length
pub const MAX_PERIOD_TYPE_LENGTH: usize = 10;

/// Maximum achievements per user
pub const MAX_ACHIEVEMENTS: usize = 10;

// ============ SCORING CONFIGURATION ============

/// Score for winning in 1 guess
pub const SCORE_GUESS_1: u32 = 1000;

/// Score for winning in 2 guesses
pub const SCORE_GUESS_2: u32 = 800;

/// Score for winning in 3 guesses
pub const SCORE_GUESS_3: u32 = 600;

/// Score for winning in 4 guesses
pub const SCORE_GUESS_4: u32 = 400;

/// Score for winning in 5 guesses
pub const SCORE_GUESS_5: u32 = 300;

/// Score for winning in 6 guesses
pub const SCORE_GUESS_6: u32 = 200;

/// Score for winning in 7 guesses
pub const SCORE_GUESS_7: u32 = 100;

// ============ TIME BONUS THRESHOLDS ============

/// Time threshold for tier 1 bonus (30 seconds)
pub const TIME_BONUS_TIER_1: u64 = 30_000; // milliseconds

/// Time threshold for tier 2 bonus (1 minute)
pub const TIME_BONUS_TIER_2: u64 = 60_000; // milliseconds

/// Time threshold for tier 3 bonus (2 minutes)
pub const TIME_BONUS_TIER_3: u64 = 120_000; // milliseconds

/// Time threshold for tier 4 bonus (5 minutes)
pub const TIME_BONUS_TIER_4: u64 = 300_000; // milliseconds

/// Time bonus for tier 1 (speed demon)
pub const BONUS_TIER_1: u32 = 500;

/// Time bonus for tier 2 (fast solver)
pub const BONUS_TIER_2: u32 = 300;

/// Time bonus for tier 3 (quick)
pub const BONUS_TIER_3: u32 = 150;

/// Time bonus for tier 4 (decent)
pub const BONUS_TIER_4: u32 = 50;

// ============ ACHIEVEMENT IDS ============

/// Achievement: First game played
pub const ACHIEVEMENT_FIRST_GAME: u8 = 1;

/// Achievement: First win
pub const ACHIEVEMENT_FIRST_WIN: u8 = 2;

/// Achievement: Win in 1-2 guesses (lucky guess)
pub const ACHIEVEMENT_LUCKY_GUESS: u8 = 3;

/// Achievement: 3-game winning streak
pub const ACHIEVEMENT_STREAK_3: u8 = 4;

/// Achievement: 7-game winning streak
pub const ACHIEVEMENT_STREAK_7: u8 = 5;

/// Achievement: Win 10 games with 3 or fewer guesses (perfectionist)
pub const ACHIEVEMENT_PERFECTIONIST: u8 = 6;

/// Achievement: Social butterfly (unused - no friend system yet)
pub const ACHIEVEMENT_SOCIAL_BUTTERFLY: u8 = 7;

// ============ FINANCIAL CONFIGURATION ============

/// Basis points total (100%)
pub const BASIS_POINTS_TOTAL: u16 = 10_000;

// ============ EXTERNAL PROGRAM IDS ============

/// MagicBlock Ephemeral Rollups - Asia validator (Devnet)
pub const ER_VALIDATOR_ASIA: Pubkey = pubkey!("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");

/// Demo word list for testing (INSECURE - replace with VRF)
pub const VOBLE_WORDS: [&str; 20] = [
    "ANCHOR", "BRIDGE", "CASTLE", "DRAGON", "ENERGY", "FOREST", "GARDEN", "HAMMER", "ISLAND",
    "JUNGLE", "KERNEL", "LADDER", "MARKET", "NATURE", "ORANGE", "PUZZLE", "QUARTZ", "ROCKET",
    "SOLANA", "TEMPLE",
];
