//! Math Utilities
//!
//! This module provides mathematical utility functions for the Voble program,
//! including basis points calculations, safe arithmetic operations, and
//! percentage conversions.
//!
//! # Basis Points
//! Basis points (bps) are a common way to express percentages in finance.
//! - 1 basis point = 0.01%
//! - 100 basis points = 1%
//! - 10,000 basis points = 100%
//!
//! Using basis points avoids floating-point arithmetic and maintains precision.

use anchor_lang::prelude::*;

/// Total basis points representing 100%
pub const BASIS_POINTS_TOTAL: u64 = 10_000;

/// Maximum percentage value (100%)
pub const MAX_PERCENTAGE: u16 = 10_000;

// ================================
// BASIS POINTS CALCULATIONS
// ================================

/// Calculate amount from basis points
///
/// # Arguments
/// * `total` - The total amount
/// * `basis_points` - Basis points to apply (e.g., 5000 = 50%)
///
/// # Returns
/// The calculated amount
///
/// # Example
/// ```
/// let vault_balance = 1_000_000; // 1 SOL
/// let winner_share = calculate_bps(vault_balance, 5000); // 50%
/// assert_eq!(winner_share, 500_000); // 0.5 SOL
/// ```
pub fn calculate_bps(total: u64, basis_points: u16) -> u64 {
    (total as u128 * basis_points as u128 / BASIS_POINTS_TOTAL as u128) as u64
}

/// Calculate percentage from basis points (with 2 decimal precision)
///
/// # Arguments
/// * `basis_points` - Basis points (e.g., 5000)
///
/// # Returns
/// Percentage as u16 with 2 decimals (e.g., 5000 bps = 50.00%)
///
/// # Example
/// ```
/// assert_eq!(bps_to_percentage(5000), 5000); // 50.00%
/// assert_eq!(bps_to_percentage(250), 250);   // 2.50%
/// ```
pub fn bps_to_percentage(basis_points: u16) -> u16 {
    basis_points
}

/// Convert percentage to basis points
///
/// # Arguments
/// * `percentage` - Percentage value (e.g., 50 for 50%)
///
/// # Returns
/// Basis points
pub fn percentage_to_bps(percentage: u8) -> u16 {
    (percentage as u16) * 100
}

/// Validate that basis points don't exceed 100%
///
/// # Arguments
/// * `basis_points` - Basis points to validate
///
/// # Returns
/// `true` if valid (≤ 10000), `false` otherwise
pub fn is_valid_bps(basis_points: u16) -> bool {
    basis_points <= MAX_PERCENTAGE
}

/// Validate that a sum of basis points equals exactly 100%
///
/// # Arguments
/// * `splits` - Array of basis point values
///
/// # Returns
/// `true` if sum equals 10000 (100%), `false` otherwise
///
/// # Example
/// ```
/// let splits = [5000, 3000, 2000]; // 50%, 30%, 20%
/// assert!(validate_bps_sum_equals_100(&splits));
/// ```
pub fn validate_bps_sum_equals_100(splits: &[u16]) -> bool {
    let sum: u32 = splits.iter().map(|&x| x as u32).sum();
    sum == BASIS_POINTS_TOTAL as u32
}

/// Validate that a sum of basis points doesn't exceed 100%
///
/// # Arguments
/// * `splits` - Array of basis point values
///
/// # Returns
/// `true` if sum ≤ 10000, `false` otherwise
pub fn validate_bps_sum_max_100(splits: &[u16]) -> bool {
    let sum: u32 = splits.iter().map(|&x| x as u32).sum();
    sum <= BASIS_POINTS_TOTAL as u32
}

// ================================
// SAFE ARITHMETIC OPERATIONS
// ================================

/// Safe addition with overflow check
///
/// # Arguments
/// * `a` - First value
/// * `b` - Second value
///
/// # Returns
/// `Some(result)` if no overflow, `None` otherwise
pub fn safe_add(a: u64, b: u64) -> Option<u64> {
    a.checked_add(b)
}

/// Safe subtraction with underflow check
///
/// # Arguments
/// * `a` - Value to subtract from
/// * `b` - Value to subtract
///
/// # Returns
/// `Some(result)` if no underflow, `None` otherwise
pub fn safe_sub(a: u64, b: u64) -> Option<u64> {
    a.checked_sub(b)
}

/// Safe multiplication with overflow check
///
/// # Arguments
/// * `a` - First value
/// * `b` - Second value
///
/// # Returns
/// `Some(result)` if no overflow, `None` otherwise
pub fn safe_mul(a: u64, b: u64) -> Option<u64> {
    a.checked_mul(b)
}

