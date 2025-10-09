use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::cpi::{delegate_account, DelegateConfig, DelegateAccounts};
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
use crate::{contexts::*, events::*, errors::VobleError};

/// Initialize a user profile for the Voble game
pub fn initialize_user_profile(
    ctx: Context<InitializeUserProfile>,
    username: String,
) -> Result<()> {
    require!(username.len() <= 32, VobleError::SessionIdTooLong);
    require!(username.len() > 0, VobleError::SessionIdEmpty);
    
    let profile = &mut ctx.accounts.user_profile;
    let now = Clock::get()?.unix_timestamp;
    
    profile.player = ctx.accounts.payer.key();
    profile.username = username.clone();
    profile.total_games_played = 0;
    profile.games_won = 0;
    profile.current_streak = 0;
    profile.max_streak = 0;
    profile.total_score = 0;
    profile.best_score = 0;
    profile.average_guesses = 0.0;
    profile.guess_distribution = [0; 7];
    profile.last_played_period = "".to_string();
    profile.has_played_this_period = false;
    profile.achievements = Vec::new();
    profile.created_at = now;
    profile.last_played = now;
    
    emit!(UserProfileCreated {
        player: profile.player,
        username: profile.username.clone(),
        created_at: now,
    });
    
    msg!("User profile created for player: {}", ctx.accounts.payer.key());
    msg!("Username: {}", username);
    
    Ok(())
}

/// Delegate user profile to Ephemeral Rollup for gasless gaming
pub fn delegate_user_profile(
    ctx: Context<DelegateUserProfile>,
    commit_frequency_ms: u32,
) -> Result<()> {
    // PDA seeds for user_profile - store key to avoid temporary value issue
    let payer_key = ctx.accounts.payer.key();
    let pda_seeds: &[&[u8]] = &[b"user_profile", payer_key.as_ref()];
    
    // Prepare delegation accounts
    let delegate_accounts = DelegateAccounts {
        payer: &ctx.accounts.payer.to_account_info(),
        pda: &ctx.accounts.user_profile.to_account_info(),
        owner_program: &ctx.accounts.owner_program.to_account_info(),
        buffer: &ctx.accounts.delegation_buffer.to_account_info(),
        delegation_record: &ctx.accounts.delegation_record.to_account_info(),
        delegation_metadata: &ctx.accounts.delegation_metadata.to_account_info(),
        delegation_program: &ctx.accounts.delegation_program.to_account_info(),
        system_program: &ctx.accounts.system_program.to_account_info(),
    };
    
    // Delegation config
    let delegate_config = DelegateConfig {
        commit_frequency_ms,
        // Using Asia ER validator for devnet
        validator: Some(pubkey!("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57")),
    };
    
    // Perform delegation CPI
    delegate_account(delegate_accounts, pda_seeds, delegate_config)?;
    
    msg!("User profile delegated to ER for player: {}", ctx.accounts.payer.key());
    msg!("Commit frequency: {}ms", commit_frequency_ms);
    Ok(())
}

/// Undelegate user profile back to mainnet
pub fn undelegate_user_profile(ctx: Context<UndelegateUserProfile>) -> Result<()> {
    // Commit final state and undelegate from ER
    commit_and_undelegate_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![&ctx.accounts.user_profile.to_account_info()],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.delegation_program.to_account_info(),
    )?;
    
    msg!("User profile undelegated from ER for player: {}", ctx.accounts.payer.key());
    Ok(())
}

/// Commit user profile state from Ephemeral Rollup to mainnet
pub fn commit_user_profile(ctx: Context<CommitUserProfile>) -> Result<()> {
    // Manually commit state while still delegated
    commit_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![&ctx.accounts.user_profile.to_account_info()],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.delegation_program.to_account_info(),
    )?;
    
    msg!("User profile state committed to mainnet for player: {}", ctx.accounts.payer.key());
    Ok(())
}

/*
// Original commit implementation - commented out until SDK is updated
pub fn commit_user_profile_original(ctx: Context<CommitUserProfile>) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer.to_account_info(),
        vec![&ctx.accounts.user_profile.to_account_info()],
        &ctx.accounts.magic_context.to_account_info(),
        &ctx.accounts.delegation_program.to_account_info(),
    )?;
    msg!("User profile state committed to mainnet for player: {}", ctx.accounts.payer.key());
    
    Ok(())
}
*/
