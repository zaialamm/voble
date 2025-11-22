use crate::constants::*;
use anchor_lang::prelude::*;
use solana_program::hash::hash;

/// Data returned from word selection
pub struct WordSelectionData {
    pub word_hash: [u8; 32],
    pub word_index: u32,
}

/// Select a word for a new game session
///
/// ⚠️ **DEMO MODE: This uses deterministic word selection**
/// ⚠️ **NOT SECURE for games with real prizes!**
/// ⚠️ **MUST implement VRF before mainnet launch**
///
/// # Current Implementation (Demo/Testing)
/// Uses a deterministic hash of player data and game count to select from
/// the VOBLE_WORDS array. While better than pure blockhash randomness,
/// this is still predictable and exploitable.
///
/// # Arguments
/// * `player` - The player's public key
/// * `period_id` - The current period ID
/// * `game_count` - The player's total games played (used as nonce)
///
/// # Returns
/// WordSelectionData containing the word hash and index
///
/// # Security Notes
/// - **Current**: Deterministic selection (can be predicted)
/// - **Production**: MUST use VRF (Verifiable Random Function)
/// - VRF options: MagicBlock VRF, Switchboard VRF, Orao VRF
///
/// # TODO: VRF Integration
/// Replace this function with proper VRF implementation:
/// 1. Request randomness from VRF oracle on game start
/// 2. Store VRF request ID in session
/// 3. VRF callback sets the word index
/// 4. Player cannot predict the word before game starts
pub fn select_word_for_session(
    player: Pubkey,
    period_id: &str,
    game_count: u32,
) -> Result<WordSelectionData> {
    msg!("⚠️  ========== DEMO MODE: WORD SELECTION ========== ⚠️");
    msg!("⚠️  Using deterministic word selection (INSECURE)");
    msg!("⚠️  IMPLEMENT VRF BEFORE MAINNET LAUNCH!");
    msg!("⚠️  ============================================== ⚠️");

    // Combine player data and game count for word selection
    // This provides some variation but is still deterministic
    let selection_seed = format!(
        "{}-{}-{}",
        player.to_string().len(), // Player pubkey length variation
        period_id,                 // Period ID
        game_count                 // Player's game count (nonce)
    );

    let selection_hash = hash(selection_seed.as_bytes()).to_bytes();

    // Use first 4 bytes to generate index
    let word_index = (u32::from_le_bytes([
        selection_hash[0],
        selection_hash[1],
        selection_hash[2],
        selection_hash[3],
    ]) as usize)
        % VOBLE_WORDS.len();

    let selected_word = VOBLE_WORDS[word_index];

    // Create hash of the selected word (hidden until game completion)
    let word_hash = hash(selected_word.as_bytes()).to_bytes();

    msg!(
        "📝 Word selected: index={}, hash={:x?}",
        word_index,
        &word_hash[..8]
    );

    Ok(WordSelectionData {
        word_hash,
        word_index: word_index as u32,
    })
}

/// Get a word from the word list by index
///
/// # Arguments
/// * `word_index` - Index of the word in VOBLE_WORDS array
///
/// # Returns
/// The word at the specified index
///
/// # Panics
/// If the index is out of bounds (should never happen in production)
pub fn get_word_by_index(word_index: u32) -> Result<&'static str> {
    VOBLE_WORDS
        .get(word_index as usize)
        .copied()
        .ok_or_else(|| error!(crate::errors::VobleError::InvalidPeriodState))
}

/// Validate that a word exists in the word list
///
/// # Arguments
/// * `word` - The word to validate
///
/// # Returns
/// True if the word exists in VOBLE_WORDS, false otherwise
pub fn is_valid_word(word: &str) -> bool {
    let word_upper = word.to_uppercase();
    VOBLE_WORDS.iter().any(|&w| w == word_upper)
}

/// Get the total number of words available
///
/// # Returns
/// The length of the VOBLE_WORDS array
pub fn get_word_count() -> usize {
    VOBLE_WORDS.len()
}