/// Safe division with zero check
///
/// # Arguments
/// * `a` - Dividend
/// * `b` - Divisor
///
/// # Returns
/// `Some(result)` if divisor is not zero, `None` otherwise
pub fn safe_div(a: u64, b: u64) -> Option<u64> {
    a.checked_div(b)
}

// ================================
// PERCENTAGE CALCULATIONS
// ================================

/// Calculate what percentage one value is of another
///
/// # Arguments
/// * `part` - The partial value
/// * `total` - The total value
///
/// # Returns
/// Percentage in basis points (e.g., 5000 = 50%)
///
/// # Example
/// ```
/// let part = 500_000;
/// let total = 1_000_000;
/// let percentage_bps = calculate_percentage_bps(part, total);
/// assert_eq!(percentage_bps, 5000); // 50%
/// ```
pub fn calculate_percentage_bps(part: u64, total: u64) -> u16 {
    if total == 0 {
        return 0;
    }
    ((part as u128 * BASIS_POINTS_TOTAL as u128) / total as u128) as u16
}

/// Calculate the remaining percentage to reach 100%
///
/// # Arguments
/// * `used_bps` - Basis points already used
///
/// # Returns
/// Remaining basis points to reach 100%
pub fn remaining_bps(used_bps: &[u16]) -> u16 {
    let sum: u32 = used_bps.iter().map(|&x| x as u32).sum();
    (BASIS_POINTS_TOTAL as u32).saturating_sub(sum) as u16
}

// ================================
// PRIZE DISTRIBUTION HELPERS
// ================================

/// Split an amount into multiple parts based on basis points
///
/// # Arguments
/// * `total` - Total amount to split
/// * `splits` - Array of basis points for each part
///
/// # Returns
/// Vector of calculated amounts
///
/// # Example
/// ```
/// let total = 1_000_000;
/// let splits = [5000, 3000, 2000]; // 50%, 30%, 20%
/// let amounts = split_by_bps(total, &splits);
/// assert_eq!(amounts, vec![500_000, 300_000, 200_000]);
/// ```
pub fn split_by_bps(total: u64, splits: &[u16]) -> Vec<u64> {
    let mut amounts = Vec::new();
    let mut remaining = total;

    for (i, &bps) in splits.iter().enumerate() {
        if i == splits.len() - 1 {
            // Last split gets the remainder to avoid rounding issues
            amounts.push(remaining);
        } else {
            let amount = calculate_bps(total, bps);
            amounts.push(amount);
            remaining = remaining.saturating_sub(amount);
        }
    }

    amounts
}

/// Calculate remainder after distributing by basis points
///
/// This function is useful for ensuring no lamports are lost due to
/// integer division rounding.
///
/// # Arguments
/// * `total` - Total amount
/// * `splits` - Array of basis points
///
/// # Returns
/// Remainder amount that wasn't distributed
pub fn calculate_remainder(total: u64, splits: &[u16]) -> u64 {
    let distributed: u64 = splits.iter().map(|&bps| calculate_bps(total, bps)).sum();
    total.saturating_sub(distributed)
}

// ================================
// CONVERSION UTILITIES
// ================================

/// Convert lamports to SOL (for display/logging purposes)
///
/// # Arguments
/// * `lamports` - Amount in lamports
///
/// # Returns
/// Amount in SOL (as u64, divide by 10^9 for actual SOL)
///
/// Note: For precise display, use: `lamports as f64 / 1_000_000_000.0`
pub fn lamports_to_sol_u64(lamports: u64) -> u64 {
    lamports / 1_000_000_000
}

/// Convert SOL to lamports
///
/// # Arguments
/// * `sol` - Amount in SOL
///
/// # Returns
/// Amount in lamports
pub fn sol_to_lamports(sol: u64) -> u64 {
    sol.saturating_mul(1_000_000_000)
}

// ================================
// ROUNDING UTILITIES
// ================================

/// Round down to nearest multiple
///
/// # Arguments
/// * `value` - Value to round
/// * `multiple` - Multiple to round to
///
/// # Returns
/// Rounded value
pub fn round_down(value: u64, multiple: u64) -> u64 {
    if multiple == 0 {
        return value;
    }
    (value / multiple) * multiple
}

