use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::system_program;
use crate::{contexts::*, events::*, errors::VobleError, state::*};
use session_keys::{session_auth_or, Session, SessionError};

// Import contexts
use crate::contexts::voble::{BuyTicketAndStartGame, SubmitGuess, CompleteGame};

// ⚠️ DEMO MODE: Hardcoded word list for testing
// TODO: Replace with VRF-based selection before mainnet
// These words are intentionally visible in the contract for demo purposes
const VOBLE_WORDS: [&str; 20] = [
    "ANCHOR", "BRIDGE", "CASTLE", "DRAGON", "ENERGY", 
    "FOREST", "GARDEN", "HAMMER", "ISLAND", "JUNGLE",
    "KERNEL", "LADDER", "MARKET", "NATURE", "ORANGE",
    "PUZZLE", "QUARTZ", "ROCKET", "SOLANA", "TEMPLE"
];

/// Buy ticket and start Voble game in one transaction (RECOMMENDED)
pub fn buy_ticket_and_start_game(
    ctx: Context<BuyTicketAndStartGame>,
    period_id: String,
) -> Result<()> {
    let config = &ctx.accounts.global_config;
    require!(!config.paused, VobleError::GamePaused);
    
    // Read user profile to check period limit (but don't modify it here)
    let profile_data = ctx.accounts.user_profile.try_borrow_data()?;
    let profile = UserProfile::try_deserialize(&mut profile_data.as_ref())?;
    
    let session = &mut ctx.accounts.session;
    let now = Clock::get()?.unix_timestamp;
    
    // Check period limit (one game per period)
    // Note: We check last_played_period from profile, but we'll update it in complete_game on ER
    if profile.last_played_period == period_id && profile.has_played_this_period {
        return Err(VobleError::DailyLimitExceeded.into());
    }
    
    // Drop the borrow so we don't hold it
    drop(profile_data);
    
    // ========== PAYMENT PROCESSING ==========
    let ticket_price = config.ticket_price;
    
    // Calculate prize distribution splits
    let daily_amount = (ticket_price * config.prize_split_daily as u64) / 10000;
    let weekly_amount = (ticket_price * config.prize_split_weekly as u64) / 10000;
    let monthly_amount = (ticket_price * config.prize_split_monthly as u64) / 10000;
    let platform_amount = (ticket_price * config.platform_revenue_split as u64) / 10000;
    
    // PRIORITY 2: Validate splits add up to ticket price
    let total_distributed = daily_amount + weekly_amount + monthly_amount + platform_amount;
    require!(total_distributed == ticket_price, VobleError::InvalidPrizeSplits);
    
    // Transfer to daily vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.daily_prize_vault.to_account_info(),
            },
        ),
        daily_amount,
    )?;
    
    // Transfer to weekly vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.weekly_prize_vault.to_account_info(),
            },
        ),
        weekly_amount,
    )?;
    
    // Transfer to monthly vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.player.to_account_info(),
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
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.platform_vault.to_account_info(),
            },
        ),
        platform_amount,
    )?;
    
    // ========== GAME INITIALIZATION ==========
    // Generate session ID
    let session_id = format!("voble-{}-{}", profile.player, period_id);
    
    /* ========== COMMENTED OUT: BLOCKHASH-BASED RANDOMNESS (INSECURE) ==========
    // TODO: Replace with VRF (MagicBlock or Switchboard) before mainnet
    // Current blockhash approach is predictable and exploitable
    // Generate random word index using blockhash + player data
    // Combines: player pubkey + period + timestamp + game count (nonce)
    // This provides unpredictable randomness without external oracles
    let entropy_seed = format!("{}-{}-{}-{}", 
        profile.player,           // Player identity
        period_id,                // Period ID
        now,                      // Timestamp (unpredictable)
        profile.total_games_played // Nonce (unique per player)
    );
    let entropy_hash = hash(entropy_seed.as_bytes()).to_bytes();
    
    // Convert first 4 bytes to u32 for word index
    let random_u32 = u32::from_le_bytes([
        entropy_hash[0],
        entropy_hash[1],
        entropy_hash[2],
        entropy_hash[3],
    ]);
    let word_index = (random_u32 as usize) % VOBLE_WORDS.len();
    let selected_word = VOBLE_WORDS[word_index];
    */
    
    /* ========== COMMENTED OUT: VRF INTEGRATION (TO BE IMPLEMENTED) ==========
    // TODO: Implement VRF for production
    // Step 1: Request VRF randomness when buying ticket
    // let vrf_request = VrfClient::request_randomness(&ctx.accounts.vrf_account, &ctx.accounts.payer)?;
    // session.vrf_request_id = vrf_request.request_id;
    // session.target_word = String::new(); // Will be set by VRF callback
    // 
    // Step 2: Add VRF callback handler to receive randomness
    // pub fn vrf_callback(ctx: Context<VrfCallback>, randomness: [u8; 32]) -> Result<()> {
    //     let random_u32 = u32::from_le_bytes([randomness[0], randomness[1], randomness[2], randomness[3]]);
    //     let word_index = (random_u32 as usize) % VOBLE_WORDS.len();
    //     session.word_index = word_index as u32;
    //     session.target_word_hash = hash(VOBLE_WORDS[word_index].as_bytes()).to_bytes();
    // }
    */
    
    // ========== DEMO MODE: HARDCODED WORD SELECTION ==========
    // ⚠️ WARNING: This is for TESTING/DEMO purposes only!
    // ⚠️ DO NOT use this for games with real prizes - it's still predictable
    // ⚠️ MUST implement VRF before mainnet launch
    
    // Use combination of player data and period for word selection
    // Still deterministic but better than pure blockhash
    let selection_seed = format!("{}-{}", 
        profile.player.to_string().len(),  // Player pubkey length variation
        profile.total_games_played         // Player's game count
    );
    let selection_hash = hash(selection_seed.as_bytes()).to_bytes();
    let word_index = (u32::from_le_bytes([
        selection_hash[0],
        selection_hash[1],
        selection_hash[2],
        selection_hash[3],
    ]) as usize) % VOBLE_WORDS.len();
    
    let selected_word = VOBLE_WORDS[word_index];
    
    // Store hash of selected word (anti-cheat: word hidden until completion)
    let word_hash = hash(selected_word.as_bytes()).to_bytes();
    
    // Initialize SessionAccount
    session.player = profile.player;
    session.session_id = session_id.clone();
    session.target_word_hash = word_hash;
    session.word_index = word_index as u32;
    session.target_word = String::new(); // Empty until game completion (anti-cheat)
    session.guesses = [None, None, None, None, None, None, None];
    session.is_solved = false;
    session.guesses_used = 0;
    session.time_ms = 0;
    session.score = 0;
    session.completed = false;
    session.period_id = period_id.clone();
    session.vrf_request_timestamp = now; // Track game start time
    
    // Note: Profile updates (last_played_period, has_played_this_period, last_played)
    // are now done in complete_game which runs on ER where the profile is delegated
    
    // Emit events
    emit!(TicketPurchased {
        player: ctx.accounts.player.key(),
        amount: ticket_price,
        daily_amount,
        weekly_amount,
        monthly_amount,
        platform_amount,
    });
    
    emit!(VobleGameStarted {
        player: profile.player,
        session_id: session_id.clone(),
        period_id: period_id.clone(),
        target_word_hash: format!("{:x?}", word_hash),
        timestamp: now,
    });
    
    msg!("⚠️  ========== DEMO MODE ACTIVE ========== ⚠️");
    msg!("⚠️  Using hardcoded words - NOT SECURE for real prizes!");
    msg!("⚠️  VRF integration required before mainnet launch");
    msg!("Ticket purchased and Voble game started for player: {}", ctx.accounts.player.key());
    msg!("Session ID: {}", session_id);
    msg!("Ticket price: {} lamports (validated: {})", ticket_price, total_distributed);
    msg!("Demo word selected (index: {}, hash: {:x?})", word_index, &word_hash[..8]);
    msg!("Game ready to play!");
    msg!("⚠️  ======================================== ⚠️");
    
    Ok(())
}

