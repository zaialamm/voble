use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;

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
