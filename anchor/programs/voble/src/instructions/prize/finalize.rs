use anchor_lang::prelude::*;
use crate::{contexts::*, events::*, errors::VobleError};

/// Finalize daily period with winner determination
pub fn finalize_daily(ctx: Context<FinalizeDaily>, period_id: String) -> Result<()> {
    let config = &ctx.accounts.global_config;
    require!(!config.paused, VobleError::GamePaused);
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);

    // Get leaderboard and finalize it
    let leaderboard = &mut ctx.accounts.leaderboard;
    require!(!leaderboard.finalized, VobleError::PeriodAlreadyFinalized);
    leaderboard.finalized = true;
    leaderboard.finalized_at = Some(Clock::get()?.unix_timestamp);

    // Get vault balance
    let vault_balance = ctx.accounts.daily_prize_vault.lamports();
    require!(vault_balance > 0, VobleError::InsufficientVaultBalance);
    
    // Calculate winner amounts with remainder handling
    let first_amount = (vault_balance * config.winner_splits[0] as u64) / 10000;
    let second_amount = (vault_balance * config.winner_splits[1] as u64) / 10000;
    let third_amount = (vault_balance * config.winner_splits[2] as u64) / 10000;
    
    // Calculate remainder and add to first place (prevents lamport loss)
    let total_distributed = first_amount + second_amount + third_amount;
    let remainder = vault_balance.saturating_sub(total_distributed);
    let first_amount_final = first_amount + remainder;
    
    // Validate exact distribution
    require!(
        first_amount_final + second_amount + third_amount == vault_balance,
        VobleError::InvalidPrizeAmount
    );
    
    msg!("💰 Prize calculation: base amounts [{}, {}, {}], remainder: {}", 
         first_amount, second_amount, third_amount, remainder);

    // ========== WINNER DETERMINATION ==========
    // Get top 3 winners from leaderboard
    let mut winners = Vec::new();
    let mut winner_scores = Vec::new();
    
    for (i, entry) in leaderboard.entries.iter().take(3).enumerate() {
        winners.push(entry.player);
        winner_scores.push(entry.score);
        msg!("🏆 Winner #{}: {} with score {}", i + 1, entry.player, entry.score);
    }

    // Initialize period state
    let period_state = &mut ctx.accounts.period_state;
    period_state.period_type = "daily".to_string();
    period_state.period_id = period_id.clone();
    period_state.finalized = true;
    period_state.total_participants = leaderboard.total_players;
    period_state.vault_balance_at_finalization = vault_balance;
    period_state.winners = winners.clone();
    
    emit!(PeriodFinalized {
        period_type: "daily".to_string(),
        period_id,
        vault_balance,
        winner_amounts: vec![first_amount_final, second_amount, third_amount],
    });

    msg!("📊 Daily period finalized: {} participants, {} winners", 
         leaderboard.total_players, winners.len());
    msg!("💰 Final prize amounts: 1st={} (includes {} remainder), 2nd={}, 3rd={}", 
         first_amount_final, remainder, second_amount, third_amount);

    Ok(())
}