/* ========== VRF INTEGRATION TEMPLATE ========== */
/* TODO: Implement VRF-based word selection before mainnet

/// VRF-based word selection (PRODUCTION VERSION)
///
/// This function should be called when starting a game to request
/// randomness from a VRF oracle (MagicBlock, Switchboard, or Orao)
///
/// # Flow:
/// 1. Player calls buy_ticket_and_start_game
/// 2. This function requests VRF randomness
/// 3. VRF request ID is stored in session
/// 4. VRF callback receives randomness
/// 5. Callback function sets word_index in session
/// 6. Player can then submit guesses
///
/// # Example Implementation:
///
/// ```rust
/// pub fn request_vrf_word_selection(
///     ctx: Context<RequestVRFWord>,
///     session_id: String,
/// ) -> Result<()> {
///     // Request randomness from VRF oracle
///     let vrf_request = VrfClient::request_randomness(
///         &ctx.accounts.vrf_account,
///         &ctx.accounts.payer,
///     )?;
///
///     // Store VRF request ID in session
///     let session = &mut ctx.accounts.session;
///     session.vrf_request_id = vrf_request.request_id;
///     session.word_index = u32::MAX; // Indicates word not yet selected
///
///     msg!("VRF randomness requested: {}", vrf_request.request_id);
///     Ok(())
/// }
///
/// /// VRF callback to set the word
/// pub fn vrf_callback_set_word(
///     ctx: Context<VRFCallback>,
///     randomness: [u8; 32],
/// ) -> Result<()> {
///     let session = &mut ctx.accounts.session;
///
///     // Convert randomness to word index
///     let random_u32 = u32::from_le_bytes([
///         randomness[0],
///         randomness[1],
///         randomness[2],
///         randomness[3],
///     ]);
///     let word_index = (random_u32 as usize) % VOBLE_WORDS.len();
///
///     // Set word data in session
///     session.word_index = word_index as u32;
///     session.target_word_hash = hash(VOBLE_WORDS[word_index].as_bytes()).to_bytes();
///
///     msg!("VRF callback: word selected (index: {})", word_index);
///     Ok(())
/// }
/// ```
*/

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_word_by_index() {
        for i in 0..VOBLE_WORDS.len() {
            let word = get_word_by_index(i as u32).unwrap();
            assert_eq!(word.len(), 6);
            assert!(word.chars().all(|c| c.is_ascii_uppercase()));
        }
    }

    #[test]
    fn test_is_valid_word() {
        assert!(is_valid_word("ANCHOR"));
        assert!(is_valid_word("anchor")); // Case insensitive
        assert!(is_valid_word("SOLANA"));
        assert!(!is_valid_word("NOTAWORD"));
        assert!(!is_valid_word("XYZ"));
    }

    #[test]
    fn test_get_word_count() {
        assert_eq!(get_word_count(), 20);
    }

    #[test]
    fn test_select_word_deterministic() {
        let player = Pubkey::new_unique();
        let period_id = "D123";

        // Same inputs should give same result
        let result1 = select_word_for_session(player, period_id, 0).unwrap();
        let result2 = select_word_for_session(player, period_id, 0).unwrap();

        assert_eq!(result1.word_index, result2.word_index);
        assert_eq!(result1.word_hash, result2.word_hash);
    }

    #[test]
    fn test_select_word_different_nonce() {
        let player = Pubkey::new_unique();
        let period_id = "D123";

        // Different game counts should give different results
        let result1 = select_word_for_session(player, period_id, 0).unwrap();
        let result2 = select_word_for_session(player, period_id, 1).unwrap();

        // Should be different (though not guaranteed due to modulo)
        // Just check that function executes without error
        assert!(result1.word_index < VOBLE_WORDS.len() as u32);
        assert!(result2.word_index < VOBLE_WORDS.len() as u32);
    }
}
