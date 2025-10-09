use anchor_lang::prelude::*;

/// Global configuration for the Voble game
#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub ticket_price: u64,
    pub prize_split_daily: u16,
    pub prize_split_weekly: u16,
    pub prize_split_monthly: u16,
    pub platform_revenue_split: u16,
    #[max_len(3)]
    pub winner_splits: Vec<u16>,
    pub paused: bool,
}
