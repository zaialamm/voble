use crate::constants::*;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;

/// Check and unlock achievements for a user profile
///
/// This function checks if the player has met the criteria for any
/// Voble-specific achievements and unlocks them if they haven't been
/// unlocked yet.
///
/// # Arguments
/// * `profile` - Mutable reference to the user's profile
/// * `timestamp` - Current timestamp for recording unlock time
///
/// # Achievements Checked
/// - **First Game**: Played at least 1 game
/// - **First Win**: Won at least 1 game
/// - **Lucky Guess**: Won in 1-2 guesses
/// - **3-Game Streak**: Current streak >= 3
/// - **7-Game Streak**: Current streak >= 7
/// - **Perfectionist**: Won 10+ games with 3 or fewer guesses
///
/// # Events
/// Emits `AchievementUnlocked` event for each newly unlocked achievement
///
/// # Notes
/// - Maximum 10 achievements can be stored per profile
/// - Achievements are only added once (idempotent)
/// - Already unlocked achievements are skipped
pub fn check_and_unlock_achievements(
    profile: &mut UserProfile,
    timestamp: i64,
) -> Result<()> {
    // Define achievement conditions
    let achievements_to_check = [
        (
            ACHIEVEMENT_FIRST_GAME,
            profile.total_games_played >= 1,
            "First Game",
        ),
        (
            ACHIEVEMENT_FIRST_WIN,
            profile.games_won >= 1,
            "First Win",
        ),
        (
            ACHIEVEMENT_LUCKY_GUESS,
            profile.guess_distribution[0] > 0 || profile.guess_distribution[1] > 0,
            "Lucky Guess (1-2 guesses)",
        ),
        (
            ACHIEVEMENT_STREAK_3,
            profile.current_streak >= 3,
            "3-Game Streak",
        ),
        (
            ACHIEVEMENT_STREAK_7,
            profile.current_streak >= 7,
            "7-Game Streak",
        ),
        (
            ACHIEVEMENT_PERFECTIONIST,
            {
                let perfect_games = profile.guess_distribution[0]
                    + profile.guess_distribution[1]
                    + profile.guess_distribution[2];
                perfect_games >= 10
            },
            "Perfectionist (10+ games with ≤3 guesses)",
        ),
    ];

    // Check each achievement
    for (achievement_id, should_unlock, description) in achievements_to_check {
        if should_unlock {
            // Check if already unlocked
            let already_unlocked = profile
                .achievements
                .iter()
                .any(|a| a.id == achievement_id && a.unlocked_at.is_some());

            if !already_unlocked {
                // Try to unlock the achievement
                unlock_achievement(profile, achievement_id, timestamp, description)?;
            }
        }
    }

    Ok(())
}

/// Unlock a specific achievement for a profile
///
/// # Arguments
/// * `profile` - Mutable reference to the user's profile
/// * `achievement_id` - ID of the achievement to unlock
/// * `timestamp` - Current timestamp
/// * `description` - Description for logging
///
/// # Notes
/// - If achievement exists but not unlocked, updates unlock time
/// - If achievement doesn't exist and space available, adds it
/// - If no space available (10 max), skips without error
fn unlock_achievement(
    profile: &mut UserProfile,
    achievement_id: u8,
    timestamp: i64,
    description: &str,
) -> Result<()> {
    // Check if achievement already exists in the list
    if let Some(achievement) = profile
        .achievements
        .iter_mut()
        .find(|a| a.id == achievement_id)
    {
        // Update existing achievement
        achievement.unlocked_at = Some(timestamp);
    } else if profile.achievements.len() < MAX_ACHIEVEMENTS {
        // Add new achievement if space available
        profile.achievements.push(Achievement {
            id: achievement_id,
            unlocked_at: Some(timestamp),
        });
    } else {
        // Max achievements reached - log warning but don't error
        msg!(
            "⚠️  Cannot unlock achievement {}: Max achievements ({}) reached",
            achievement_id,
            MAX_ACHIEVEMENTS
        );
        return Ok(());
    }

    // Emit event for newly unlocked achievement
    emit!(AchievementUnlocked {
        player: profile.player,
        achievement_id,
        unlocked_at: timestamp,
    });

    msg!("🏆 Achievement unlocked: {} (ID: {})", description, achievement_id);

    Ok(())
}

/// Get the total number of unlocked achievements for a profile
///
/// # Arguments
/// * `profile` - Reference to the user's profile
///
/// # Returns
/// Count of unlocked achievements
pub fn get_unlocked_count(profile: &UserProfile) -> u32 {
    profile
        .achievements
        .iter()
        .filter(|a| a.unlocked_at.is_some())
        .count() as u32
}

