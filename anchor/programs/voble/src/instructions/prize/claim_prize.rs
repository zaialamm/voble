use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;
use anchor_lang::system_program;

/// Claim a prize for a finalized period
///
/// This instruction allows a winner to claim their prize after:
/// 1. Period has been finalized
/// 2. Admin has created their winner entitlement
///
/// # What This Does
/// 1. Validates entitlement exists and not claimed
/// 2. Validates vault has sufficient balance
/// 3. Transfers prize from vault to winner
/// 4. Marks entitlement as claimed
/// 5. Emits PrizeClaimed event
///
/// # Arguments
/// * `ctx` - Context with entitlement, vault, and winner accounts
///
/// # Validation
/// - Entitlement must not be claimed already
/// - Vault must have sufficient balance (prize amount + rent)
/// - Only the winner can claim (enforced by PDA seeds)
///
/// # Security
/// - Uses PDA signer seeds for vault transfer
/// - Preserves rent-exempt minimum in vault
/// - Idempotent (cannot claim twice)
/// - Winner verified via PDA derivation
///
/// # Vault Management
/// The function ensures the vault remains rent-exempt after the transfer:
/// - Calculates minimum rent-exempt balance
/// - Ensures vault has: prize_amount + rent_minimum
/// - Transfers only the prize amount
/// - Vault stays healthy for future periods
///
/// # Notes
/// - Winner receives lamports directly to their account
/// - Entitlement account is NOT closed (kept for record)
/// - No time limit on claiming (winners can claim anytime)
/// - Gas fees paid by winner (normal transaction cost)
///
/// # Example Flow
/// 1. Period finalized → prizes calculated
/// 2. Admin creates entitlements
/// 3. **Winner calls this instruction** ← You are here
/// 4. Winner receives lamports
/// 5. Entitlement marked as claimed
pub fn claim_daily(ctx: Context<ClaimDaily>) -> Result<()> {
    claim_prize_internal(
        &mut ctx.accounts.winner_entitlement,
        &ctx.accounts.daily_prize_vault,
        &ctx.accounts.winner,
        &ctx.accounts.system_program,
        ctx.bumps.daily_prize_vault,
        SEED_DAILY_PRIZE_VAULT,
        "daily",
    )
}

pub fn claim_weekly(ctx: Context<ClaimWeekly>) -> Result<()> {
    claim_prize_internal(
        &mut ctx.accounts.winner_entitlement,
        &ctx.accounts.weekly_prize_vault,
        &ctx.accounts.winner,
        &ctx.accounts.system_program,
        ctx.bumps.weekly_prize_vault,
        SEED_WEEKLY_PRIZE_VAULT,
        "weekly",
    )
}

pub fn claim_monthly(ctx: Context<ClaimMonthly>) -> Result<()> {
    claim_prize_internal(
        &mut ctx.accounts.winner_entitlement,
        &ctx.accounts.monthly_prize_vault,
        &ctx.accounts.winner,
        &ctx.accounts.system_program,
        ctx.bumps.monthly_prize_vault,
        SEED_MONTHLY_PRIZE_VAULT,
        "monthly",
    )
}

/// Internal function to claim prize for any period type
///
/// This consolidates the logic for daily, weekly, and monthly prize claims
/// to avoid code duplication. The only differences are the vault account,
/// vault seeds, and period type.
fn claim_prize_internal<'info>(
    entitlement: &mut Account<'info, crate::state::WinnerEntitlement>,
    vault: &AccountInfo<'info>,
    winner: &Signer<'info>,
    _system_program: &Program<'info, System>,
    _vault_bump: u8,
    _vault_seed: &[u8],
    period_type: &str,
) -> Result<()> {
    msg!("🎁 Claiming {} prize", period_type);
    msg!("   Winner: {}", winner.key());
    msg!("   Period: {}", entitlement.period_id);
    msg!("   Rank: #{}", entitlement.rank);

    // ========== VALIDATION: Not Already Claimed ==========
    require!(!entitlement.claimed, VobleError::AlreadyClaimed);

    let amount = entitlement.amount;
    let vault_balance = vault.lamports();

    msg!("💰 Prize details:");
    msg!("   Amount: {} lamports", amount);
    msg!("   Vault balance: {} lamports", vault_balance);

    // ========== VALIDATION: Vault Balance ==========
    // Get rent-exempt minimum for the vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(vault.data_len());

    msg!("   Rent-exempt minimum: {} lamports", min_balance);

    // Ensure vault has enough for prize + rent
    require!(
        vault_balance >= amount + min_balance,
        VobleError::InsufficientVaultBalance
    );

    msg!("✅ Validation passed - vault has sufficient balance");

    // ========== TRANSFER PRIZE ==========
    msg!("💸 Transferring {} lamports to winner", amount);

    {
        let mut vault_lamports = vault.try_borrow_mut_lamports()?;
        let mut winner_info = winner.to_account_info();
        let mut winner_lamports = winner_info.try_borrow_mut_lamports()?;

        // Subtract from vault, ensuring we don't underflow
        **vault_lamports = vault_lamports
            .checked_sub(amount)
            .ok_or(VobleError::InsufficientVaultBalance)?;

        // Add to winner, ensuring we don't overflow
        **winner_lamports = winner_lamports
            .checked_add(amount)
            .ok_or(VobleError::InvalidPrizeAmount)?;
    }

    let remaining_balance = vault_balance - amount;

    msg!("✅ Transfer successful");
    msg!("   Transferred: {} lamports", amount);
    msg!("   Remaining vault balance: {} lamports", remaining_balance);

    // ========== MARK AS CLAIMED ==========
    entitlement.claimed = true;

    msg!("✅ Entitlement marked as claimed");

    // ========== EMIT EVENT ==========
    emit!(PrizeClaimed {
        winner: winner.key(),
        period_type: period_type.to_string(),
        period_id: entitlement.period_id.clone(),
        rank: entitlement.rank,
        amount,
    });

    // ========== FINAL LOGGING ==========
    msg!("");
    msg!("✅ ========== PRIZE CLAIMED ========== ✅");
    msg!("   Winner: {}", winner.key());
    msg!("   Period: {} ({})", entitlement.period_id, period_type);
    msg!("   Rank: #{}", entitlement.rank);
    msg!("   Amount: {} lamports", amount);
    msg!("   Status: Successfully claimed");
    msg!("");
    msg!("🎉 Congratulations on your win!");
    msg!("==========================================");

    Ok(())
}
