//! PDA (Program Derived Address) Derivation Helpers
//!
//! This module provides utility functions for deriving Program Derived Addresses (PDAs)
//! used throughout the Voble program. PDAs are deterministic addresses derived from
//! seeds without requiring a private key.
//!
//! # Why Use This Module?
//! - **Consistency**: All PDA derivations use the same seeds across the codebase
//! - **Safety**: Centralized logic reduces typos and errors
//! - **Maintainability**: Easy to update PDA logic in one place
//! - **Discoverability**: Clear documentation of all PDAs used in the program
//!
//! # PDA Categories
//! - Global: Config, vaults, system accounts
//! - User: Profiles, game sessions
//! - Period: Leaderboards, period states, entitlements

use crate::constants::*;
use anchor_lang::prelude::*;

// ================================
// GLOBAL ACCOUNT PDAs
// ================================

/// Derive the global config PDA
///
/// # Returns
/// `(Pubkey, u8)` - The PDA address and bump seed
///
/// # Example
/// ```
/// let (config_pda, bump) = derive_global_config_pda(&program_id);
/// ```
pub fn derive_global_config_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_GLOBAL_CONFIG], program_id)
}

/// Derive the daily prize vault PDA
pub fn derive_daily_vault_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_DAILY_PRIZE_VAULT], program_id)
}

/// Derive the weekly prize vault PDA
pub fn derive_weekly_vault_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_WEEKLY_PRIZE_VAULT], program_id)
}

/// Derive the monthly prize vault PDA
pub fn derive_monthly_vault_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_MONTHLY_PRIZE_VAULT], program_id)
}

/// Derive the platform revenue vault PDA
pub fn derive_platform_vault_pda(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_PLATFORM_VAULT], program_id)
}

/// Derive vault PDA based on period type
///
/// # Arguments
/// * `period_type` - "daily", "weekly", or "monthly"
/// * `program_id` - The program ID
///
/// # Returns
/// `Some((Pubkey, u8))` if valid period type, `None` otherwise
pub fn derive_vault_pda_for_period(period_type: &str, program_id: &Pubkey) -> Option<(Pubkey, u8)> {
    match period_type {
        "daily" => Some(derive_daily_vault_pda(program_id)),
        "weekly" => Some(derive_weekly_vault_pda(program_id)),
        "monthly" => Some(derive_monthly_vault_pda(program_id)),
        _ => None,
    }
}

// ================================
// USER ACCOUNT PDAs
// ================================

/// Derive a user profile PDA
///
/// # Arguments
/// * `user` - The user's wallet public key
/// * `program_id` - The program ID
///
/// # Returns
/// `(Pubkey, u8)` - The PDA address and bump seed
///
/// # Example
/// ```
/// let (profile_pda, bump) = derive_user_profile_pda(&user_pubkey, &program_id);
/// ```
pub fn derive_user_profile_pda(user: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_USER_PROFILE, user.as_ref()], program_id)
}

/// Derive a game session PDA
///
/// # Arguments
/// * `user` - The user's wallet public key
/// * `period_id` - The period identifier (e.g., "D123")
/// * `program_id` - The program ID
///
/// # Returns
/// `(Pubkey, u8)` - The PDA address and bump seed
///
/// # Example
/// ```
/// let (session_pda, bump) = derive_game_session_pda(&user, "D123", &program_id);
/// ```
pub fn derive_game_session_pda(
    user: &Pubkey,
    period_id: &str,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SEED_SESSION, user.as_ref(), period_id.as_bytes()],
        program_id,
    )
}

// ================================
// PERIOD ACCOUNT PDAs
// ================================

/// Derive a period state PDA for daily periods
///
/// # Arguments
/// * `period_id` - The period identifier (e.g., "D123")
/// * `program_id` - The program ID
pub fn derive_daily_period_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_DAILY_PERIOD, period_id.as_bytes()], program_id)
}

/// Derive a period state PDA for weekly periods
pub fn derive_weekly_period_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_WEEKLY_PERIOD, period_id.as_bytes()], program_id)
}

/// Derive a period state PDA for monthly periods
pub fn derive_monthly_period_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_MONTHLY_PERIOD, period_id.as_bytes()], program_id)
}

/// Derive period state PDA based on period type
///
/// # Arguments
/// * `period_type` - "daily", "weekly", or "monthly"
/// * `period_id` - The period identifier
/// * `program_id` - The program ID
pub fn derive_period_pda_for_type(
    period_type: &str,
    period_id: &str,
    program_id: &Pubkey,
) -> Option<(Pubkey, u8)> {
    match period_type {
        "daily" => Some(derive_daily_period_pda(period_id, program_id)),
        "weekly" => Some(derive_weekly_period_pda(period_id, program_id)),
        "monthly" => Some(derive_monthly_period_pda(period_id, program_id)),
        _ => None,
    }
}

// ================================
// LEADERBOARD PDAs
// ================================

/// Derive a leaderboard PDA for daily periods
pub fn derive_daily_leaderboard_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SEED_LEADERBOARD, period_id.as_bytes(), b"daily"],
        program_id,
    )
}

/// Derive a leaderboard PDA for weekly periods
pub fn derive_weekly_leaderboard_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SEED_LEADERBOARD, period_id.as_bytes(), b"weekly"],
        program_id,
    )
}

/// Derive a leaderboard PDA for monthly periods
pub fn derive_monthly_leaderboard_pda(period_id: &str, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SEED_LEADERBOARD, period_id.as_bytes(), b"monthly"],
        program_id,
    )
}

