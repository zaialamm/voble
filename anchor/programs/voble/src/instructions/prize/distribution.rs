use crate::constants::*;
use crate::errors::VobleError;
use anchor_lang::prelude::*;

/// Payment accounts for ticket distribution
pub struct PaymentAccounts<'a, 'info> {
    pub player: &'a AccountInfo<'info>,
    pub vault_daily: &'a AccountInfo<'info>,
    pub vault_weekly: &'a AccountInfo<'info>,
    pub vault_monthly: &'a AccountInfo<'info>,
    pub vault_platform: &'a AccountInfo<'info>,
    pub system_program: &'a AccountInfo<'info>,
}

/// Prize split amounts for winners
pub struct PrizeSplit {
    pub first_place: u64,
    pub second_place: u64,
    pub third_place: u64,
}

/// Calculate prize splits for winners based on vault balance
///
/// This function calculates how much each of the top 3 winners should receive
/// based on the current vault balance and the configured winner split percentages.
///
/// # Arguments
/// * `vault_balance` - Total lamports in the prize vault
/// * `winner_splits` - Array of 3 percentages in basis points [1st, 2nd, 3rd]
///
/// # Returns
/// `PrizeSplit` struct with exact amounts for each winner
///
/// # Important: Remainder Handling
/// Due to integer division, there may be a small remainder after calculating
/// all three splits. This remainder is added to the first place prize to ensure
/// ALL lamports are distributed (no lamports left behind).
///
/// # Example
/// ```
/// let vault_balance = 1_000_000; // 1 SOL
/// let winner_splits = [5000, 3000, 2000]; // 50%, 30%, 20%
/// let splits = calculate_prize_splits(vault_balance, &winner_splits);
///
/// // First place: 500,000 + remainder
/// // Second place: 300,000
/// // Third place: 200,000
/// // Total: exactly 1,000,000 (no lamports lost)
/// ```
pub fn calculate_prize_splits(vault_balance: u64, winner_splits: &[u16; 3]) -> PrizeSplit {
    // Calculate base amounts using basis points
    let first_amount = (vault_balance * winner_splits[0] as u64) / BASIS_POINTS_TOTAL as u64;
    let second_amount = (vault_balance * winner_splits[1] as u64) / BASIS_POINTS_TOTAL as u64;
    let third_amount = (vault_balance * winner_splits[2] as u64) / BASIS_POINTS_TOTAL as u64;

    // Calculate remainder and add to first place (prevents lamport loss)
    let total_distributed = first_amount + second_amount + third_amount;
    let remainder = vault_balance.saturating_sub(total_distributed);

    PrizeSplit {
        first_place: first_amount + remainder,
        second_place: second_amount,
        third_place: third_amount,
    }
}

/// Validate that prize splits add up exactly to vault balance
///
/// This is a critical validation to ensure no lamports are lost or created
/// during prize distribution.
///
/// # Arguments
/// * `vault_balance` - Total vault balance
/// * `splits` - Calculated prize splits
///
/// # Returns
/// `Ok(())` if validation passes, `Err` otherwise
pub fn validate_prize_splits(vault_balance: u64, splits: &PrizeSplit) -> Result<()> {
    let total = splits.first_place + splits.second_place + splits.third_place;

    require!(total == vault_balance, VobleError::InvalidPrizeAmount);

    Ok(())
}

/// Calculate ticket payment distribution
///
/// Splits the ticket price across all prize pools and platform revenue
/// according to the configured percentages.
///
/// # Arguments
/// * `ticket_price` - Total ticket price in lamports
/// * `daily_split` - Daily pool percentage in basis points
/// * `weekly_split` - Weekly pool percentage in basis points
/// * `monthly_split` - Monthly pool percentage in basis points
/// * `platform_split` - Platform revenue percentage in basis points
///
/// # Returns
/// Tuple of (daily_amount, weekly_amount, monthly_amount, platform_amount)
pub fn calculate_ticket_distribution(
    ticket_price: u64,
    daily_split: u16,
    weekly_split: u16,
    monthly_split: u16,
    platform_split: u16,
) -> (u64, u64, u64, u64) {
    let daily = (ticket_price * daily_split as u64) / BASIS_POINTS_TOTAL as u64;
    let weekly = (ticket_price * weekly_split as u64) / BASIS_POINTS_TOTAL as u64;
    let monthly = (ticket_price * monthly_split as u64) / BASIS_POINTS_TOTAL as u64;
    let platform = (ticket_price * platform_split as u64) / BASIS_POINTS_TOTAL as u64;

    (daily, weekly, monthly, platform)
}

