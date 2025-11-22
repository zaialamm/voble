use crate::constants::*;
use crate::state::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenInterface, TokenAccount, Mint};

/// Initialize global configuration
#[derive(Accounts)]
pub struct InitializeGlobalConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [SEED_GLOBAL_CONFIG],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Update configuration settings
#[derive(Accounts)]
pub struct SetConfig<'info> {
    #[account(
        mut,
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeVaults<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_DAILY_PRIZE_VAULT],
        bump,
        token::mint = usdc_mint,
        token::authority = daily_prize_vault,
    )]
    pub daily_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_WEEKLY_PRIZE_VAULT],
        bump,
        token::mint = usdc_mint,
        token::authority = weekly_prize_vault,
    )]
    pub weekly_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_MONTHLY_PRIZE_VAULT],
        bump,
        token::mint = usdc_mint,
        token::authority = monthly_prize_vault,
    )]
    pub monthly_prize_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_PLATFORM_VAULT],
        bump,
        token::mint = usdc_mint,
        token::authority = platform_vault,
    )]
    pub platform_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [SEED_LUCKY_DRAW_VAULT],
        bump,
        token::mint = usdc_mint,
        token::authority = lucky_draw_vault,
    )]
    pub lucky_draw_vault: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawPlatformRevenue<'info> {
    #[account(
        seeds = [SEED_GLOBAL_CONFIG],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,

    #[account(
        mut,
        seeds = [SEED_PLATFORM_VAULT],
        bump,
        token::mint = global_config.usdc_mint,
        token::authority = platform_vault,
    )]
    pub platform_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        token::mint = global_config.usdc_mint,
    )]
    pub destination: InterfaceAccount<'info, TokenAccount>,

    pub usdc_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}
