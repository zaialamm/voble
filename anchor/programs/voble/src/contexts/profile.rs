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
        seeds = [SEED_USER_PROFILE, payer.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
