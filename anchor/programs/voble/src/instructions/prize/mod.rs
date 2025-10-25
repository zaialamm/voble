// ================================
// PRIZE INSTRUCTIONS MODULE
// ================================
// Business logic for prize distribution and winner payouts

pub mod claim_prize;
pub mod create_entitlement;
pub mod distribution;
pub mod finalize_period;

// Re-export all public functions for easy access
pub use claim_prize::*;
pub use create_entitlement::*;
pub use finalize_period::*;

// Re-export helper functions that might be needed externally
pub use distribution::{
    calculate_prize_splits, calculate_ticket_distribution, get_period_seed_for_type,
    get_vault_seed_for_period, validate_prize_splits, validate_ticket_distribution,
    validate_vault_balance, PrizeSplit,
};
