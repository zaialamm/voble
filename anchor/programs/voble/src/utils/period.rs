//! Period Calculation and Validation Utilities
//!
//! This module provides utilities for working with game periods (daily, weekly, monthly).
//! Periods are time-based cycles used for leaderboards and prize distribution.
//!
//! # Period ID Format
//! - Daily: "D{day_number}" (e.g., "D123" for day 123 since epoch)
//! - Weekly: "W{week_number}" (e.g., "W45" for week 45)
//! - Monthly: "M{month_number}" (e.g., "M12" for month 12)
//!
//! # Use Cases
//! - Calculate current period ID
//! - Validate period IDs
//! - Convert timestamps to period IDs
//! - Determine if a period has ended

use crate::constants::*;

/// Period types supported by the game
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PeriodType {
    Daily,
    Weekly,
    Monthly,
}

impl PeriodType {
    /// Convert string to PeriodType
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "daily" => Some(PeriodType::Daily),
            "weekly" => Some(PeriodType::Weekly),
            "monthly" => Some(PeriodType::Monthly),
            _ => None,
        }
    }

    /// Convert PeriodType to string
    pub fn as_str(&self) -> &str {
        match self {
            PeriodType::Daily => "daily",
            PeriodType::Weekly => "weekly",
            PeriodType::Monthly => "monthly",
        }
    }

    /// Get the prefix character for period IDs
    pub fn prefix(&self) -> char {
        match self {
            PeriodType::Daily => 'D',
            PeriodType::Weekly => 'W',
            PeriodType::Monthly => 'M',
        }
    }
}

// Note: Period duration constants are imported from constants.rs
// - PERIOD_DAILY_DURATION (7 minutes for testing)
// - PERIOD_WEEKLY_DURATION (12 minutes for testing)
// - PERIOD_MONTHLY_DURATION (15 minutes for testing)
// - PERIOD_EPOCH_START (November 14, 2023)

/// Calculate the current period ID based on current timestamp
///
/// # Arguments
/// * `period_type` - The type of period (daily, weekly, monthly)
/// * `current_timestamp` - Current Unix timestamp
///
/// # Returns
/// Period ID string (e.g., "D123", "W45", "M12")
///
/// # Example
/// ```
/// let period_id = get_current_period_id(PeriodType::Daily, Clock::get()?.unix_timestamp);
/// // Returns something like "D123"
/// ```
pub fn get_current_period_id(period_type: PeriodType, current_timestamp: i64) -> String {
    let period_number = calculate_period_number(period_type, current_timestamp);
    format!("{}{}", period_type.prefix(), period_number)
}

/// Calculate the period number for a given timestamp
///
/// # Arguments
/// * `period_type` - The type of period
/// * `timestamp` - Unix timestamp
///
/// # Returns
/// The period number (e.g., 123 for day 123 since epoch)
pub fn calculate_period_number(period_type: PeriodType, timestamp: i64) -> i64 {
    let elapsed_seconds = timestamp.saturating_sub(PERIOD_EPOCH_START);

    match period_type {
        PeriodType::Daily => elapsed_seconds / PERIOD_DAILY_DURATION,
        PeriodType::Weekly => elapsed_seconds / PERIOD_WEEKLY_DURATION,
        PeriodType::Monthly => elapsed_seconds / PERIOD_MONTHLY_DURATION,
    }
}

/// Validate a period ID format
///
/// # Arguments
/// * `period_id` - The period ID string to validate
///
/// # Returns
/// `true` if valid format, `false` otherwise
///
/// # Valid Formats
/// - "D123" (daily)
/// - "W45" (weekly)
/// - "M12" (monthly)
///
/// # Example
/// ```
/// assert!(validate_period_id("D123"));
/// assert!(validate_period_id("W45"));
/// assert!(!validate_period_id("X999")); // Invalid prefix
/// assert!(!validate_period_id("D")); // Missing number
/// ```
pub fn validate_period_id(period_id: &str) -> bool {
    if period_id.is_empty() || period_id.len() < 2 {
        return false;
    }

    let prefix = period_id.chars().next().unwrap();
    let number_part = &period_id[1..];

    // Check if prefix is valid
    let valid_prefix = matches!(prefix, 'D' | 'W' | 'M');

    // Check if number part is a valid positive integer
    let valid_number = number_part.parse::<u64>().is_ok();

    valid_prefix && valid_number
}

/// Parse period ID and extract type and number
///
/// # Arguments
/// * `period_id` - The period ID string (e.g., "D123")
///
/// # Returns
/// `Some((PeriodType, u64))` if valid, `None` otherwise
///
/// # Example
/// ```
/// let (period_type, number) = parse_period_id("D123").unwrap();
/// assert_eq!(period_type, PeriodType::Daily);
/// assert_eq!(number, 123);
/// ```
pub fn parse_period_id(period_id: &str) -> Option<(PeriodType, u64)> {
    if !validate_period_id(period_id) {
        return None;
    }

    let prefix = period_id.chars().next().unwrap();
    let number = period_id[1..].parse::<u64>().ok()?;

    let period_type = match prefix {
        'D' => PeriodType::Daily,
        'W' => PeriodType::Weekly,
        'M' => PeriodType::Monthly,
        _ => return None,
    };

    Some((period_type, number))
}

/// Check if a period has ended
///
/// # Arguments
/// * `period_id` - The period ID to check
/// * `current_timestamp` - Current Unix timestamp
///
/// # Returns
/// `true` if the period has ended, `false` if still active
///
/// # Example
/// ```
/// if has_period_ended("D122", Clock::get()?.unix_timestamp) {
///     msg!("Period D122 has ended");
/// }
/// ```
pub fn has_period_ended(period_id: &str, current_timestamp: i64) -> bool {
    if let Some((period_type, period_number)) = parse_period_id(period_id) {
        let current_period_number = calculate_period_number(period_type, current_timestamp);
        current_period_number > period_number as i64
    } else {
        false
    }
}

