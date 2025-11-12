use crate::{contexts::*, events::*};
use anchor_lang::prelude::*;

/// Initialize all prize vaults for the Voble game
///
/// This instruction creates the four main vault PDAs:
/// - Daily prize vault
/// - Weekly prize vault
/// - Monthly prize vault
/// - Platform revenue vault
/// - Lucky draw vault

/// # Arguments
/// * `ctx` - The context containing all vault accounts and authority
///
/// # Validation
/// - Only the authority can call this instruction
/// - Vaults must not already exist (enforced by init constraint)
///
/// # Notes
/// The vaults are created as empty PDAs with minimal space (8 bytes).
/// They will accumulate SOL as players purchase tickets.
/// The init constraint automatically handles:
/// - PDA derivation and verification
/// - Account creation and rent payment
/// - Setting proper ownership
pub fn initialize_vaults(ctx: Context<InitializeVaults>) -> Result<()> {
    // Vaults are automatically created by the init constraint in the context
    // No additional logic needed - just emit an event for confirmation

    let daily_vault_key = ctx.accounts.daily_prize_vault.key();
    let weekly_vault_key = ctx.accounts.weekly_prize_vault.key();
    let monthly_vault_key = ctx.accounts.monthly_prize_vault.key();
    let platform_vault_key = ctx.accounts.platform_vault.key();
    let lucky_draw_vault_key = ctx.accounts.lucky_draw_vault.key();
    let authority_key = ctx.accounts.authority.key();

    // Emit event for tracking and confirmation
    emit!(VaultsInitialized {
        daily_vault: daily_vault_key,
        weekly_vault: weekly_vault_key,
        monthly_vault: monthly_vault_key,
        platform_vault: platform_vault_key,
        lucky_draw_vault: lucky_draw_vault_key,
        authority: authority_key,
    });

    msg!("🏦 All prize vaults initialized successfully");
    msg!("📍 Daily vault: {}", daily_vault_key);
    msg!("📍 Weekly vault: {}", weekly_vault_key);
    msg!("📍 Monthly vault: {}", monthly_vault_key);
    msg!("📍 Platform vault: {}", platform_vault_key);
    msg!("📍 Lucky draw vault: {}", lucky_draw_vault_key);
    msg!("👤 Authority: {}", authority_key);
    msg!("✅ Vaults are ready to receive ticket payments");

    Ok(())
}
