use crate::{constants::*, contexts::*, errors::VobleError, events::*};
use anchor_lang::prelude::*;

/// Initialize a user profile for the Voble game
///
/// This instruction creates a new user profile on Solana L1 (base layer).
/// The profile stores all persistent user data including stats, achievements,
/// and game history.
///
/// # Arguments
/// * `ctx` - The context containing the user profile account and payer
/// * `username` - The username for this player (1-32 characters)
///
/// # Validation
/// - Username must be 1-32 characters long
/// - Profile account must not already exist (enforced by init constraint)
///
/// # Profile Initialization
/// The profile is created with:
/// - Zero games played and stats
/// - Empty achievement list
/// - No streak data
/// - Current timestamp for creation
///
/// # Notes
/// After creation, the profile should be delegated to Ephemeral Rollups
/// using `delegate_profile()` for gasless, real-time gameplay.
///
/// # Example Flow
/// 1. Player creates profile (this instruction)
/// 2. Player delegates profile to ER
/// 3. Player plays games on ER (gasless, fast)
/// 4. Player undelegates profile back to L1
pub fn initialize_user_profile(
    ctx: Context<InitializeUserProfile>,
    username: String,
) -> Result<()> {
    // ========== VALIDATION ==========
    require!(
        username.len() <= MAX_USERNAME_LENGTH,
        VobleError::SessionIdTooLong
    );
    require!(username.len() > 0, VobleError::SessionIdEmpty);

    let profile = &mut ctx.accounts.user_profile;
    let now = Clock::get()?.unix_timestamp;

    // ========== INITIALIZE PROFILE DATA ==========
    profile.player = ctx.accounts.payer.key();
    profile.username = username.clone();

    // Initialize game stats
    profile.total_games_played = 0;
    profile.games_won = 0;
    profile.current_streak = 0;
    profile.max_streak = 0;
    profile.total_score = 0;
    profile.best_score = 0;
    profile.average_guesses = 0.0;

    // Initialize guess distribution (0 games in each category)
    profile.guess_distribution = [0; 7];

    // Initialize period tracking
    profile.last_played_period = String::new();
    profile.has_played_this_period = false;

    // Initialize achievements (empty)
    profile.achievements = Vec::new();

    // Set timestamps
    profile.created_at = now;
    profile.last_played = now;

    // ========== EMIT EVENT ==========
    emit!(UserProfileCreated {
        player: profile.player,
        username: profile.username.clone(),
        created_at: now,
    });

    msg!("👤 User profile created successfully");
    msg!("📍 Player: {}", ctx.accounts.payer.key());
    msg!("🎮 Username: {}", username);
    msg!("⏰ Created at: {}", now);
    msg!("💡 Next step: Delegate profile to ER for gasless gaming");

    Ok(())
}
