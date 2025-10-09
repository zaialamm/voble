use anchor_lang::prelude::*;

/// Winner entitlement for prize claiming
#[account]
#[derive(InitSpace)]
pub struct WinnerEntitlement {
    pub player: Pubkey,
    #[max_len(10)]
    pub period_type: String,
    #[max_len(20)]
    pub period_id: String,
    pub rank: u8,
    pub amount: u64,
    pub claimed: bool,
}

/// Period state tracking finalization and winners
#[account]
#[derive(InitSpace)]
pub struct PeriodState {
    #[max_len(10)]
    pub period_type: String,
    #[max_len(20)]
    pub period_id: String,
    pub finalized: bool,
    pub total_participants: u32,
    pub vault_balance_at_finalization: u64,
    #[max_len(3)]
    pub winners: Vec<Pubkey>,
}
