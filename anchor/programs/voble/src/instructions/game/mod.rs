// Main game instruction modules
pub mod start_game;
pub mod submit_guess;
pub mod update_player_stats;
pub mod record_keystroke;
pub mod reset_session;

// Helper modules
pub mod achievements;
pub mod scoring;
pub mod word_selection;

// Re-export all public functions for easy access
pub use start_game::*;
pub use submit_guess::*;
pub use update_player_stats::*;
pub use record_keystroke::*;
pub use reset_session::*;

// Re-export helper functions that might be needed externally
pub use achievements::{check_and_unlock_achievements, get_unlocked_count};
pub use scoring::{calculate_final_score, evaluate_guess};
pub use word_selection::{get_word_by_index, select_word_for_session};