/// Validate ticket distribution adds up to ticket price
///
/// # Arguments
/// * `ticket_price` - Total ticket price
/// * `amounts` - Tuple of (daily, weekly, monthly, platform) amounts
///
/// # Returns
/// `Ok(())` if validation passes, `Err` otherwise
pub fn validate_ticket_distribution(
    ticket_price: u64,
    amounts: (u64, u64, u64, u64),
) -> Result<()> {
    let (daily, weekly, monthly, platform) = amounts;
    let total = daily + weekly + monthly + platform;

    require!(total == ticket_price, VobleError::InvalidPrizeSplits);

    Ok(())
}

/// Get the appropriate vault seed based on period type
///
/// # Arguments
/// * `period_type` - The period type ("daily", "weekly", or "monthly")
///
/// # Returns
/// The corresponding vault seed bytes
pub fn get_vault_seed_for_period(period_type: &str) -> &'static [u8] {
    match period_type {
        "daily" => SEED_DAILY_PRIZE_VAULT,
        "weekly" => SEED_WEEKLY_PRIZE_VAULT,
        "monthly" => SEED_MONTHLY_PRIZE_VAULT,
        _ => SEED_DAILY_PRIZE_VAULT, // Default fallback
    }
}

/// Get the appropriate period seed based on period type
///
/// # Arguments
/// * `period_type` - The period type ("daily", "weekly", or "monthly")
///
/// # Returns
/// The corresponding period seed bytes
pub fn get_period_seed_for_type(period_type: &str) -> &'static [u8] {
    match period_type {
        "daily" => SEED_DAILY_PERIOD,
        "weekly" => SEED_WEEKLY_PERIOD,
        "monthly" => SEED_MONTHLY_PERIOD,
        _ => SEED_DAILY_PERIOD, // Default fallback
    }
}

/// Calculate the minimum vault balance needed to pay out prizes
///
/// # Arguments
/// * `vault_account` - The vault account info
/// * `prize_amount` - Amount to pay out
///
/// # Returns
/// `Ok(())` if vault has sufficient balance, `Err` otherwise
pub fn validate_vault_balance(vault_account: &AccountInfo, prize_amount: u64) -> Result<()> {
    let vault_balance = vault_account.lamports();
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(vault_account.data_len());

    // Ensure vault has enough for prize + rent
    require!(
        vault_balance >= prize_amount + min_balance,
        VobleError::InsufficientVaultBalance
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_prize_splits() {
        let vault_balance = 1_000_000;
        let winner_splits = [5000, 3000, 2000]; // 50%, 30%, 20%

        let splits = calculate_prize_splits(vault_balance, &winner_splits);

        // Check individual amounts
        assert!(splits.first_place >= 500_000); // At least 50%
        assert!(splits.second_place == 300_000); // Exactly 30%
        assert!(splits.third_place == 200_000); // Exactly 20%

        // Check total adds up exactly
        let total = splits.first_place + splits.second_place + splits.third_place;
        assert_eq!(total, vault_balance);
    }

    #[test]
    fn test_calculate_prize_splits_with_remainder() {
        let vault_balance = 999_999; // Odd number that creates remainder
        let winner_splits = [5000, 3000, 2000];

        let splits = calculate_prize_splits(vault_balance, &winner_splits);

        // Total should still equal vault balance exactly
        let total = splits.first_place + splits.second_place + splits.third_place;
        assert_eq!(total, vault_balance);
    }

    #[test]
    fn test_validate_prize_splits() {
        let vault_balance = 1_000_000;
        let splits = PrizeSplit {
            first_place: 500_000,
            second_place: 300_000,
            third_place: 200_000,
        };

        assert!(validate_prize_splits(vault_balance, &splits).is_ok());
    }

    #[test]
    fn test_calculate_ticket_distribution() {
        let ticket_price = 1_000_000;
        let (daily, weekly, monthly, platform) =
            calculate_ticket_distribution(ticket_price, 4000, 3000, 2000, 1000);

        assert_eq!(daily, 400_000); // 40%
        assert_eq!(weekly, 300_000); // 30%
        assert_eq!(monthly, 200_000); // 20%
        assert_eq!(platform, 100_000); // 10%
    }

    #[test]
    fn test_validate_ticket_distribution() {
        let ticket_price = 1_000_000;
        let amounts = (400_000, 300_000, 200_000, 100_000);

        assert!(validate_ticket_distribution(ticket_price, amounts).is_ok());
    }

    #[test]
    fn test_get_vault_seed_for_period() {
        assert_eq!(get_vault_seed_for_period("daily"), SEED_DAILY_PRIZE_VAULT);
        assert_eq!(get_vault_seed_for_period("weekly"), SEED_WEEKLY_PRIZE_VAULT);
        assert_eq!(
            get_vault_seed_for_period("monthly"),
            SEED_MONTHLY_PRIZE_VAULT
        );
        assert_eq!(get_vault_seed_for_period("invalid"), SEED_DAILY_PRIZE_VAULT);
        // Default
    }
}
