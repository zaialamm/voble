use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize global configuration
#[derive(Accounts)]
pub struct InitializeGlobalConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalConfig::INIT_SPACE,
        seeds = [b"global_config_v2"],
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
        seeds = [b"global_config_v2"],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    pub authority: Signer<'info>,
}

/// Initialize all prize vaults
#[derive(Accounts)]
pub struct InitializeVaults<'info> {
    #[account(
        seeds = [b"global_config_v2"],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [b"daily_prize_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault account for daily prizes
    pub daily_prize_vault: AccountInfo<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [b"weekly_prize_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault account for weekly prizes
    pub weekly_prize_vault: AccountInfo<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [b"monthly_prize_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault account for monthly prizes
    pub monthly_prize_vault: AccountInfo<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [b"platform_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault for platform revenue
    pub platform_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

/// Withdraw platform revenue
#[derive(Accounts)]
pub struct WithdrawPlatformRevenue<'info> {
    #[account(
        seeds = [b"global_config_v2"],
        bump,
        has_one = authority
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    #[account(
        mut,
        seeds = [b"platform_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault for platform revenue
    pub platform_vault: AccountInfo<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Destination account for withdrawn funds
    #[account(mut)]
    pub destination: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}
