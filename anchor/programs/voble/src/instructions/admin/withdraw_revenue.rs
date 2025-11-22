use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

/// Withdraw platform revenue from the platform vault
///
/// This instruction allows the authority to withdraw accumulated platform revenue.
/// The revenue comes from the platform_revenue_split percentage of each ticket sale.
///
/// # Arguments
/// * `ctx` - The context containing the platform vault and authority
/// * `amount` - Optional amount to withdraw in lamports. If None, withdraws all available funds
///
/// # Validation
/// - Only the authority can call this instruction
/// - Vault must have sufficient balance (minus rent-exempt minimum)
/// - Vault must remain rent-exempt after withdrawal
///
/// # Safety
/// - Uses PDA signer seeds to authorize the transfer
/// - Preserves rent-exempt minimum in the vault
/// - Validates withdrawal amount against available balance
///
/// # Notes
/// If no amount is specified, the function will withdraw all available funds
/// while keeping the vault rent-exempt.
pub fn withdraw_platform_revenue(
    ctx: Context<WithdrawPlatformRevenue>,
    amount: Option<u64>,
) -> Result<()> {
    let vault_balance = ctx.accounts.platform_vault.amount;

    // Calculate maximum withdrawable amount
    // For Token Accounts, we can withdraw everything (no rent exemption needed for balance itself)
    let max_withdrawable = vault_balance;

    // If no amount specified, withdraw all available funds
    let withdraw_amount = amount.unwrap_or(max_withdrawable);

    // ========== VALIDATION ==========
    // Ensure we don't try to withdraw more than available
    require!(
        withdraw_amount <= max_withdrawable,
        VobleError::InsufficientVaultBalance
    );

    msg!("💰 Withdrawal validation passed");
    msg!("   Vault balance: {} USDC", vault_balance);
    msg!("   Requested amount: {} USDC", withdraw_amount);

    // ========== TRANSFER ==========
    // Transfer from platform vault to destination using secure CPI
    let vault_seeds = &[SEED_PLATFORM_VAULT, &[ctx.bumps.platform_vault]];
    let signer_seeds = &[&vault_seeds[..]];

    let decimals = ctx.accounts.usdc_mint.decimals;

    anchor_spl::token_interface::transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::TransferChecked {
                from: ctx.accounts.platform_vault.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
                authority: ctx.accounts.platform_vault.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
            },
            signer_seeds,
        ),
        withdraw_amount,
        decimals,
    )?;

    let remaining_balance = vault_balance - withdraw_amount;

    // ========== EMIT EVENT ==========
    emit!(PlatformRevenueWithdrawn {
        authority: ctx.accounts.authority.key(),
        destination: ctx.accounts.destination.key(),
        amount: withdraw_amount,
        remaining_balance,
    });

    msg!("✅ Platform revenue withdrawn successfully");
    msg!("💸 Amount withdrawn: {} USDC", withdraw_amount);
    msg!("🏦 Remaining vault balance: {} USDC", remaining_balance);
    msg!("📍 Destination: {}", ctx.accounts.destination.key());

    Ok(())
}