/// Get the start timestamp for a specific period
///
/// # Arguments
/// * `period_id` - The period ID
///
/// # Returns
/// Unix timestamp when the period started
pub fn get_period_start_timestamp(period_id: &str) -> Option<i64> {
    let (period_type, period_number) = parse_period_id(period_id)?;

    let seconds_offset = match period_type {
        PeriodType::Daily => period_number as i64 * PERIOD_DAILY_DURATION,
        PeriodType::Weekly => period_number as i64 * PERIOD_WEEKLY_DURATION,
        PeriodType::Monthly => period_number as i64 * PERIOD_MONTHLY_DURATION,
    };

    Some(PERIOD_EPOCH_START + seconds_offset)
}

/// Get the end timestamp for a specific period
///
/// # Arguments
/// * `period_id` - The period ID
///
/// # Returns
/// Unix timestamp when the period ends
pub fn get_period_end_timestamp(period_id: &str) -> Option<i64> {
    let (period_type, _period_number) = parse_period_id(period_id)?;

    let duration = match period_type {
        PeriodType::Daily => PERIOD_DAILY_DURATION,
        PeriodType::Weekly => PERIOD_WEEKLY_DURATION,
        PeriodType::Monthly => PERIOD_MONTHLY_DURATION,
    };

    let start = get_period_start_timestamp(period_id)?;
    Some(start + duration)
}

/// Check if a timestamp falls within a specific period
///
/// # Arguments
/// * `period_id` - The period ID
/// * `timestamp` - Unix timestamp to check
///
/// # Returns
/// `true` if timestamp is within the period, `false` otherwise
pub fn is_timestamp_in_period(period_id: &str, timestamp: i64) -> bool {
    if let (Some(start), Some(end)) = (
        get_period_start_timestamp(period_id),
        get_period_end_timestamp(period_id),
    ) {
        timestamp >= start && timestamp < end
    } else {
        false
    }
}

/// Get the previous period ID
///
/// # Arguments
/// * `period_id` - Current period ID
///
/// # Returns
/// Previous period ID, or `None` if at period 0
pub fn get_previous_period_id(period_id: &str) -> Option<String> {
    let (period_type, period_number) = parse_period_id(period_id)?;

    if period_number == 0 {
        return None;
    }

    Some(format!("{}{}", period_type.prefix(), period_number - 1))
}

/// Get the next period ID
///
/// # Arguments
/// * `period_id` - Current period ID
///
/// # Returns
/// Next period ID
pub fn get_next_period_id(period_id: &str) -> Option<String> {
    let (period_type, period_number) = parse_period_id(period_id)?;
    Some(format!("{}{}", period_type.prefix(), period_number + 1))
}

/// Calculate time remaining in current period (in seconds)
///
/// # Arguments
/// * `period_type` - The type of period
/// * `current_timestamp` - Current Unix timestamp
///
/// # Returns
/// Seconds remaining in the current period
pub fn get_time_remaining_in_period(period_type: PeriodType, current_timestamp: i64) -> i64 {
    let current_period_id = get_current_period_id(period_type, current_timestamp);
    let period_end = get_period_end_timestamp(&current_period_id).unwrap_or(0);
    (period_end - current_timestamp).max(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_period_id() {
        assert!(validate_period_id("D123"));
        assert!(validate_period_id("W45"));
        assert!(validate_period_id("M12"));
        assert!(validate_period_id("D0"));

        assert!(!validate_period_id(""));
        assert!(!validate_period_id("D"));
        assert!(!validate_period_id("X123"));
        assert!(!validate_period_id("123"));
        assert!(!validate_period_id("Dabc"));
    }

    #[test]
    fn test_parse_period_id() {
        let (period_type, number) = parse_period_id("D123").unwrap();
        assert_eq!(period_type, PeriodType::Daily);
        assert_eq!(number, 123);

        let (period_type, number) = parse_period_id("W45").unwrap();
        assert_eq!(period_type, PeriodType::Weekly);
        assert_eq!(number, 45);

        assert!(parse_period_id("X999").is_none());
    }

    #[test]
    fn test_period_type_conversions() {
        assert_eq!(PeriodType::from_str("daily"), Some(PeriodType::Daily));
        assert_eq!(PeriodType::from_str("DAILY"), Some(PeriodType::Daily));
        assert_eq!(PeriodType::from_str("weekly"), Some(PeriodType::Weekly));
        assert_eq!(PeriodType::from_str("invalid"), None);

        assert_eq!(PeriodType::Daily.as_str(), "daily");
        assert_eq!(PeriodType::Weekly.prefix(), 'W');
    }

    #[test]
    fn test_get_previous_next_period() {
        assert_eq!(get_previous_period_id("D123"), Some("D122".to_string()));
        assert_eq!(get_previous_period_id("D0"), None);
        assert_eq!(get_next_period_id("D123"), Some("D124".to_string()));
    }

    #[test]
    fn test_calculate_period_number() {
        // Test with epoch time (should be period 0)
        assert_eq!(
            calculate_period_number(PeriodType::Daily, PERIOD_EPOCH_START),
            0
        );

        // Test one period after epoch
        assert_eq!(
            calculate_period_number(
                PeriodType::Daily,
                PERIOD_EPOCH_START + PERIOD_DAILY_DURATION
            ),
            1
        );

        // Test one week period after epoch
        assert_eq!(
            calculate_period_number(
                PeriodType::Weekly,
                PERIOD_EPOCH_START + PERIOD_WEEKLY_DURATION
            ),
            1
        );
    }
}