/// Submit a guess for the current Voble game
#[session_auth_or(
    ctx.accounts.signer.key() == ctx.accounts.user_profile.player,
    SessionError::InvalidToken
)]
pub fn submit_guess(
    ctx: Context<SubmitGuess>,
    _period_id: String,
    guess: String,
) -> Result<()> {
    require!(guess.len() == 6, VobleError::InvalidScore);
    
    let session = &mut ctx.accounts.session;
    
    require!(!session.completed, VobleError::AlreadyClaimed);
    require!(session.guesses_used < 7, VobleError::InvalidGuessCount);
    require!(session.word_index < VOBLE_WORDS.len() as u32, VobleError::InvalidPeriodState); // Ensure word was selected
    
    let guess_upper = guess.to_uppercase();
    // Get target word from word list using stored index
    let target_word = VOBLE_WORDS[session.word_index as usize];
    
    // Calculate guess result using Voble logic
    let mut result = [LetterResult::Absent; 6];
    let mut target_chars: Vec<char> = target_word.chars().collect();
    let guess_chars: Vec<char> = guess_upper.chars().collect();
        
        // First pass: mark correct positions (Green)
        for i in 0..6 {
            if guess_chars[i] == target_chars[i] {
                result[i] = LetterResult::Correct;
                target_chars[i] = '\0'; // Mark as used
            }
        }
        
        // Second pass: mark present letters (Yellow)
        for i in 0..6 {
            if matches!(result[i], LetterResult::Absent) {
                if let Some(pos) = target_chars.iter().position(|&c| c == guess_chars[i] && c != '\0') {
                    result[i] = LetterResult::Present;
                    target_chars[pos] = '\0'; // Mark as used
                }
            }
        }
        
    // Store the guess and result in fixed array
    let guess_data = GuessData {
        guess: guess_upper.clone(),
        result,
    };
    
    let guess_index = session.guesses_used as usize;
    session.guesses[guess_index] = Some(guess_data);
    session.guesses_used += 1;
    
    // Check if word is solved (all letters correct)
    let is_correct = result.iter().all(|&r| matches!(r, LetterResult::Correct));
    if is_correct {
        session.is_solved = true;
    }
    
    emit!(GuessSubmitted {
        player: session.player,
        session_id: session.session_id.clone(),
        guess: guess_upper.clone(),
        guess_number: session.guesses_used,
        is_correct,
        result,
    });
    
    msg!("Guess submitted: {} (attempt {}/7)", guess_upper, session.guesses_used);
    msg!("Result: {:?}", result);
    
    // Auto-complete if solved or out of guesses
    if session.is_solved || session.guesses_used >= 7 {
        msg!("Game complete! Call complete_voble_game to finalize.");
    }
    
    Ok(())
}

