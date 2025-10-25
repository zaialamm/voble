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