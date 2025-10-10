import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor'
import { Connection, PublicKey } from '@solana/web3.js'
import { connection } from './utils'
import IDL from '@/idl/idl.json'

/**
 * Program ID from the IDL
 */
export const VOBLE_PROGRAM_ID = new PublicKey(IDL.address)

/**
 * System Program ID
 */
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')

/**
 * Delegation Program ID (used for user profiles)
 */
export const DELEGATION_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh')

/**
 * Magic Context Program ID (used for user profiles)
 */
export const MAGIC_CONTEXT_PROGRAM_ID = new PublicKey('MagicContext1111111111111111111111111111111')

/**
 * Vocabee Program type (inferred from IDL)
 */
export type VocabeeProgram = Program<typeof IDL & Idl>

/**
 * Create a dummy wallet for read-only operations
 * This is needed for Anchor Provider but won't be used for signing
 */
const dummyWallet = {
  publicKey: VOBLE_PROGRAM_ID,
  signTransaction: async () => {
    throw new Error('Dummy wallet cannot sign transactions')
  },
  signAllTransactions: async () => {
    throw new Error('Dummy wallet cannot sign transactions')
  },
}

/**
 * Create Anchor provider for read-only operations
 */
export function createReadOnlyProvider(conn: Connection = connection): AnchorProvider {
  return new AnchorProvider(conn, dummyWallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  })
}

/**
 * Create the Vocabee program instance for read-only operations
 */
export function createVocabeeProgram(conn: Connection = connection): VocabeeProgram {
  const provider = createReadOnlyProvider(conn)
  return new Program(IDL as Idl, provider) as VocabeeProgram
}

/**
 * Singleton program instance for read-only operations
 */
export const vocabeeProgram = createVocabeeProgram()

/**
 * Get all instruction names from the program
 */
export function getInstructionNames(): string[] {
  return Object.keys(vocabeeProgram.methods)
}

/**
 * Get all account names from the program
 */
export function getAccountNames(): string[] {
  return Object.keys(vocabeeProgram.account)
}

/**
 * Instruction discriminators (for parsing logs)
 */
export const INSTRUCTION_DISCRIMINATORS = {
  buyTicketAndStartGame: IDL.instructions.find(ix => ix.name === 'buy_ticket_and_start_game')?.discriminator,
  submitGuess: IDL.instructions.find(ix => ix.name === 'submit_guess')?.discriminator,
  completeVocabrushGame: IDL.instructions.find(ix => ix.name === 'complete_vocabrush_game')?.discriminator,
  initializeUserProfile: IDL.instructions.find(ix => ix.name === 'initialize_user_profile')?.discriminator,
  claimDaily: IDL.instructions.find(ix => ix.name === 'claim_daily')?.discriminator,
  claimWeekly: IDL.instructions.find(ix => ix.name === 'claim_weekly')?.discriminator,
  claimMonthly: IDL.instructions.find(ix => ix.name === 'claim_monthly')?.discriminator,
} as const

/**
 * Common error codes from the program
 */
export const PROGRAM_ERROR_CODES = {
  // Add specific error codes from your program here
  INSUFFICIENT_FUNDS: 6000,
  GAME_ALREADY_COMPLETED: 6001,
  INVALID_GUESS: 6002,
  // Add more as needed
} as const

/**
 * Vault addresses (PDAs)
 */
export const VAULT_ADDRESSES = {
  daily: '3LRMZnUsdE4qY8VsUdcgBBzgcaxU5XUcDDxtYnYJLkvj',
  weekly: 'F7ZZFqSsGq2RRQxo98aZQjvzLuTASt9feT7QabkqqEur',
  monthly: '733ge7kf21YKF914TSay2gVJ8MZc8fpVpsG9M2hbiKNY',
} as const

/**
 * Helper to check if an error is a program error
 */
export function isProgramError(error: unknown): boolean {
  const err = error as { code?: number }
  return err?.code !== undefined && typeof err.code === 'number'
}

/**
 * Helper to get program error message
 */
export function getProgramErrorMessage(error: unknown): string | null {
  const err = error as { code?: number }
  if (!isProgramError(error)) return null
  
  // Map error codes to human-readable messages
  switch (err.code) {
    case PROGRAM_ERROR_CODES.INSUFFICIENT_FUNDS:
      return 'Insufficient funds for this operation'
    case PROGRAM_ERROR_CODES.GAME_ALREADY_COMPLETED:
      return 'Game has already been completed'
    case PROGRAM_ERROR_CODES.INVALID_GUESS:
      return 'Invalid guess provided'
    default:
      return `Program error: ${err.code}`
  }
}

/**
 * Log program information (useful for debugging)
 */
export function logProgramInfo(): void {
  console.log('🔧 Voble Program Info:', {
    programId: VOBLE_PROGRAM_ID.toString(),
    instructions: getInstructionNames(),
    accounts: getAccountNames(),
    idlVersion: IDL.metadata?.version || 'unknown',
  })
}
