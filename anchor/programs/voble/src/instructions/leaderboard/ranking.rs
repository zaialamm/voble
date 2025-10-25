use crate::state::{LeaderEntry, PeriodLeaderboard};
use anchor_lang::prelude::*;
use std::cmp::Ordering;

/// Compare two leaderboard entries for ranking
///
/// This function implements the ranking logic for the leaderboard.
/// Players are ranked based on multiple criteria in this order:
///
/// 1. **Score** (Primary) - Higher score is better
/// 2. **Time** (Tie-breaker) - Faster completion is better (lower time_ms)
/// 3. **Guesses** (Secondary tie-breaker) - Fewer guesses is better
///
/// # Arguments
/// * `a` - First entry to compare
/// * `b` - Second entry to compare
///
/// # Returns
/// `Ordering` indicating which entry should rank higher:
/// - `Ordering::Greater` - Entry A ranks higher than B
/// - `Ordering::Less` - Entry B ranks higher than A
/// - `Ordering::Equal` - Entries are tied (same rank)
///
/// # Example
/// ```
/// let entry_a = LeaderEntry { score: 1000, time_ms: 30000, guesses_used: 3, ... };
/// let entry_b = LeaderEntry { score: 800, time_ms: 20000, guesses_used: 2, ... };
///
/// // entry_a ranks higher (better score)
/// assert_eq!(compare_entries(&entry_a, &entry_b), Ordering::Greater);
/// ```
pub fn compare_entries(a: &LeaderEntry, b: &LeaderEntry) -> Ordering {
    // Primary: Compare by score (higher is better)
    match b.score.cmp(&a.score) {
        Ordering::Equal => {
            // Tie-breaker 1: Compare by time (lower is better - faster completion)
            match a.time_ms.cmp(&b.time_ms) {
                Ordering::Equal => {
                    // Tie-breaker 2: Compare by guesses (lower is better - more efficient)
                    a.guesses_used.cmp(&b.guesses_used)
                }
                other => other,
            }
        }
        other => other,
    }
}

/// Sort leaderboard entries by rank (best to worst)
///
/// This function sorts the leaderboard entries in-place using the
/// ranking criteria defined in `compare_entries()`.
///
/// # Arguments
/// * `leaderboard` - Mutable reference to the leaderboard to sort
///
/// # Notes
/// - Sorts in descending order (best player first)
/// - Uses stable sort to preserve order for truly equal entries
/// - Should be called after adding/updating entries
pub fn sort_leaderboard(leaderboard: &mut PeriodLeaderboard) {
    leaderboard.entries.sort_by(|a, b| compare_entries(a, b));
}

/// Get a player's current rank on the leaderboard
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
/// * `player` - The player's public key
///
/// # Returns
/// `Some(rank)` if player is on leaderboard (1-based rank)
/// `None` if player is not on leaderboard
///
/// # Example
/// ```
/// let rank = get_player_rank(&leaderboard, player_pubkey);
/// match rank {
///     Some(r) => msg!("Player rank: #{}", r),
///     None => msg!("Player not on leaderboard"),
/// }
/// ```
pub fn get_player_rank(leaderboard: &PeriodLeaderboard, player: Pubkey) -> Option<u8> {
    leaderboard
        .entries
        .iter()
        .position(|entry| entry.player == player)
        .map(|pos| (pos + 1) as u8) // Convert 0-based index to 1-based rank
}

/// Check if a player is in the top N positions
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
/// * `player` - The player's public key
/// * `n` - Number of top positions to check (e.g., 3 for top 3)
///
/// # Returns
/// `true` if player is in top N, `false` otherwise
///
/// # Example
/// ```
/// // Check if player is in top 3 (will win prizes)
/// if is_in_top_n(&leaderboard, player, 3) {
///     msg!("Player will receive a prize!");
/// }
/// ```
pub fn is_in_top_n(leaderboard: &PeriodLeaderboard, player: Pubkey, n: usize) -> bool {
    if let Some(rank) = get_player_rank(leaderboard, player) {
        rank as usize <= n
    } else {
        false
    }
}

/// Get the top N entries from the leaderboard
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
/// * `n` - Number of top entries to retrieve
///
/// # Returns
/// Vector of references to the top N entries (or fewer if leaderboard is smaller)
///
/// # Example
/// ```
/// let top_3 = get_top_n_entries(&leaderboard, 3);
/// for (i, entry) in top_3.iter().enumerate() {
///     msg!("Rank #{}: {} - {}", i + 1, entry.username, entry.score);
/// }
/// ```
pub fn get_top_n_entries(leaderboard: &PeriodLeaderboard, n: usize) -> Vec<&LeaderEntry> {
    leaderboard.entries.iter().take(n).collect()
}

/// Check if a new score would make it to the top N
///
/// This is useful for determining if a player's game should trigger
/// special events or notifications (e.g., "You made it to top 10!")
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
/// * `score` - The score to check
/// * `n` - Number of top positions (e.g., 10 for top 10)
///
/// # Returns
/// `true` if the score would rank in top N, `false` otherwise
///
/// # Example
/// ```
/// if would_make_top_n(&leaderboard, player_score, 10) {
///     msg!("🎉 Congratulations! You made it to the top 10!");
/// }
/// ```
pub fn would_make_top_n(leaderboard: &PeriodLeaderboard, score: u32, n: usize) -> bool {
    // If leaderboard has fewer than N entries, new score automatically qualifies
    if leaderboard.entries.len() < n {
        return true;
    }

    // Check if score is better than the Nth entry (last qualifying position)
    if let Some(nth_entry) = leaderboard.entries.get(n - 1) {
        score > nth_entry.score
    } else {
        true // Leaderboard doesn't have N entries yet
    }
}

