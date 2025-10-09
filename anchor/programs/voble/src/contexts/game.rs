use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::consts::{DELEGATION_PROGRAM_ID, MAGIC_CONTEXT_ID};
use ephemeral_rollups_sdk::anchor::delegate;
use crate::state::*;

/// Delegate user profile to Ephemeral Rollups
#[delegate]
#[derive(Accounts)]
pub struct DelegateUserProfile<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_profile", payer.key().as_ref()],
        bump,
        has_one = player,
        del
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Player who owns the profile
    pub player: UncheckedAccount<'info>,
    
    /// CHECK: Delegation buffer PDA
    #[account(mut)]
    pub delegation_buffer: UncheckedAccount<'info>,
    
    /// CHECK: Delegation record PDA
    #[account(mut)]
    pub delegation_record: UncheckedAccount<'info>,
    
    /// CHECK: Delegation metadata PDA
    #[account(mut)]
    pub delegation_metadata: UncheckedAccount<'info>,
    
    /// CHECK: Delegation program
    #[account(address = DELEGATION_PROGRAM_ID)]
    pub delegation_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    
    /// CHECK: Owner program (this program)
    pub owner_program: UncheckedAccount<'info>,
}

/// Undelegate user profile from Ephemeral Rollups
#[derive(Accounts)]
pub struct UndelegateUserProfile<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_profile", payer.key().as_ref()],
        bump,
        has_one = player
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Player who owns the profile
    pub player: UncheckedAccount<'info>,
    
    /// CHECK: Delegation program
    #[account(address = DELEGATION_PROGRAM_ID)]
    pub delegation_program: UncheckedAccount<'info>,
    
    /// CHECK: Magic context account
    #[account(address = MAGIC_CONTEXT_ID)]
    pub magic_context: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Commit user profile state to base layer
#[derive(Accounts)]
pub struct CommitUserProfile<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_profile", payer.key().as_ref()],
        bump,
        has_one = player
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    /// CHECK: Player who owns the profile
    pub player: UncheckedAccount<'info>,
    
    /// CHECK: Delegation program
    #[account(address = DELEGATION_PROGRAM_ID)]
    pub delegation_program: UncheckedAccount<'info>,
    
    /// CHECK: Magic context account
    #[account(address = MAGIC_CONTEXT_ID)]
    pub magic_context: UncheckedAccount<'info>,
}

/// Initialize user profile
#[derive(Accounts)]
#[instruction(username: String)]
pub struct InitializeUserProfile<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", payer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Update session score (used by vocabrush)
#[derive(Accounts)]
pub struct UpdateSessionScore<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", player.key().as_ref()],
        bump,
        has_one = player
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    pub player: Signer<'info>,
}

/// Update user profile (generic)
#[derive(Accounts)]
pub struct UpdateUserProfile<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", player.key().as_ref()],
        bump,
        has_one = player
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    pub player: Signer<'info>,
}