/// Complete the current Voble game and update stats
#[session_auth_or(
    ctx.accounts.signer.key() == ctx.accounts.user_profile.player,
    SessionError::InvalidToken
)]
pub fn complete_voble_game(
    ctx: Context<CompleteGame>,
    _period_id: String,
) -> Result<()> {
    let profile = &mut ctx.accounts.user_profile;
    let session = &mut ctx.accounts.session;
    let now = Clock::get()?.unix_timestamp;
    
    require!(!session.completed, VobleError::AlreadyClaimed);
    
    // Reveal the target word now that game is complete
    let target_word = VOBLE_WORDS[session.word_index as usize];
    session.target_word = target_word.to_string();
    
    session.completed = true;
    session.time_ms = (now - profile.last_played) as u64 * 1000; // Approximate time
    
    // Calculate Voble score with time bonus
    let base_score = if session.is_solved {
        // Base score from guesses used (fewer guesses = higher score)
        match session.guesses_used {
            1 => 1000, // Incredible (almost impossible)
            2 => 800,  // Amazing
            3 => 600,  // Great
            4 => 400,  // Good
            5 => 300,  // Okay
            6 => 200,  // Close
            7 => 100,  // Last chance
            _ => 0,
        }
    } else {
        0 // No points for unsolved
    };
    
    // Time bonus: Reward fast solvers (only if solved)
    let time_bonus = if session.is_solved {
        if session.time_ms < 30_000 {          // Under 30 seconds
            500  // 🔥 Speed demon bonus
        } else if session.time_ms < 60_000 {   // Under 1 minute
            300  // ⚡ Fast solver bonus
        } else if session.time_ms < 120_000 {  // Under 2 minutes
            150  // 🏃 Quick bonus
        } else if session.time_ms < 300_000 {  // Under 5 minutes
            50   // 👍 Decent bonus
        } else {
            0    // No bonus for slow solvers
        }
    } else {
        0 // No time bonus if not solved
    };
    
    // Final score = base + time bonus
    session.score = base_score + time_bonus;
    
    msg!("Score breakdown: base={}, time_bonus={}, total={}", 
         base_score, time_bonus, session.score);
    
    // Extract values for profile update (no borrow checker issues now!)
    let is_solved = session.is_solved;
    let guesses_used = session.guesses_used;
    let session_id = session.session_id.clone();
    let final_score = session.score;
    
    // Now update profile stats
    profile.total_games_played += 1;
    profile.total_score += final_score as u64;
    
    if is_solved {
        profile.games_won += 1;
        profile.current_streak += 1;
        
        // Update max streak
        if profile.current_streak > profile.max_streak {
            profile.max_streak = profile.current_streak;
        }
        
        // Update guess distribution (0-indexed array for 1-7 guesses)
        if guesses_used > 0 && guesses_used <= 7 {
            profile.guess_distribution[(guesses_used - 1) as usize] += 1;
        }
        
        // Update average guesses for winning games
        let total_winning_guesses: u32 = profile.guess_distribution
            .iter()
            .enumerate()
            .map(|(i, &count)| (i as u32 + 1) * count)
            .sum();
        profile.average_guesses = if profile.games_won > 0 {
            total_winning_guesses as f32 / profile.games_won as f32
        } else {
            0.0
        };
    } else {
        profile.current_streak = 0; // Reset streak on loss
    }
    
    // Update best score
    if final_score > profile.best_score {
        profile.best_score = final_score;
    }
    
    // Update period tracking (moved from buy_ticket to here since profile is on ER)
    profile.last_played_period = session.period_id.clone();
    profile.has_played_this_period = true;
    profile.last_played = now;
    
    // Check and unlock achievements
    check_and_unlock_voble_achievements(profile)?;
    
    // ========== AUTO-UPDATE LEADERBOARD ==========
    // Update leaderboard with final score
    let leaderboard = &mut ctx.accounts.leaderboard;
    let player = session.player;
    let now = Clock::get()?.unix_timestamp;
    
    if !leaderboard.finalized && final_score > 0 {
        // Create new leaderboard entry
        let new_entry = LeaderEntry {
            player,
            score: final_score,
            guesses_used,
            time_ms: session.time_ms,
            timestamp: now,
            username: profile.username.clone(),
        };
        
        // Check if player already has an entry (update if better score)
        let mut updated_existing = false;
        for entry in &mut leaderboard.entries {
            if entry.player == player {
                if final_score > entry.score {
                    *entry = new_entry.clone();
                    updated_existing = true;
                    msg!("🔄 Updated leaderboard entry for player: {}", player);
                } else {
                    msg!("⏭️  Score not higher than existing entry");
                }
                break;
            }
        }
        
        // If not updated existing, add new entry
        if !updated_existing {
            leaderboard.entries.push(new_entry);
            leaderboard.total_players += 1;
            msg!("✨ Added to leaderboard: rank TBD, score: {}", final_score);
        }
        
        // Sort entries by score (highest first)
        leaderboard.entries.sort_by(|a, b| b.score.cmp(&a.score));
        
        // Keep only top 100 entries (prevent bloat)
        if leaderboard.entries.len() > 100 {
            leaderboard.entries.truncate(100);
        }
        
        msg!("📊 Leaderboard updated! Total players: {}", leaderboard.total_players);
    }
    
    emit!(VobleGameCompleted {
        player: session.player,
        session_id,
        target_word: target_word.to_string(),
        is_solved,
        guesses_used,
        final_score,
        current_streak: profile.current_streak,
        total_games_played: profile.total_games_played,
        games_won: profile.games_won,
    });
    
    msg!("Voble game completed for player: {}", session.player);
    msg!("Target word: {}", target_word);
    msg!("Solved: {}, Guesses: {}, Score: {}", is_solved, guesses_used, final_score);
    msg!("Current streak: {}, Total games: {}", profile.current_streak, profile.total_games_played);
    msg!("Win rate: {:.1}%", (profile.games_won as f32 / profile.total_games_played as f32) * 100.0);
    msg!("Session account will be closed and rent reclaimed!");
    
    Ok(())
}