/// Round up to nearest multiple
///
/// # Arguments
/// * `value` - Value to round
/// * `multiple` - Multiple to round to
///
/// # Returns
/// Rounded value
pub fn round_up(value: u64, multiple: u64) -> u64 {
    if multiple == 0 {
        return value;
    }
    ((value + multiple - 1) / multiple) * multiple
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bps() {
        assert_eq!(calculate_bps(1_000_000, 5000), 500_000); // 50%
        assert_eq!(calculate_bps(1_000_000, 2500), 250_000); // 25%
        assert_eq!(calculate_bps(1_000_000, 10_000), 1_000_000); // 100%
        assert_eq!(calculate_bps(1_000_000, 0), 0); // 0%
    }

    #[test]
    fn test_is_valid_bps() {
        assert!(is_valid_bps(0));
        assert!(is_valid_bps(5000));
        assert!(is_valid_bps(10_000));
        assert!(!is_valid_bps(10_001));
        assert!(!is_valid_bps(20_000));
    }

    #[test]
    fn test_validate_bps_sum() {
        assert!(validate_bps_sum_equals_100(&[5000, 3000, 2000])); // 50% + 30% + 20%
        assert!(!validate_bps_sum_equals_100(&[5000, 3000, 1000])); // Only 90%
        assert!(!validate_bps_sum_equals_100(&[6000, 3000, 2000])); // 110%

        assert!(validate_bps_sum_max_100(&[5000, 3000, 2000])); // 100%
        assert!(validate_bps_sum_max_100(&[5000, 3000, 1000])); // 90%
        assert!(!validate_bps_sum_max_100(&[6000, 3000, 2000])); // 110%
    }

    #[test]
    fn test_split_by_bps() {
        let total = 1_000_000;
        let splits = [5000, 3000, 2000]; // 50%, 30%, 20%
        let amounts = split_by_bps(total, &splits);

        // Check that amounts are correct
        assert_eq!(amounts[0], 500_000); // 50%
        assert_eq!(amounts[1], 300_000); // 30%

        // Last amount should get remainder (handles rounding)
        assert_eq!(amounts.iter().sum::<u64>(), total);
    }

    #[test]
    fn test_calculate_remainder() {
        // With clean division, remainder should be 0
        let remainder = calculate_remainder(1_000_000, &[5000, 5000]);
        assert_eq!(remainder, 0);

        // With uneven division, there will be a remainder
        let remainder = calculate_remainder(1_000_000, &[3333, 3333, 3333]);
        assert!(remainder > 0);
    }

    #[test]
    fn test_calculate_percentage_bps() {
        assert_eq!(calculate_percentage_bps(500_000, 1_000_000), 5000); // 50%
        assert_eq!(calculate_percentage_bps(250_000, 1_000_000), 2500); // 25%
        assert_eq!(calculate_percentage_bps(1_000_000, 1_000_000), 10_000); // 100%
        assert_eq!(calculate_percentage_bps(100, 0), 0); // Division by zero
    }

    #[test]
    fn test_remaining_bps() {
        assert_eq!(remaining_bps(&[5000, 3000]), 2000); // 50% + 30% = 20% remaining
        assert_eq!(remaining_bps(&[10_000]), 0); // 100% used
        assert_eq!(remaining_bps(&[]), 10_000); // Nothing used
    }

    #[test]
    fn test_safe_operations() {
        assert_eq!(safe_add(100, 200), Some(300));
        assert_eq!(safe_add(u64::MAX, 1), None); // Overflow

        assert_eq!(safe_sub(200, 100), Some(100));
        assert_eq!(safe_sub(100, 200), None); // Underflow

        assert_eq!(safe_mul(100, 200), Some(20_000));
        assert_eq!(safe_mul(u64::MAX, 2), None); // Overflow

        assert_eq!(safe_div(100, 2), Some(50));
        assert_eq!(safe_div(100, 0), None); // Division by zero
    }

    #[test]
    fn test_sol_conversions() {
        assert_eq!(sol_to_lamports(1), 1_000_000_000);
        assert_eq!(lamports_to_sol_u64(1_000_000_000), 1);
        assert_eq!(lamports_to_sol_u64(500_000_000), 0); // Rounds down
    }

    #[test]
    fn test_rounding() {
        assert_eq!(round_down(105, 10), 100);
        assert_eq!(round_down(100, 10), 100);
        assert_eq!(round_down(99, 10), 90);

        assert_eq!(round_up(105, 10), 110);
        assert_eq!(round_up(100, 10), 100);
        assert_eq!(round_up(99, 10), 100);
    }

    #[test]
    fn test_percentage_conversions() {
        assert_eq!(percentage_to_bps(50), 5000);
        assert_eq!(percentage_to_bps(100), 10_000);
        assert_eq!(percentage_to_bps(1), 100);
    }
}
