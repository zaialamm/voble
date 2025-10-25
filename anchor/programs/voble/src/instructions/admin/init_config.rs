use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

/// Initialize the global configuration for the Voble game
///
/// This instruction sets up the core game parameters including:
/// - Ticket pricing
/// - Prize distribution splits (daily, weekly, monthly)
/// - Platform revenue split
/// - Winner payout percentages
///
/// # Arguments
/// * `ctx` - The context containing the global config account and authority
/// * `ticket_price` - Price in lamports to play one game
/// * `prize_split_daily` - Basis points (0-10000) for daily prize pool
/// * `prize_split_weekly` - Basis points (0-10000) for weekly prize pool
/// * `prize_split_monthly` - Basis points (0-10000) for monthly prize pool
/// * `platform_revenue_split` - Basis points (0-10000) for platform revenue
/// * `winner_splits` - Vec of 3 basis points for 1st, 2nd, 3rd place winners
///
/// # Validation
/// - Ticket price must be at least MIN_TICKET_PRICE (0.0001 SOL)
/// - All prize splits must add up to exactly 10000 (100%)
/// - Winner splits must be exactly 3 entries (for 1st, 2nd, 3rd place)
/// - Winner splits must add up to exactly 10000 (100%)
pub fn initialize_global_config(
    ctx: Context<InitializeGlobalConfig>,
    ticket_price: u64,
    prize_split_daily: u16,
    prize_split_weekly: u16,
    prize_split_monthly: u16,
    platform_revenue_split: u16,
    winner_splits: Vec<u16>,
) -> Result<()> {
    // ========== VALIDATION: Ticket Price ==========
    // Validate ticket price (minimum 0.0001 SOL = 100,000 lamports)
    require!(
        ticket_price >= MIN_TICKET_PRICE,
        VobleError::InvalidPrizeSplits
    );

    msg!("✅ Ticket price validated: {} lamports", ticket_price);

    // ========== VALIDATION: Prize Splits (Must Add to 100%) ==========
    // All splits must add up to exactly 10000 basis points (100%)
    let total_splits = prize_split_daily as u32
        + prize_split_weekly as u32
        + prize_split_monthly as u32
        + platform_revenue_split as u32;

    require!(
        total_splits == BASIS_POINTS_TOTAL as u32,
        VobleError::InvalidPrizeSplits
    );

    msg!(
        "✅ Prize splits validated: daily={}, weekly={}, monthly={}, platform={}, total={}",
        prize_split_daily,
        prize_split_weekly,
        prize_split_monthly,
        platform_revenue_split,
        total_splits
    );

    // ========== VALIDATION: Winner Splits (Must Add to 100%) ==========
    // Winner splits must be exactly 3 (1st, 2nd, 3rd place)
    require!(
        winner_splits.len() == TOP_WINNERS_COUNT,
        VobleError::InvalidWinnerCount
    );

    // Winner splits must add up to exactly 10000 basis points (100%)
    let winner_total: u32 = winner_splits.iter().map(|&s| s as u32).sum();

    require!(
        winner_total == BASIS_POINTS_TOTAL as u32,
        VobleError::InvalidWinnerSplits
    );

    msg!(
        "✅ Winner splits validated: 1st={}, 2nd={}, 3rd={}, total={}",
        winner_splits[0],
        winner_splits[1],
        winner_splits[2],
        winner_total
    );

    // ========== INITIALIZE CONFIG ==========
    let config = &mut ctx.accounts.global_config;
    config.authority = ctx.accounts.authority.key();
    config.ticket_price = ticket_price;
    config.prize_split_daily = prize_split_daily;
    config.prize_split_weekly = prize_split_weekly;
    config.prize_split_monthly = prize_split_monthly;
    config.platform_revenue_split = platform_revenue_split;
    config.winner_splits = winner_splits;
    config.paused = false;

    // ========== EMIT EVENT ==========
    emit!(GlobalConfigInitialized {
        authority: config.authority,
        ticket_price: config.ticket_price,
    });

    msg!("🎮 Global config initialized successfully");
    msg!("📍 Authority: {}", config.authority);
    msg!("💰 Ticket price: {} lamports", config.ticket_price);

    Ok(())
}
