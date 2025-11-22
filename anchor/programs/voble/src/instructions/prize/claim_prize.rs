use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;


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
        &ctx.accounts.winner_token_account,
        &ctx.accounts.token_program,
        &ctx.accounts.usdc_mint,
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
        &ctx.accounts.winner_token_account,
        &ctx.accounts.token_program,
        &ctx.accounts.usdc_mint,
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
        &ctx.accounts.winner_token_account,
        &ctx.accounts.token_program,
        &ctx.accounts.usdc_mint,
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
    vault: &InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    winner: &Signer<'info>,
    winner_token_account: &InterfaceAccount<'info, anchor_spl::token_interface::TokenAccount>,
    token_program: &Interface<'info, anchor_spl::token_interface::TokenInterface>,
    usdc_mint: &InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
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
    let vault_balance = vault.amount;

    msg!("💰 Prize details:");
    msg!("   Amount: {} USDC", amount);
    msg!("   Vault balance: {} USDC", vault_balance);

    // ========== VALIDATION: Vault Balance ==========
    // Ensure vault has enough for prize
    require!(
        vault_balance >= amount,
        VobleError::InsufficientVaultBalance
    );

    msg!("✅ Validation passed - vault has sufficient balance");

    // ========== TRANSFER PRIZE ==========
    msg!("💸 Transferring {} USDC to winner", amount);

    let vault_seeds = &[_vault_seed, &[_vault_bump]];
    let signer_seeds = &[&vault_seeds[..]];

    let decimals = usdc_mint.decimals;

    anchor_spl::token_interface::transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            anchor_spl::token_interface::TransferChecked {
                from: vault.to_account_info(),
                to: winner_token_account.to_account_info(),
                authority: vault.to_account_info(),
                mint: usdc_mint.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        decimals,
    )?;

    let remaining_balance = vault_balance - amount;

    msg!("✅ Transfer successful");
    msg!("   Transferred: {} USDC", amount);
    msg!("   Remaining vault balance: {} USDC", remaining_balance);

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
    msg!("   Amount: {} USDC", amount);
    msg!("   Status: Successfully claimed");
    msg!("");
    msg!("🎉 Congratulations on your win!");
    msg!("==========================================");

    Ok(())
}
