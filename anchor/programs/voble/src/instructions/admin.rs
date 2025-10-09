use anchor_lang::prelude::*;
use crate::{contexts::*, events::*};

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
        ticket_price >= 100_000,
        crate::errors::VobleError::InvalidPrizeSplits
    );
    
    // ========== VALIDATION: Prize Splits (Must Add to 100%) ==========
    // All splits must add up to exactly 10000 basis points (100%)
    let total_splits = prize_split_daily as u32
        + prize_split_weekly as u32
        + prize_split_monthly as u32
        + platform_revenue_split as u32;
    
    require!(
        total_splits == 10000,
        crate::errors::VobleError::InvalidPrizeSplits
    );
    
    msg!("✅ Prize splits validated: daily={}, weekly={}, monthly={}, platform={}, total={}",
         prize_split_daily, prize_split_weekly, prize_split_monthly, platform_revenue_split, total_splits);
    
    // ========== VALIDATION: Winner Splits (Must Add to 100%) ==========
    // Winner splits must be exactly 3 (1st, 2nd, 3rd place)
    require!(
        winner_splits.len() == 3,
        crate::errors::VobleError::InvalidWinnerCount
    );
    
    // Winner splits must add up to exactly 10000 basis points (100%)
    let winner_total: u32 = winner_splits.iter()
        .map(|&s| s as u32)
        .sum();
    
    require!(
        winner_total == 10000,
        crate::errors::VobleError::InvalidWinnerSplits
    );
    
    msg!("✅ Winner splits validated: 1st={}, 2nd={}, 3rd={}, total={}",
         winner_splits[0], winner_splits[1], winner_splits[2], winner_total);

    let config = &mut ctx.accounts.global_config;
    config.authority = ctx.accounts.authority.key();
    config.ticket_price = ticket_price;
    config.prize_split_daily = prize_split_daily;
    config.prize_split_weekly = prize_split_weekly;
    config.prize_split_monthly = prize_split_monthly;
    config.platform_revenue_split = platform_revenue_split;
    config.winner_splits = winner_splits;
    config.paused = false;

    emit!(GlobalConfigInitialized {
        authority: config.authority,
        ticket_price: config.ticket_price,
    });

    Ok(())
}

pub fn set_config(
    ctx: Context<SetConfig>,
    ticket_price: Option<u64>,
    paused: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.global_config;
    
    if let Some(price) = ticket_price {
        config.ticket_price = price;
    }
    
    if let Some(pause_state) = paused {
        config.paused = pause_state;
    }

    Ok(())
}

pub fn initialize_vaults(ctx: Context<InitializeVaults>) -> Result<()> {
    // Vaults are automatically created by the init constraint in the context
    // No additional logic needed - just emit an event for confirmation
    
    emit!(VaultsInitialized {
        daily_vault: ctx.accounts.daily_prize_vault.key(),
        weekly_vault: ctx.accounts.weekly_prize_vault.key(),
        monthly_vault: ctx.accounts.monthly_prize_vault.key(),
        platform_vault: ctx.accounts.platform_vault.key(),
        authority: ctx.accounts.authority.key(),
    });

    Ok(())
}

pub fn withdraw_platform_revenue(
    ctx: Context<WithdrawPlatformRevenue>,
    amount: Option<u64>,
) -> Result<()> {
    let vault_balance = ctx.accounts.platform_vault.lamports();
    
    // Get rent-exempt minimum for the vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(ctx.accounts.platform_vault.data_len());
    
    // If no amount specified, withdraw all available funds (minus rent)
    let max_withdrawable = vault_balance.saturating_sub(min_balance);
    let withdraw_amount = amount.unwrap_or(max_withdrawable);
    
    // Ensure we don't try to withdraw more than available and keep vault rent-exempt
    require!(
        withdraw_amount <= max_withdrawable,
        crate::errors::VobleError::InsufficientVaultBalance
    );
    require!(
        vault_balance >= withdraw_amount + min_balance,
        crate::errors::VobleError::InsufficientVaultBalance
    );
    
    // Transfer from platform vault to destination using secure CPI
    let vault_seeds = &[b"platform_vault".as_ref(), &[ctx.bumps.platform_vault]];
    let signer_seeds = &[&vault_seeds[..]];
    
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.platform_vault.to_account_info(),
                to: ctx.accounts.destination.to_account_info(),
            },
            signer_seeds,
        ),
        withdraw_amount,
    )?;

    emit!(PlatformRevenueWithdrawn {
        authority: ctx.accounts.authority.key(),
        destination: ctx.accounts.destination.key(),
        amount: withdraw_amount,
        remaining_balance: vault_balance - withdraw_amount,
    });

    Ok(())
}

