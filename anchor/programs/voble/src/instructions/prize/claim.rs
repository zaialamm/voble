use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::{contexts::*, events::*, errors::VobleError};

/// Claim daily prize
pub fn claim_daily(ctx: Context<ClaimDaily>) -> Result<()> {
    let entitlement = &mut ctx.accounts.winner_entitlement;
    require!(!entitlement.claimed, VobleError::AlreadyClaimed);

    let amount = entitlement.amount;
    let vault_balance = ctx.accounts.daily_prize_vault.lamports();
    
    // Get rent-exempt minimum for the vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(ctx.accounts.daily_prize_vault.data_len());
    
    // Ensure vault has enough balance after transfer
    require!(
        vault_balance >= amount + min_balance,
        VobleError::InsufficientVaultBalance
    );
    
    // Transfer from vault to winner using secure CPI
    let vault_seeds = &[b"daily_prize_vault".as_ref(), &[ctx.bumps.daily_prize_vault]];
    let signer_seeds = &[&vault_seeds[..]];
    
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.daily_prize_vault.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    entitlement.claimed = true;

    emit!(PrizeClaimed {
        winner: ctx.accounts.winner.key(),
        period_type: "daily".to_string(),
        period_id: entitlement.period_id.clone(),
        rank: entitlement.rank,
        amount,
    });

    Ok(())
}

/// Claim weekly prize
pub fn claim_weekly(ctx: Context<ClaimWeekly>) -> Result<()> {
    let entitlement = &mut ctx.accounts.winner_entitlement;
    require!(!entitlement.claimed, VobleError::AlreadyClaimed);

    let amount = entitlement.amount;
    let vault_balance = ctx.accounts.weekly_prize_vault.lamports();
    
    // Get rent-exempt minimum for the vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(ctx.accounts.weekly_prize_vault.data_len());
    
    // Ensure vault has enough balance after transfer
    require!(
        vault_balance >= amount + min_balance,
        VobleError::InsufficientVaultBalance
    );
    
    // Transfer from vault to winner using secure CPI
    let vault_seeds = &[b"weekly_prize_vault".as_ref(), &[ctx.bumps.weekly_prize_vault]];
    let signer_seeds = &[&vault_seeds[..]];
    
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.weekly_prize_vault.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    entitlement.claimed = true;

    emit!(PrizeClaimed {
        winner: ctx.accounts.winner.key(),
        period_type: "weekly".to_string(),
        period_id: entitlement.period_id.clone(),
        rank: entitlement.rank,
        amount,
    });

    Ok(())
}

/// Claim monthly prize
pub fn claim_monthly(ctx: Context<ClaimMonthly>) -> Result<()> {
    let entitlement = &mut ctx.accounts.winner_entitlement;
    require!(!entitlement.claimed, VobleError::AlreadyClaimed);

    let amount = entitlement.amount;
    let vault_balance = ctx.accounts.monthly_prize_vault.lamports();
    
    // Get rent-exempt minimum for the vault
    let rent = Rent::get()?;
    let min_balance = rent.minimum_balance(ctx.accounts.monthly_prize_vault.data_len());
    
    // Ensure vault has enough balance after transfer
    require!(
        vault_balance >= amount + min_balance,
        VobleError::InsufficientVaultBalance
    );
    
    // Transfer from vault to winner using secure CPI
    let vault_seeds = &[b"monthly_prize_vault".as_ref(), &[ctx.bumps.monthly_prize_vault]];
    let signer_seeds = &[&vault_seeds[..]];
    
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.monthly_prize_vault.to_account_info(),
                to: ctx.accounts.winner.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;

    entitlement.claimed = true;

    emit!(PrizeClaimed {
        winner: ctx.accounts.winner.key(),
        period_type: "monthly".to_string(),
        period_id: entitlement.period_id.clone(),
        rank: entitlement.rank,
        amount,
    });

    Ok(())
}