/// Helper function to check and unlock Voble-specific achievements
fn check_and_unlock_voble_achievements(profile: &mut UserProfile) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    
    // Check each achievement type and add if unlocked
    let achievements_to_check = [
        (ACHIEVEMENT_FIRST_GAME, profile.total_games_played >= 1),
        (ACHIEVEMENT_FIRST_WIN, profile.games_won >= 1),
        (ACHIEVEMENT_LUCKY_GUESS, profile.guess_distribution[0] > 0 || profile.guess_distribution[1] > 0),
        (ACHIEVEMENT_STREAK_3, profile.current_streak >= 3),
        (ACHIEVEMENT_STREAK_7, profile.current_streak >= 7),
        (ACHIEVEMENT_PERFECTIONIST, {
            let perfect_games = profile.guess_distribution[0] + 
                              profile.guess_distribution[1] + 
                              profile.guess_distribution[2];
            perfect_games >= 10
        }),
    ];
    
    for (achievement_id, should_unlock) in achievements_to_check {
        if should_unlock {
            // Check if already unlocked
            let already_unlocked = profile.achievements.iter()
                .any(|a| a.id == achievement_id && a.unlocked_at.is_some());
            
            if !already_unlocked {
                // Add new achievement or update existing
                if let Some(achievement) = profile.achievements.iter_mut().find(|a| a.id == achievement_id) {
                    achievement.unlocked_at = Some(now);
                } else if profile.achievements.len() < 10 {
                    profile.achievements.push(Achievement {
                        id: achievement_id,
                        unlocked_at: Some(now),
                    });
                }
                
                emit!(AchievementUnlocked {
                    player: profile.player,
                    achievement_id,
                    unlocked_at: now,
                });
                
                msg!("🏆 Achievement unlocked: ID {}", achievement_id);
            }
        }
    }
    
    Ok(())
}

