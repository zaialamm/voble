use anchor_lang::prelude::*;

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

impl PeriodIds {
    // Period durations in seconds
    pub const DAILY_DURATION: i64 = 7 * 60; // 7 minutes
    pub const WEEKLY_DURATION: i64 = 12 * 60; // 12 minutes  
    pub const MONTHLY_DURATION: i64 = 15 * 60; // 15 minutes

    // Epoch start timestamp (can be adjusted for deployment)
    pub const EPOCH_START: i64 = 1700000000; // November 14, 2023 (adjust as needed)

    pub fn from_timestamp(timestamp: i64) -> Self {
        let elapsed_since_epoch = timestamp - Self::EPOCH_START;
        
        // Calculate period numbers based on duration intervals
        let daily_period = elapsed_since_epoch / Self::DAILY_DURATION;
        let weekly_period = elapsed_since_epoch / Self::WEEKLY_DURATION;
        let monthly_period = elapsed_since_epoch / Self::MONTHLY_DURATION;
        
        // Generate period IDs
        let day_id = format!("D{}", daily_period);
        let week_id = format!("W{}", weekly_period);
        let month_id = format!("M{}", monthly_period);
        
        Self {
            day_id,
            week_id,
            month_id,
        }
    }

    // Helper function to get current period ID for a specific type
    pub fn get_current_period_id(period_type: &str, timestamp: i64) -> String {
        let elapsed_since_epoch = timestamp - Self::EPOCH_START;
        
        match period_type {
            "daily" => {
                let period_num = elapsed_since_epoch / Self::DAILY_DURATION;
                format!("D{}", period_num)
            },
            "weekly" => {
                let period_num = elapsed_since_epoch / Self::WEEKLY_DURATION;
                format!("W{}", period_num)
            },
            "monthly" => {
                let period_num = elapsed_since_epoch / Self::MONTHLY_DURATION;
                format!("M{}", period_num)
            },
            _ => {
                // Default to daily if invalid type provided
                let period_num = elapsed_since_epoch / Self::DAILY_DURATION;
                format!("D{}", period_num)
            }
        }
    }

    // Helper function to get period start timestamp
    pub fn get_period_start_timestamp(period_id: &str) -> i64 {
        if let Some(period_num_str) = period_id.strip_prefix('D') {
            if let Ok(period_num) = period_num_str.parse::<i64>() {
                return Self::EPOCH_START + (period_num * Self::DAILY_DURATION);
            }
        } else if let Some(period_num_str) = period_id.strip_prefix('W') {
            if let Ok(period_num) = period_num_str.parse::<i64>() {
                return Self::EPOCH_START + (period_num * Self::WEEKLY_DURATION);
            }
        } else if let Some(period_num_str) = period_id.strip_prefix('M') {
            if let Ok(period_num) = period_num_str.parse::<i64>() {
                return Self::EPOCH_START + (period_num * Self::MONTHLY_DURATION);
            }
        }
        
        // Fallback to current timestamp if parsing fails
        Self::EPOCH_START
    }

    // Helper function to get period end timestamp
    pub fn get_period_end_timestamp(period_id: &str) -> i64 {
        let start_timestamp = Self::get_period_start_timestamp(period_id);
        
        if period_id.starts_with('D') {
            start_timestamp + Self::DAILY_DURATION
        } else if period_id.starts_with('W') {
            start_timestamp + Self::WEEKLY_DURATION
        } else if period_id.starts_with('M') {
            start_timestamp + Self::MONTHLY_DURATION
        } else {
            start_timestamp + Self::DAILY_DURATION // Default fallback
        }
    }
}

// Utility function to get current period ID for daily periods
pub fn get_utc8_date(timestamp: i64) -> String {
    // Return the daily period ID for consistency with new system
    PeriodIds::get_current_period_id("daily", timestamp)
}
