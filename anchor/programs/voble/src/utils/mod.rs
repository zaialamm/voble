//! Utility Functions Module
//!
//! This module provides reusable utility functions used throughout the Voble program.
//! These utilities help maintain clean, DRY (Don't Repeat Yourself) code and provide
//! consistent implementations for common operations.
//!
//! # Modules
//!
//! ## `pda`
//! Program Derived Address (PDA) derivation helpers. Provides functions to:
//! - Derive PDAs for all account types (config, vaults, user profiles, etc.)
//! - Find account addresses deterministically
//! - Centralize PDA logic for consistency
//!
//! ## `period`
//! Period calculation and validation utilities. Handles:
//! - Calculating current period IDs (D123, W45, M12)
//! - Converting timestamps to periods
//! - Validating period IDs
//! - Determining if periods have ended
//!
//! ## `math`
//! Mathematical utilities for financial calculations. Includes:
//! - Basis points calculations (avoiding floating-point arithmetic)
//! - Safe arithmetic operations (overflow/underflow checks)
//! - Prize distribution calculations
//! - SOL/lamports conversions
//!
//! ## `validation`
//! Input validation functions for security and data integrity. Validates:
//! - Usernames (length, characters, format)
//! - Period IDs (format, validity)
//! - Guesses (Wordle game rules)
//! - Amounts (ranges, positivity)
//! - Basis points and winner splits
//!
//! # Usage Example
//!
//! ```rust
//! use crate::utils::*;
//!
//! // Derive a PDA
//! let (profile_pda, bump) = pda::derive_user_profile_pda(&user, &program_id);
//!
//! // Calculate current period
//! let period_id = period::get_current_period_id(
//!     period::PeriodType::Daily,
//!     Clock::get()?.unix_timestamp
//! );
//!
//! // Calculate prize amount
//! let prize = math::calculate_bps(vault_balance, 5000); // 50%
//!
//! // Validate username
//! validation::validate_username(&username)?;
//! ```

pub mod math;
pub mod pda;
pub mod period;
pub mod validation;

// Re-export commonly used items for convenience
pub use math::{calculate_bps, validate_bps_sum_equals_100, BASIS_POINTS_TOTAL};
pub use period::{
    get_current_period_id, validate_period_id as validate_period_id_format, PeriodType,
};
pub use validation::{
    validate_guess, validate_period_id, validate_rank, validate_username, validate_winner_splits,
};
