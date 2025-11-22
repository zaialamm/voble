use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::commit_and_undelegate_accounts;
use ephemeral_rollups_sdk::ephem::{MagicInstructionBuilder, MagicAction, CallHandler, CommitType};
use ephemeral_rollups_sdk::{ActionArgs, ShortAccountMeta};

// Import helper modules
use super::word_selection;
use solana_address::Address;

/// Buy ticket and start a new Voble game in one transaction
///
/// This is the RECOMMENDED way to start a game as it combines:
/// 1. Ticket purchase (payment split across prize pools)
/// 2. Period limit validation (one game per period)
/// 3. Word selection (currently demo mode, VRF in production)
/// 4. Session initialization
///
/// All in one atomic transaction!
///
/// # Arguments
/// * `ctx` - The context containing all required accounts
/// * `period_id` - The period ID for this game (e.g., "D123" for daily period 123)
///
/// # Payment Distribution
/// When a player buys a ticket, the payment is split according to global config:
/// - X% to daily prize pool
/// - Y% to weekly prize pool
/// - Z% to monthly prize pool
/// - W% to platform revenue
/// (All percentages from config, must total 100%)
///
/// # Validation
/// - Game must not be paused
/// - Player must not have already played this period
/// - Ticket price must be paid in full
/// - Payment splits must add up exactly to ticket price
///
/// # Session Creation
/// Creates a new SessionAccount with:
/// - Randomly selected word (hidden via hash)
/// - Empty guess array
/// - Game state tracking
/// - Rent automatically reclaimed on completion
///
/// # Security Notes
/// - Uses PDA for session (prevents duplicate sessions per player per period)
/// - Word is hashed until game completion (anti-cheat)
/// - Payment validation ensures no lamport loss
///
/// # Flow After This
/// 1. This instruction completes ✅
/// 2. Player submits guesses (up to 7)
/// 3. Player completes game (claims rent back)
/// 4. Stats update on ER, leaderboard updates
///
/// # Demo Mode Warning
/// ⚠️ Current word selection is deterministic (for testing)
/// ⚠️ MUST implement VRF before mainnet with real prizes!
pub fn buy_ticket_and_start_game(
    ctx: Context<BuyTicketAndStartGame>,
    period_id: String,
) -> Result<()> {
    let config = &ctx.accounts.global_config;
    let now = Clock::get()?.unix_timestamp;

    // ========== VALIDATION: Game State ==========
    require!(!config.paused, VobleError::GamePaused);
    require!(
        period_id.len() <= MAX_PERIOD_ID_LENGTH,
        VobleError::PeriodIdTooLong
    );
    require!(period_id.len() > 0, VobleError::SessionIdEmpty);

    msg!("🎮 Starting new Voble game");
    msg!("   Period: {}", period_id);
    msg!("   Player: {}", ctx.accounts.payer.key());

    // Period limit is now enforced via profile check (see below)

    // Get player key for word selection
    let player_key = ctx.accounts.payer.key();
    
    // Note: We can't read total_games from delegated profile, but it's only used
    // for word selection entropy. Using a constant (0) is fine for demo mode.
    // TODO: For production VRF, this won't be needed anyway.
    let total_games = 0u32;

    // ========== PAYMENT PROCESSING ==========
    let ticket_price = config.ticket_price;

    msg!("💰 Processing ticket payment: {} USDC ", ticket_price);

    // Calculate prize distribution splits (basis points -> lamports)
    let daily_amount = 
        (ticket_price * config.prize_split_daily as u64) / BASIS_POINTS_TOTAL as u64;
    let weekly_amount =
        (ticket_price * config.prize_split_weekly as u64) / BASIS_POINTS_TOTAL as u64;
    let monthly_amount =
        (ticket_price * config.prize_split_monthly as u64) / BASIS_POINTS_TOTAL as u64;
    let platform_amount =
        (ticket_price * config.platform_revenue_split as u64) / BASIS_POINTS_TOTAL as u64;
    let lucky_draw_amount =
        (ticket_price * config.lucky_draw_split as u64) / BASIS_POINTS_TOTAL as u64;

    // CRITICAL: Validate splits add up exactly to ticket price (prevent lamport loss)
    let total_distributed = daily_amount + weekly_amount + monthly_amount + platform_amount + lucky_draw_amount;
    require!(
        total_distributed == ticket_price,
        VobleError::InvalidPrizeSplits
    );

    msg!(
        "   Distribution: daily={}, weekly={}, monthly={}, platform={}, lucky_draw={}",
        daily_amount,
        weekly_amount,
        monthly_amount,
        platform_amount,
        lucky_draw_amount
    );

    // Transfer to daily prize vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.daily_prize_vault.to_account_info(),
            },
        ),
        daily_amount,
    )?;

    // Transfer to weekly prize vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.weekly_prize_vault.to_account_info(),
            },
        ),
        weekly_amount,
    )?;

    // Transfer to monthly prize vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.monthly_prize_vault.to_account_info(),
            },
        ),
        monthly_amount,
    )?;

    // Transfer to platform vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.platform_vault.to_account_info(),
            },
        ),
        platform_amount,
    )?;

    // Transfer to lucky draw vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.lucky_draw_vault.to_account_info(),
            },
        ),
        lucky_draw_amount,
    )?;
    

    msg!("✅ Payment distributed to all vaults");

    // ========== WORD SELECTION ==========
    // Select a word for this game session
    // ⚠️ Currently uses deterministic selection (DEMO MODE)
    // ⚠️ Replace with VRF for production!
    let word_data = word_selection::select_word_for_session(player_key, &period_id, total_games)?;

    msg!("📝 Word selected for session");

    // ========== PERIOD LIMIT ENFORCEMENT ==========
    // Check if player already played this period
    let profile = &ctx.accounts.user_profile;
    require!(
        profile.last_played_period != period_id,
        VobleError::AlreadyPlayedThisPeriod
    );

    msg!("✅ Period limit enforced: Player hasn't played period {}", period_id);

    // ========== SESSION INITIALIZATION ==========
    let session = &mut ctx.accounts.session;

    // Generate session ID (format: "voble-{period}")
    let session_id = format!("voble-{}", period_id);
    require!(
        session_id.len() <= MAX_SESSION_ID_LENGTH,
        VobleError::SessionIdTooLong
    );

    // Initialize session data
    session.player = player_key;
    session.session_id = session_id.clone();
    session.target_word_hash = word_data.word_hash;
    session.word_index = word_data.word_index;
    session.target_word = String::new(); // Hidden until completion (anti-cheat)
    session.guesses = [None, None, None, None, None, None, None];
    session.is_solved = false;
    session.guesses_used = 0;
    session.time_ms = 0;
    session.score = 0;
    session.completed = false;
    session.period_id = period_id.clone();
    session.vrf_request_timestamp = now; // Track session start time
    session.keystrokes = Vec::new();        
    session.current_input = String::new();  

    msg!("✅ Session initialized");
    
    // Note: Profile period tracking will be updated via Magic Action after game completion
    // This avoids needing to clone user_profile to ER

    // ========== EMIT EVENTS ==========
    // IMPORTANT: Events must be emitted BEFORE delegation!
    // After delegation, the session account is owned by ER and cannot be modified
    emit!(TicketPurchased {
        player: ctx.accounts.payer.key(),
        amount: ticket_price,
        daily_amount,
        weekly_amount,
        monthly_amount,
        platform_amount,
        lucky_draw_amount, 
    });

    emit!(VobleGameStarted {
        player: player_key,
        session_id: session_id.clone(),
        period_id: period_id.clone(),
        target_word_hash: format!("{:x?}", word_data.word_hash),
        timestamp: now,
    });

    Ok(())
}

