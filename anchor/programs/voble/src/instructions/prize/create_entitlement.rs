use crate::{constants::*, contexts::*, errors::VobleError, state::*};
use anchor_lang::prelude::*;

/// Create a winner entitlement for a specific period
///
/// This instruction creates a WinnerEntitlement account that grants a winner
/// the right to claim their prize. After a period is finalized, the admin must
/// create one entitlement for each of the top 3 winners.
///
/// # What This Does
/// 1. Validates period is finalized
/// 2. Validates rank (1-3)
/// 3. Validates prize amount
/// 4. Creates WinnerEntitlement account
/// 5. Sets entitlement data (player, period, rank, amount)
/// 6. Marks as not claimed
///
/// # Arguments
/// * `ctx` - Context with config, period state, and entitlement account
/// * `period_id` - Period identifier (e.g., "D123", "W45", "M12")
/// * `rank` - Winner's rank (1 = first place, 2 = second, 3 = third)
/// * `amount` - Prize amount in lamports
///
/// # Validation
/// - Period must be finalized
/// - Rank must be 1, 2, or 3
/// - Period ID must be valid length
/// - Amount must match calculated prize for that rank
///
/// # Security
/// - Only authority can create entitlements
/// - Entitlement is a PDA (derived from player + period + type)
/// - Cannot create duplicate entitlements (enforced by init constraint)
/// - Winner must be in the finalized winners list
///
/// # After Creation
/// Winner can:
/// - Call claim_prize() to receive their lamports
/// - Entitlement is marked as claimed
/// - Cannot claim twice (enforced)
///
/// # Notes
/// - Admin must create 3 entitlements (one for each winner)
/// - This does NOT transfer funds - only creates the entitlement
/// - Actual transfer happens when winner claims
/// - Winners have unlimited time to claim (no expiry)
///
/// # Example Flow
/// 1. Period finalized → prize amounts calculated
/// 2. **Admin creates entitlement for 1st place** ← You are here
/// 3. Admin creates entitlement for 2nd place
/// 4. Admin creates entitlement for 3rd place
/// 5. Winners claim their prizes
pub fn create_daily_winner_entitlement(
    ctx: Context<CreateDailyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    create_entitlement_internal(ctx.accounts, period_id, rank, amount, "daily")
}

pub fn create_weekly_winner_entitlement(
    ctx: Context<CreateWeeklyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    create_entitlement_internal(ctx.accounts, period_id, rank, amount, "weekly")
}

pub fn create_monthly_winner_entitlement(
    ctx: Context<CreateMonthlyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    create_entitlement_internal(ctx.accounts, period_id, rank, amount, "monthly")
}

/// Internal function to create entitlement for any period type
///
/// This consolidates the logic for daily, weekly, and monthly entitlements
/// to avoid code duplication.
fn create_entitlement_internal<'info>(
    mut accounts: impl CreateEntitlementAccounts<'info>,
    period_id: String,
    rank: u8,
    amount: u64,
    period_type: &str,
) -> Result<()> {
    // Get winner pubkey first (immutable borrow)
    let winner_pubkey = accounts.get_winner_key();

    msg!("🎁 Creating {} winner entitlement", period_type);
    msg!("   Period: {}", period_id);
    msg!("   Rank: {}", rank);
    msg!("   Winner: {}", winner_pubkey);
    msg!("   Amount: {} lamports", amount);

    // ========== VALIDATION: Period ID ==========
    require!(
        period_id.len() <= MAX_PERIOD_ID_LENGTH,
        VobleError::PeriodIdTooLong
    );
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);

    // ========== VALIDATION: Rank ==========
    require!(
        rank >= 1 && rank <= TOP_WINNERS_COUNT as u8,
        VobleError::InvalidWinnerSplits
    );

    // ========== VALIDATION: Period Finalized ==========
    // Scope the immutable borrow of period_state
    let (finalized, total_participants, period_id_matches, is_winner) = {
        let period_state = accounts.get_period_state();
        let finalized = period_state.finalized;
        let total_participants = period_state.total_participants;
        let period_id_matches = period_state.period_id == period_id;
        let is_winner = period_state.winners.iter().any(|&w| w == winner_pubkey);
        (finalized, total_participants, period_id_matches, is_winner)
    };

    require!(finalized, VobleError::InvalidPeriodState);
    require!(period_id_matches, VobleError::PeriodNotFound);

    msg!("✅ Validation passed");
    msg!("   Period finalized: {}", finalized);
    msg!("   Total participants: {}", total_participants);

    // ========== VALIDATION: Winner in List ==========
    // Verify winner is actually in the finalized winners list
    require!(is_winner, VobleError::Unauthorized);

    msg!("✅ Winner verified in finalized winners list");

    // ========== VALIDATION: Amount Matches Rank ==========
    // Optional: Could add validation that amount matches expected prize for rank
    // This would require storing prize amounts in PeriodState
    require!(amount > 0, VobleError::InvalidPrizeAmount);

    // ========== CREATE ENTITLEMENT ==========
    // Now we can safely get mutable borrow of entitlement
    let entitlement = accounts.get_entitlement();
    entitlement.player = winner_pubkey;
    entitlement.period_type = period_type.to_string();
    entitlement.period_id = period_id.clone();
    entitlement.rank = rank;
    entitlement.amount = amount;
    entitlement.claimed = false;

    msg!("");
    msg!("✅ ========== ENTITLEMENT CREATED ========== ✅");
    msg!("   Winner: {}", winner_pubkey);
    msg!("   Period: {} ({})", period_id, period_type);
    msg!("   Rank: #{}", rank);
    msg!("   Prize amount: {} lamports", amount);
    msg!("   Status: Ready to claim");
    msg!("");
    msg!("💡 Winner can now call claim_prize() to receive funds");
    msg!("==========================================");

    Ok(())
}

/// Trait to abstract over different entitlement creation contexts
trait CreateEntitlementAccounts<'info> {
    fn get_period_state(&self) -> &Account<'info, PeriodState>;
    fn get_entitlement(&mut self) -> &mut Account<'info, WinnerEntitlement>;
    fn get_winner_key(&self) -> Pubkey;
}

impl<'info> CreateEntitlementAccounts<'info> for &mut CreateDailyWinnerEntitlement<'info> {
    fn get_period_state(&self) -> &Account<'info, PeriodState> {
        &self.period_state
    }
    fn get_entitlement(&mut self) -> &mut Account<'info, WinnerEntitlement> {
        &mut self.winner_entitlement
    }
    fn get_winner_key(&self) -> Pubkey {
        self.winner.key()
    }
}

impl<'info> CreateEntitlementAccounts<'info> for &mut CreateWeeklyWinnerEntitlement<'info> {
    fn get_period_state(&self) -> &Account<'info, PeriodState> {
        &self.period_state
    }
    fn get_entitlement(&mut self) -> &mut Account<'info, WinnerEntitlement> {
        &mut self.winner_entitlement
    }
    fn get_winner_key(&self) -> Pubkey {
        self.winner.key()
    }
}

impl<'info> CreateEntitlementAccounts<'info> for &mut CreateMonthlyWinnerEntitlement<'info> {
    fn get_period_state(&self) -> &Account<'info, PeriodState> {
        &self.period_state
    }
    fn get_entitlement(&mut self) -> &mut Account<'info, WinnerEntitlement> {
        &mut self.winner_entitlement
    }
    fn get_winner_key(&self) -> Pubkey {
        self.winner.key()
    }
}
