/**
 * web3.js + Anchor Hooks for Voble Game
 * 
 * Complete migration from Solana Kit to native web3.js + Anchor
 * Provides better performance, type safety, and session wallet support
 */

// Core utilities
export * from './utils'
export * from './program'
export * from './pdas'
export * from './transaction-builder'

// Transaction hooks (write operations)
export { useInitializeProfile } from './use-initialize-profile'
export { useBuyTicket } from './use-buy-ticket'
export { useSubmitGuess } from './use-submit-guess'
export { useCompleteGame } from './use-complete-game'
export { useDelegateSession } from './use-delegate-session'

// Data fetching hooks (read operations)
export { useFetchSession } from './use-fetch-session'
export { 
  useUserProfile, 
  useCurrentUserProfile, 
  useProfileExists 
} from './use-user-profile'
export { 
  useVaultBalances, 
  useVaultBalance, 
  useTotalPrizePool 
} from './use-vault-balances'

// Re-export types for convenience
export type { 
  InitializeProfileResult
} from './use-initialize-profile'

export type { 
  BuyTicketResult
} from './use-buy-ticket'

export type {
  DelegateSessionResult 
} from './use-delegate-session'


export type { 
  SubmitGuessResult
} from './use-submit-guess'

export type { 
  CompleteGameResult
} from './use-complete-game'

export type {
  SessionData,
  GuessData,
  FetchSessionResult,
  LetterResult
} from './use-fetch-session'

export type {
  UserProfileData,
  Achievement,
  UserProfileResult
} from './use-user-profile'

export type {
  VaultBalance,
  VaultBalances,
  VaultBalancesResult
} from './use-vault-balances'

export type {
  TransactionResult,
  TransactionBuildOptions
} from './transaction-builder'

// Session types now provided by MagicBlock SDK
