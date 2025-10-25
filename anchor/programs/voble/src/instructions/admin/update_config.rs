use crate::{constants::*, contexts::*, errors::VobleError};
use anchor_lang::prelude::*;

/// Update the global configuration settings
///
/// This instruction allows the authority to modify game settings:
/// - Ticket price
/// - Game pause state
///
/// # Arguments
/// * `ctx` - The context containing the global config account and authority
/// * `ticket_price` - Optional new ticket price in lamports
/// * `paused` - Optional new pause state (true = game paused, false = active)
///
/// # Validation
/// - Only the authority can call this instruction
/// - If ticket_price is provided, it must be >= MIN_TICKET_PRICE
///
/// # Notes
/// This is a flexible update function that allows updating individual fields
/// without requiring all fields to be passed.
pub fn set_config(
    ctx: Context<SetConfig>,
    ticket_price: Option<u64>,
    paused: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    let mut updated_fields = Vec::new();

    // Update ticket price if provided
    if let Some(price) = ticket_price {
        require!(price >= MIN_TICKET_PRICE, VobleError::InvalidPrizeSplits);

        let old_price = config.ticket_price;
        config.ticket_price = price;

        msg!(
            "💰 Ticket price updated: {} -> {} lamports",
            old_price,
            price
        );
        updated_fields.push("ticket_price");
    }

    // Update pause state if provided
    if let Some(pause_state) = paused {
        let old_state = config.paused;
        config.paused = pause_state;

        msg!("⏸️  Pause state updated: {} -> {}", old_state, pause_state);
        updated_fields.push("paused");
    }

    // Log summary
    if updated_fields.is_empty() {
        msg!("ℹ️  No fields updated (no changes provided)");
    } else {
        msg!(
            "✅ Config updated successfully. Fields changed: {:?}",
            updated_fields
        );
    }

    Ok(())
}