/// Get the score needed to reach the top N
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
/// * `n` - Number of top positions
///
/// # Returns
/// `Some(score)` if leaderboard has N entries (minimum score needed)
/// `None` if leaderboard has fewer than N entries (any score qualifies)
///
/// # Example
/// ```
/// match get_score_threshold_for_top_n(&leaderboard, 10) {
///     Some(score) => msg!("Score needed for top 10: {}", score),
///     None => msg!("Top 10 not full yet - any score qualifies!"),
/// }
/// ```
pub fn get_score_threshold_for_top_n(leaderboard: &PeriodLeaderboard, n: usize) -> Option<u32> {
    if leaderboard.entries.len() >= n {
        leaderboard.entries.get(n - 1).map(|entry| entry.score)
    } else {
        None // Leaderboard not full yet
    }
}

/// Calculate rank change for a player after a score update
///
/// This is useful for showing players "You moved up 5 ranks!"
///
/// # Arguments
/// * `old_rank` - Player's previous rank (1-based)
/// * `new_rank` - Player's new rank after update (1-based)
///
/// # Returns
/// Signed integer indicating rank change:
/// - Positive: Moved up (improved rank)
/// - Negative: Moved down (worse rank)
/// - Zero: No change
///
/// # Example
/// ```
/// let change = calculate_rank_change(Some(10), Some(5));
/// if change > 0 {
///     msg!("🎉 You moved up {} ranks!", change);
/// }
/// ```
pub fn calculate_rank_change(old_rank: Option<u8>, new_rank: Option<u8>) -> i16 {
    match (old_rank, new_rank) {
        (Some(old), Some(new)) => {
            // Rank goes down in number as you improve (1 is better than 2)
            // So moving from 10 to 5 is +5 improvement
            old as i16 - new as i16
        }
        (None, Some(_)) => {
            // Player joined leaderboard (improvement)
            1 // Treat as +1 improvement
        }
        (Some(_), None) => {
            // Player fell off leaderboard (worse)
            -1 // Treat as -1 decline
        }
        (None, None) => {
            // Player not on leaderboard before or after
            0
        }
    }
}

/// Get leaderboard statistics summary
///
/// # Arguments
/// * `leaderboard` - Reference to the leaderboard
///
/// # Returns
/// Tuple of (total_entries, avg_score, highest_score, lowest_score)
pub fn get_leaderboard_stats(leaderboard: &PeriodLeaderboard) -> (usize, u32, u32, u32) {
    let total_entries = leaderboard.entries.len();

    if total_entries == 0 {
        return (0, 0, 0, 0);
    }

    let total_score: u32 = leaderboard.entries.iter().map(|e| e.score).sum();
    let avg_score = total_score / total_entries as u32;

    let highest_score = leaderboard.entries.first().map(|e| e.score).unwrap_or(0);

    let lowest_score = leaderboard.entries.last().map(|e| e.score).unwrap_or(0);

    (total_entries, avg_score, highest_score, lowest_score)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_entry(score: u32, time_ms: u64, guesses_used: u8) -> LeaderEntry {
        LeaderEntry {
            player: Pubkey::new_unique(),
            score,
            guesses_used,
            time_ms,
            timestamp: 0,
            username: "Test".to_string(),
        }
    }

    #[test]
    fn test_compare_entries_by_score() {
        let high_score = create_test_entry(1000, 60000, 5);
        let low_score = create_test_entry(500, 60000, 5);

        assert_eq!(compare_entries(&high_score, &low_score), Ordering::Greater);
    }

    #[test]
    fn test_compare_entries_by_time_tiebreaker() {
        let fast = create_test_entry(1000, 30000, 5);
        let slow = create_test_entry(1000, 60000, 5);

        // Same score, but fast completion is better
        assert_eq!(compare_entries(&fast, &slow), Ordering::Greater);
    }

    #[test]
    fn test_compare_entries_by_guesses_tiebreaker() {
        let efficient = create_test_entry(1000, 30000, 3);
        let inefficient = create_test_entry(1000, 30000, 5);

        // Same score and time, but fewer guesses is better
        assert_eq!(compare_entries(&efficient, &inefficient), Ordering::Greater);
    }

    #[test]
    fn test_would_make_top_n() {
        let mut leaderboard = PeriodLeaderboard {
            period_id: "D123".to_string(),
            period_type: crate::state::PeriodType::Daily,
            entries: vec![
                create_test_entry(1000, 30000, 3),
                create_test_entry(800, 40000, 4),
                create_test_entry(600, 50000, 5),
            ],
            total_players: 3,
            prize_pool: 0,
            finalized: false,
            created_at: 0,
            finalized_at: None,
        };

        // Score 700 would make top 3
        assert!(would_make_top_n(&leaderboard, 700, 3));

        // Score 500 would NOT make top 3
        assert!(!would_make_top_n(&leaderboard, 500, 3));
    }

    #[test]
    fn test_calculate_rank_change() {
        // Improved from rank 10 to rank 5
        assert_eq!(calculate_rank_change(Some(10), Some(5)), 5);

        // Declined from rank 5 to rank 10
        assert_eq!(calculate_rank_change(Some(5), Some(10)), -5);

        // No change
        assert_eq!(calculate_rank_change(Some(5), Some(5)), 0);

        // Joined leaderboard
        assert_eq!(calculate_rank_change(None, Some(5)), 1);

        // Fell off leaderboard
        assert_eq!(calculate_rank_change(Some(10), None), -1);
    }
}
