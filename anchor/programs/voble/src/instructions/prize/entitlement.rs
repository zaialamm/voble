use anchor_lang::prelude::*;
use crate::{contexts::*, events::*, errors::VobleError, state::*};

/// Create daily winner entitlement
pub fn create_daily_winner_entitlement(
    ctx: Context<CreateDailyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);
    require!(rank >= 1 && rank <= 3, VobleError::InvalidWinnerSplits);

    let entitlement = &mut ctx.accounts.winner_entitlement;
    entitlement.player = ctx.accounts.winner.key();
    entitlement.period_type = "daily".to_string();
    entitlement.period_id = period_id;
    entitlement.rank = rank;
    entitlement.amount = amount;
    entitlement.claimed = false;

    Ok(())
}

/// Create weekly winner entitlement
pub fn create_weekly_winner_entitlement(
    ctx: Context<CreateWeeklyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);
    require!(rank >= 1 && rank <= 3, VobleError::InvalidWinnerSplits);

    let entitlement = &mut ctx.accounts.winner_entitlement;
    entitlement.player = ctx.accounts.winner.key();
    entitlement.period_type = "weekly".to_string();
    entitlement.period_id = period_id;
    entitlement.rank = rank;
    entitlement.amount = amount;
    entitlement.claimed = false;

    Ok(())
}

/// Create monthly winner entitlement
pub fn create_monthly_winner_entitlement(
    ctx: Context<CreateMonthlyWinnerEntitlement>,
    period_id: String,
    rank: u8,
    amount: u64,
) -> Result<()> {
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);
    require!(rank >= 1 && rank <= 3, VobleError::InvalidWinnerSplits);

    let entitlement = &mut ctx.accounts.winner_entitlement;
    entitlement.player = ctx.accounts.winner.key();
    entitlement.period_type = "monthly".to_string();
    entitlement.period_id = period_id;
    entitlement.rank = rank;
    entitlement.amount = amount;
    entitlement.claimed = false;

    Ok(())
}

/// Enhanced finalize function that automatically creates winner entitlements
pub fn finalize_daily_with_winners(
    ctx: Context<FinalizeDailyWithWinners>,
    period_id: String,
    winners: Vec<Pubkey>,
    scores: Vec<LeaderboardScore>,
) -> Result<()> {
    let config = &ctx.accounts.global_config;
    require!(!config.paused, VobleError::GamePaused);
    require!(period_id.len() <= 20, VobleError::PeriodIdTooLong);
    require!(winners.len() == 3, VobleError::InvalidWinnerCount);
    require!(scores.len() == 3, VobleError::InvalidWinnerCount);

    // Verify winners are sorted correctly (best to worst)
    for i in 1..scores.len() {
        require!(
            is_better_score(&scores[i-1], &scores[i]),
            VobleError::InvalidWinnerOrder
        );
    }

    // Get current vault balance for dynamic prize calculation
    let vault_balance = ctx.accounts.daily_prize_vault.lamports();
    
    // Calculate dynamic prize amounts based on vault balance and winner splits
    let first_amount = (vault_balance * config.winner_splits[0] as u64) / 10000;
    let second_amount = (vault_balance * config.winner_splits[1] as u64) / 10000;
    let third_amount = (vault_balance * config.winner_splits[2] as u64) / 10000;
    
    let prize_amounts = [first_amount, second_amount, third_amount];

    // Create winner entitlements for all 3 winners in single transaction
    let entitlement_accounts = [
        &ctx.accounts.first_place_entitlement,
        &ctx.accounts.second_place_entitlement,
        &ctx.accounts.third_place_entitlement,
    ];

    for (i, &winner) in winners.iter().enumerate() {
        let rank = (i + 1) as u8;
        let amount = prize_amounts[i];
        
        // Create PDA for winner entitlement
        let seeds = &[
            b"winner_entitlement",
            winner.as_ref(),
            period_id.as_bytes(),
        ];
        let (expected_pda, _bump) = Pubkey::find_program_address(seeds, ctx.program_id);
        
        require!(
            entitlement_accounts[i].key() == expected_pda,
            VobleError::InvalidPeriodState
        );

        // Initialize the account
        let space = 8 + WinnerEntitlement::INIT_SPACE;
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(space);

        anchor_lang::system_program::create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::CreateAccount {
                    from: ctx.accounts.authority.to_account_info(),
                    to: entitlement_accounts[i].to_account_info(),
                },
            ),
            lamports,
            space as u64,
            ctx.program_id,
        )?;

        // Initialize the data
        let mut data = entitlement_accounts[i].try_borrow_mut_data()?;
        let entitlement = WinnerEntitlement {
            player: winner,
            period_type: "daily".to_string(),
            period_id: period_id.clone(),
            rank,
            amount,
            claimed: false,
        };
        
        // Write discriminator (8 bytes for account discriminator)
        let discriminator = anchor_lang::solana_program::hash::hash(b"account:WinnerEntitlement").to_bytes();
        data[0..8].copy_from_slice(&discriminator[0..8]);
        // Write account data
        entitlement.try_serialize(&mut &mut data[8..])?;
    }

    // Update period state with actual winners
    let period_state = &mut ctx.accounts.period_state;
    period_state.period_type = "daily".to_string();
    period_state.period_id = period_id.clone();
    period_state.finalized = true;
    period_state.total_participants = scores.len() as u32;
    period_state.vault_balance_at_finalization = vault_balance;
    period_state.winners = winners.clone();
    
    emit!(PeriodFinalizedWithWinners {
        period_type: "daily".to_string(),
        period_id,
        vault_balance,
        winners: winners.clone(),
        winner_amounts: prize_amounts.to_vec(),
        total_participants: period_state.total_participants,
    });

    Ok(())
}

// Helper function to compare scores (better score returns true)
fn is_better_score(score1: &LeaderboardScore, score2: &LeaderboardScore) -> bool {
    // Primary: More correct answers
    if score1.correct_count != score2.correct_count {
        return score1.correct_count > score2.correct_count;
    }
    
    // Secondary: Faster time (lower is better)
    if score1.time_ms != score2.time_ms {
        return score1.time_ms < score2.time_ms;
    }
    
    // Tertiary: Fewer guesses (lower is better)
    score1.guesses_used < score2.guesses_used
}

// Simplified score struct for winner verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LeaderboardScore {
    pub correct_count: u8,
    pub time_ms: u64,
    pub guesses_used: u8,
}