/// Check if a specific achievement is unlocked
///
/// # Arguments
/// * `profile` - Reference to the user's profile
/// * `achievement_id` - ID of the achievement to check
///
/// # Returns
/// True if the achievement is unlocked, false otherwise
pub fn is_achievement_unlocked(profile: &UserProfile, achievement_id: u8) -> bool {
    profile
        .achievements
        .iter()
        .any(|a| a.id == achievement_id && a.unlocked_at.is_some())
}

/// Get all achievement IDs and their unlock status
///
/// # Arguments
/// * `profile` - Reference to the user's profile
///
/// # Returns
/// Vector of tuples (achievement_id, is_unlocked)
pub fn get_achievement_status(profile: &UserProfile) -> Vec<(u8, bool)> {
    // All possible achievement IDs
    let all_achievements = [
        ACHIEVEMENT_FIRST_GAME,
        ACHIEVEMENT_FIRST_WIN,
        ACHIEVEMENT_LUCKY_GUESS,
        ACHIEVEMENT_STREAK_3,
        ACHIEVEMENT_STREAK_7,
        ACHIEVEMENT_PERFECTIONIST,
    ];

    all_achievements
        .iter()
        .map(|&id| (id, is_achievement_unlocked(profile, id)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_profile() -> UserProfile {
        UserProfile {
            player: Pubkey::new_unique(),
            username: "TestPlayer".to_string(),
            total_games_played: 0,
            games_won: 0,
            current_streak: 0,
            max_streak: 0,
            total_score: 0,
            best_score: 0,
            average_guesses: 0.0,
            guess_distribution: [0; 7],
            last_played_period: String::new(),
            last_paid_period: String::new(),
            has_played_this_period: false,
            achievements: Vec::new(),
            created_at: 0,
            last_played: 0,
        }
    }

    #[test]
    fn test_unlock_first_game_achievement() {
        let mut profile = create_test_profile();
        profile.total_games_played = 1;

        check_and_unlock_achievements(&mut profile, 1000).unwrap();

        assert_eq!(profile.achievements.len(), 1);
        assert_eq!(profile.achievements[0].id, ACHIEVEMENT_FIRST_GAME);
        assert_eq!(profile.achievements[0].unlocked_at, Some(1000));
    }

    #[test]
    fn test_unlock_streak_achievement() {
        let mut profile = create_test_profile();
        profile.current_streak = 3;
        profile.total_games_played = 3;

        check_and_unlock_achievements(&mut profile, 2000).unwrap();

        // Should unlock both FIRST_GAME and STREAK_3
        assert!(profile.achievements.len() >= 2);
        assert!(is_achievement_unlocked(&profile, ACHIEVEMENT_FIRST_GAME));
        assert!(is_achievement_unlocked(&profile, ACHIEVEMENT_STREAK_3));
    }

    #[test]
    fn test_get_unlocked_count() {
        let mut profile = create_test_profile();
        assert_eq!(get_unlocked_count(&profile), 0);

        profile.achievements.push(Achievement {
            id: ACHIEVEMENT_FIRST_GAME,
            unlocked_at: Some(1000),
        });
        assert_eq!(get_unlocked_count(&profile), 1);

        profile.achievements.push(Achievement {
            id: ACHIEVEMENT_FIRST_WIN,
            unlocked_at: None, // Not unlocked yet
        });
        assert_eq!(get_unlocked_count(&profile), 1); // Still 1
    }

    #[test]
    fn test_is_achievement_unlocked() {
        let mut profile = create_test_profile();
        profile.achievements.push(Achievement {
            id: ACHIEVEMENT_FIRST_GAME,
            unlocked_at: Some(1000),
        });

        assert!(is_achievement_unlocked(&profile, ACHIEVEMENT_FIRST_GAME));
        assert!(!is_achievement_unlocked(&profile, ACHIEVEMENT_FIRST_WIN));
    }

    #[test]
    fn test_max_achievements_limit() {
        let mut profile = create_test_profile();

        // Fill up achievements
        for i in 0..MAX_ACHIEVEMENTS {
            profile.achievements.push(Achievement {
                id: i as u8,
                unlocked_at: Some(1000),
            });
        }

        // Try to unlock one more
        let result = unlock_achievement(&mut profile, 99, 2000, "Extra Achievement");

        // Should succeed but not add the achievement
        assert!(result.is_ok());
        assert_eq!(profile.achievements.len(), MAX_ACHIEVEMENTS);
    }
}