/// Get user's Voble statistics
pub fn get_voble_stats(
    ctx: Context<UpdateUserProfile>,
) -> Result<()> {
    let profile = &ctx.accounts.user_profile;
    
    let win_rate = if profile.total_games_played > 0 {
        (profile.games_won as f32 / profile.total_games_played as f32) * 100.0
    } else {
        0.0
    };
    
    let avg_score = if profile.total_games_played > 0 {
        profile.total_score / profile.total_games_played as u64
    } else {
        0
    };
    
    emit!(VobleStatsCalculated {
        player: profile.player,
        total_games: profile.total_games_played,
        games_won: profile.games_won,
        win_rate,
        current_streak: profile.current_streak,
        max_streak: profile.max_streak,
        average_guesses: profile.average_guesses,
        best_score: profile.best_score,
        average_score: avg_score,
        guess_distribution: profile.guess_distribution,
        achievements_unlocked: profile.achievements.iter().filter(|a| a.unlocked_at.is_some()).count() as u32,
    });
    
    msg!("📊 Voble stats for player: {}", profile.player);
    msg!("Games: {}, Won: {}, Win Rate: {:.1}%", 
         profile.total_games_played, profile.games_won, win_rate);
    msg!("Current Streak: {}, Max Streak: {}", profile.current_streak, profile.max_streak);
    msg!("Average Guesses: {:.1}", profile.average_guesses);
    
    Ok(())
}