/// Finalize weekly period with winner determination
pub fn finalize_weekly(ctx: Context<FinalizeWeekly>, period_id: String) -> Result<()> {
    let config = &ctx.accounts.global_config;
    require!(!config.paused, VobleError::GamePaused);
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);

    // Get leaderboard and finalize it
    let leaderboard = &mut ctx.accounts.leaderboard;
    require!(!leaderboard.finalized, VobleError::PeriodAlreadyFinalized);
    leaderboard.finalized = true;
    leaderboard.finalized_at = Some(Clock::get()?.unix_timestamp);

    let vault_balance = ctx.accounts.weekly_prize_vault.lamports();
    require!(vault_balance > 0, VobleError::InsufficientVaultBalance);
    
    // Calculate winner amounts with remainder handling
    let first_amount = (vault_balance * config.winner_splits[0] as u64) / 10000;
    let second_amount = (vault_balance * config.winner_splits[1] as u64) / 10000;
    let third_amount = (vault_balance * config.winner_splits[2] as u64) / 10000;
    
    // Calculate remainder and add to first place
    let total_distributed = first_amount + second_amount + third_amount;
    let remainder = vault_balance.saturating_sub(total_distributed);
    let first_amount_final = first_amount + remainder;
    
    // Validate exact distribution
    require!(
        first_amount_final + second_amount + third_amount == vault_balance,
        VobleError::InvalidPrizeAmount
    );

    // Get top 3 winners from leaderboard
    let mut winners = Vec::new();
    for (i, entry) in leaderboard.entries.iter().take(3).enumerate() {
        winners.push(entry.player);
        msg!("🏆 Winner #{}: {} with score {}", i + 1, entry.player, entry.score);
    }

    // Initialize period state
    let period_state = &mut ctx.accounts.period_state;
    period_state.period_type = "weekly".to_string();
    period_state.period_id = period_id.clone();
    period_state.finalized = true;
    period_state.total_participants = leaderboard.total_players;
    period_state.vault_balance_at_finalization = vault_balance;
    period_state.winners = winners.clone();

    emit!(PeriodFinalized {
        period_type: "weekly".to_string(),
        period_id,
        vault_balance,
        winner_amounts: vec![first_amount_final, second_amount, third_amount],
    });

    msg!("📊 Weekly period finalized: {} participants, {} winners", 
         leaderboard.total_players, winners.len());
    msg!("💰 Final prize amounts: 1st={} (includes {} remainder), 2nd={}, 3rd={}", 
         first_amount_final, remainder, second_amount, third_amount);

    Ok(())
}

/// Finalize monthly period with winner determination
pub fn finalize_monthly(ctx: Context<FinalizeMonthly>, period_id: String) -> Result<()> {
    let config = &ctx.accounts.global_config;
    require!(!config.paused, VobleError::GamePaused);
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);

    // Get leaderboard and finalize it
    let leaderboard = &mut ctx.accounts.leaderboard;
    require!(!leaderboard.finalized, VobleError::PeriodAlreadyFinalized);
    leaderboard.finalized = true;
    leaderboard.finalized_at = Some(Clock::get()?.unix_timestamp);

    let vault_balance = ctx.accounts.monthly_prize_vault.lamports();
    require!(vault_balance > 0, VobleError::InsufficientVaultBalance);
    
    // Calculate winner amounts with remainder handling
    let first_amount = (vault_balance * config.winner_splits[0] as u64) / 10000;
    let second_amount = (vault_balance * config.winner_splits[1] as u64) / 10000;
    let third_amount = (vault_balance * config.winner_splits[2] as u64) / 10000;
    
    // Calculate remainder and add to first place
    let total_distributed = first_amount + second_amount + third_amount;
    let remainder = vault_balance.saturating_sub(total_distributed);
    let first_amount_final = first_amount + remainder;
    
    // Validate exact distribution
    require!(
        first_amount_final + second_amount + third_amount == vault_balance,
        VobleError::InvalidPrizeAmount
    );

    // Get top 3 winners from leaderboard
    let mut winners = Vec::new();
    for (i, entry) in leaderboard.entries.iter().take(3).enumerate() {
        winners.push(entry.player);
        msg!("🏆 Winner #{}: {} with score {}", i + 1, entry.player, entry.score);
    }

    // Initialize period state
    let period_state = &mut ctx.accounts.period_state;
    period_state.period_type = "monthly".to_string();
    period_state.period_id = period_id.clone();
    period_state.finalized = true;
    period_state.total_participants = leaderboard.total_players;
    period_state.vault_balance_at_finalization = vault_balance;
    period_state.winners = winners.clone();

    emit!(PeriodFinalized {
        period_type: "monthly".to_string(),
        period_id,
        vault_balance,
        winner_amounts: vec![first_amount_final, second_amount, third_amount],
    });

    msg!("📊 Monthly period finalized: {} participants, {} winners", 
         leaderboard.total_players, winners.len());
    msg!("💰 Final prize amounts: 1st={} (includes {} remainder), 2nd={}, 3rd={}", 
         first_amount_final, remainder, second_amount, third_amount);

    Ok(())
}