/// Derive leaderboard PDA based on period type
pub fn derive_leaderboard_pda_for_type(
    period_type: &str,
    period_id: &str,
    program_id: &Pubkey,
) -> Option<(Pubkey, u8)> {
    match period_type {
        "daily" => Some(derive_daily_leaderboard_pda(period_id, program_id)),
        "weekly" => Some(derive_weekly_leaderboard_pda(period_id, program_id)),
        "monthly" => Some(derive_monthly_leaderboard_pda(period_id, program_id)),
        _ => None,
    }
}

// ================================
// WINNER ENTITLEMENT PDAs
// ================================

/// Derive a winner entitlement PDA for daily prizes
///
/// # Arguments
/// * `winner` - The winner's public key
/// * `period_id` - The period identifier
/// * `program_id` - The program ID
pub fn derive_daily_winner_pda(
    winner: &Pubkey,
    period_id: &str,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SEED_WINNER_ENTITLEMENT,
            winner.as_ref(),
            b"daily",
            period_id.as_bytes(),
        ],
        program_id,
    )
}

/// Derive a winner entitlement PDA for weekly prizes
pub fn derive_weekly_winner_pda(
    winner: &Pubkey,
    period_id: &str,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SEED_WINNER_ENTITLEMENT,
            winner.as_ref(),
            b"weekly",
            period_id.as_bytes(),
        ],
        program_id,
    )
}

/// Derive a winner entitlement PDA for monthly prizes
pub fn derive_monthly_winner_pda(
    winner: &Pubkey,
    period_id: &str,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SEED_WINNER_ENTITLEMENT,
            winner.as_ref(),
            b"monthly",
            period_id.as_bytes(),
        ],
        program_id,
    )
}

/// Derive winner entitlement PDA based on period type
pub fn derive_winner_pda_for_type(
    period_type: &str,
    winner: &Pubkey,
    period_id: &str,
    program_id: &Pubkey,
) -> Option<(Pubkey, u8)> {
    match period_type {
        "daily" => Some(derive_daily_winner_pda(winner, period_id, program_id)),
        "weekly" => Some(derive_weekly_winner_pda(winner, period_id, program_id)),
        "monthly" => Some(derive_monthly_winner_pda(winner, period_id, program_id)),
        _ => None,
    }
}

// ================================
// HELPER FUNCTIONS
// ================================

/// Get the period seed prefix based on period type
///
/// # Returns
/// `Some(&[u8])` if valid period type, `None` otherwise
pub fn get_period_seed_prefix(period_type: &str) -> Option<&'static [u8]> {
    match period_type {
        "daily" => Some(SEED_DAILY_PERIOD),
        "weekly" => Some(SEED_WEEKLY_PERIOD),
        "monthly" => Some(SEED_MONTHLY_PERIOD),
        _ => None,
    }
}

/// Get the vault seed based on period type
pub fn get_vault_seed(period_type: &str) -> Option<&'static [u8]> {
    match period_type {
        "daily" => Some(SEED_DAILY_PRIZE_VAULT),
        "weekly" => Some(SEED_WEEKLY_PRIZE_VAULT),
        "monthly" => Some(SEED_MONTHLY_PRIZE_VAULT),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_global_config_pda() {
        let program_id = Pubkey::new_unique();
        let (pda, _bump) = derive_global_config_pda(&program_id);
        assert!(pda != Pubkey::default());
    }

    #[test]
    fn test_derive_user_profile_pda() {
        let program_id = Pubkey::new_unique();
        let user = Pubkey::new_unique();
        let (pda, _bump) = derive_user_profile_pda(&user, &program_id);
        assert!(pda != Pubkey::default());
    }

    #[test]
    fn test_derive_vault_for_period() {
        let program_id = Pubkey::new_unique();

        assert!(derive_vault_pda_for_period("daily", &program_id).is_some());
        assert!(derive_vault_pda_for_period("weekly", &program_id).is_some());
        assert!(derive_vault_pda_for_period("monthly", &program_id).is_some());
        assert!(derive_vault_pda_for_period("invalid", &program_id).is_none());
    }

    #[test]
    fn test_pda_determinism() {
        let program_id = Pubkey::new_unique();
        let user = Pubkey::new_unique();

        // Same inputs should produce same PDA
        let (pda1, bump1) = derive_user_profile_pda(&user, &program_id);
        let (pda2, bump2) = derive_user_profile_pda(&user, &program_id);

        assert_eq!(pda1, pda2);
        assert_eq!(bump1, bump2);
    }

    #[test]
    fn test_period_seeds_helper() {
        assert_eq!(get_period_seed_prefix("daily"), Some(SEED_DAILY_PERIOD));
        assert_eq!(get_period_seed_prefix("weekly"), Some(SEED_WEEKLY_PERIOD));
        assert_eq!(get_period_seed_prefix("monthly"), Some(SEED_MONTHLY_PERIOD));
        assert_eq!(get_period_seed_prefix("invalid"), None);
    }

    #[test]
    fn test_vault_seeds_helper() {
        assert_eq!(get_vault_seed("daily"), Some(SEED_DAILY_PRIZE_VAULT));
        assert_eq!(get_vault_seed("weekly"), Some(SEED_WEEKLY_PRIZE_VAULT));
        assert_eq!(get_vault_seed("monthly"), Some(SEED_MONTHLY_PRIZE_VAULT));
        assert_eq!(get_vault_seed("invalid"), None);
    }
}