pub fn initialize_session(ctx: Context<InitializeSession>) -> Result<()> {
    msg!("🎮 Initializing session account");
    
    let session = &mut ctx.accounts.session;
    session.player = ctx.accounts.payer.key();
    session.keystrokes = Vec::new();  
    session.current_input = String::new(); 
    
    msg!("✅ Session initialized for player: {}", session.player);
    
    Ok(())
}

/// Delegate session to Ephemeral Rollup
pub fn delegate_session(ctx: Context<DelegateSession>) -> Result<()> {
    
    ctx.accounts.delegate_pda(
        &ctx.accounts.payer,
        &[SEED_SESSION, ctx.accounts.payer.key().as_ref()],
        DelegateConfig {
            commit_frequency_ms: 30_000,
            validator: Some(pubkey!("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57")),
        },
    )?;
    
    msg!("✅ Session delegated to ER");

    Ok(())
}


/// Undelegate session from Ephemeral Rollup
/// This instruction ONLY commits the session from ER to base layer
/// It does NOT update leaderboard or profile (those accounts are not on ER)
pub fn undelegate_session(ctx: Context<UndelegateSession>) -> Result<()> {
    msg!("🔄 Committing session from ER to base layer");
    
    // Commit and undelegate session from ER to base layer
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.session.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    
    msg!("✅ Session committed successfully");
    
    Ok(())
}


/// Commit and update stats when undelegate
pub fn commit_and_update_stats(
    ctx: Context<CommitAndUpdateStats>,
    daily_period_id: String,
    weekly_period_id: String,
    monthly_period_id: String,
) -> Result<()> {
    msg!("🔄 Committing session from ER to base layer with handler");
    msg!(
        "   Period IDs → daily: {}, weekly: {}, monthly: {}",
        daily_period_id,
        weekly_period_id,
        monthly_period_id
    );
    
    // Build handler instruction data
    let instruction_data = anchor_lang::InstructionData::data(
        &crate::instruction::UpdatePlayerStats {}
    );

    let call_handler = CallHandler {
        args: ActionArgs {
            escrow_index: 0,
            data: instruction_data,
        },
        compute_units: 400_000,
        escrow_authority: ctx.accounts.payer.to_account_info(),
        destination_program: crate::ID,
        accounts: vec![
            ShortAccountMeta {
                pubkey: Address::new_from_array(ctx.accounts.daily_leaderboard.key().to_bytes()),
                is_writable: true,
            },
            ShortAccountMeta {
                pubkey: Address::new_from_array(ctx.accounts.weekly_leaderboard.key().to_bytes()),
                is_writable: true,
            },
            ShortAccountMeta {
                pubkey: Address::new_from_array(ctx.accounts.monthly_leaderboard.key().to_bytes()),
                is_writable: true,
            },
            ShortAccountMeta {
                pubkey: Address::new_from_array(ctx.accounts.user_profile.key().to_bytes()),
                is_writable: true,
            },
            ShortAccountMeta {
                pubkey: Address::new_from_array(ctx.accounts.session.key().to_bytes()),
                is_writable: false,
            },
        ],
    };

    let magic_builder = MagicInstructionBuilder {
        payer: ctx.accounts.payer.to_account_info(),
        magic_context: ctx.accounts.magic_context.to_account_info(),
        magic_program: ctx.accounts.magic_program.to_account_info(),
        magic_action: MagicAction::Commit(CommitType::WithHandler {
            commited_accounts: vec![ctx.accounts.session.to_account_info()],
            call_handlers: vec![call_handler],
        }),
    };

    magic_builder.build_and_invoke()?;

    msg!("✅ Session committed - handler will update leaderboard automatically");
    
    Ok(())
}
