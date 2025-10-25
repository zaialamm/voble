import { 
  Transaction, 
  PublicKey, 
  TransactionInstruction,
  Connection,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram
} from '@solana/web3.js'

import type { ConnectedStandardSolanaWallet } from '@privy-io/react-auth/solana'
import { connection, handleTransactionError } from './utils'

/**
 * Transaction build options
 */
export interface TransactionBuildOptions {
  /** Instructions to include in the transaction */
  instructions: TransactionInstruction[]
  /** Fee payer public key */
  feePayer?: PublicKey
  /** Connection to use (defaults to singleton) */
  connection?: Connection
  /** Compute unit limit (defaults to 400,000) */
  computeUnitLimit?: number
  /** Compute unit price in micro-lamports (defaults to 1) */
  computeUnitPrice?: number
  /** Whether to add compute budget instructions */
  addComputeBudget?: boolean
}

/**
 * Privy transaction send options
 */
export interface PrivyTransactionOptions {
  /** Privy wallet to use for signing */
  wallet: ConnectedStandardSolanaWallet
  /** Transaction to send */
  transaction: Transaction
  /** Connection to use */
  connection?: Connection
  /** Send options */
  options?: {
    skipPreflight?: boolean
    preflightCommitment?: 'processed' | 'confirmed' | 'finalized'
    maxRetries?: number
  }
}

/**
 * Session wallet transaction options
 */
export interface SessionWalletOptions {
  /** Session wallet instance */
  sessionWallet: any // MagicBlock session wallet type
  /** Transaction to send */
  transaction: Transaction
  /** Connection to use */
  connection?: Connection
}

/**
 * Transaction result
 */
export interface TransactionResult {
  success: boolean
  signature?: string
  error?: string
}

/**
 * Build a transaction with compute budget instructions
 */
export async function buildTransaction(options: TransactionBuildOptions): Promise<Transaction> {
  const {
    instructions,
    feePayer,
    connection: conn = connection,
    computeUnitLimit = 400_000,
    computeUnitPrice = 1,
    addComputeBudget = true,
  } = options

  // Create transaction
  const transaction = new Transaction()

  // Add compute budget instructions if requested
  if (addComputeBudget) {
    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
    const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice })
    
    transaction.add(computeLimitIx, computePriceIx)
  }

  // Add main instructions
  transaction.add(...instructions)

  // Set fee payer and recent blockhash
  if (feePayer) {
    transaction.feePayer = feePayer  
  }
  const { blockhash } = await conn.getLatestBlockhash('confirmed')
  transaction.recentBlockhash = blockhash

  return transaction
}

/**
 * Send transaction using Privy wallet (with popup)
 */
export async function sendTransactionWithPrivy(options: PrivyTransactionOptions): Promise<TransactionResult> {
  const { wallet, transaction, options: sendOptions } = options

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 [TransactionBuilder] Sending transaction with Privy wallet...')
    }
    
    // Serialize transaction for Privy
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    // Send using Privy's signAndSendTransaction (following docs pattern)
    const result = await wallet.signAndSendTransaction!({
      chain: 'solana:devnet',
      transaction: serializedTransaction,
      ...sendOptions,
    })

    const signature = typeof result === 'string' ? result : result.signature.toString()

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [TransactionBuilder] Transaction sent successfully:', signature)
    }
    
    return {
      success: true,
      signature,
    }
  } catch (error: any) {
    console.error('❌ [TransactionBuilder] Transaction failed:', error)
    return {
      success: false,
      error: handleTransactionError(error),
    }
  }
}

/**
 * Send transaction using session wallet (no popup)
 */
export async function sendTransactionWithSessionWallet(options: SessionWalletOptions): Promise<TransactionResult> {
  const { sessionWallet, transaction, connection: conn = connection } = options

  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 [TransactionBuilder] Sending transaction with session wallet (no popup)...')
    }
    
    if (!sessionWallet?.signAndSendTransaction) {
      throw new Error('Session wallet does not support signAndSendTransaction')
    }

    // Session wallet expects a regular Transaction object
    const signatures = await sessionWallet.signAndSendTransaction(transaction, conn)
    const signature = Array.isArray(signatures) ? signatures[0] : signatures

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [TransactionBuilder] Session transaction sent successfully:', signature)
    }
    
    return {
      success: true,
      signature,
    }
  } catch (error: any) {
    console.error('❌ [TransactionBuilder] Session transaction failed:', error)
    return {
      success: false,
      error: handleTransactionError(error),
    }
  }
}

/**
 * Smart transaction sender that chooses between Privy and session wallet
 */
export async function sendTransaction(options: {
  /** Privy wallet */
  privyWallet: ConnectedStandardSolanaWallet
  /** Session wallet (optional) */
  sessionWallet?: any
  /** Transaction to send */
  transaction: Transaction
  /** Connection to use */
  connection?: Connection
  /** Prefer session wallet if available */
  preferSessionWallet?: boolean
  /** Send options for Privy wallet */
  privyOptions?: PrivyTransactionOptions['options']
}): Promise<TransactionResult> {
  const {
    privyWallet,
    sessionWallet,
    transaction,
    connection: conn = connection,
    preferSessionWallet = true,
    privyOptions,
  } = options

  // Use session wallet if available and preferred
  if (preferSessionWallet && sessionWallet?.signAndSendTransaction) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 [TransactionBuilder] Using session wallet (no popup)')
    }
    return sendTransactionWithSessionWallet({
      sessionWallet,
      transaction,
      connection: conn,
    })
  }

  // Fall back to Privy wallet
  if (process.env.NODE_ENV === 'development') {
    console.log('👛 [TransactionBuilder] Using Privy wallet (popup)')
  }
  return sendTransactionWithPrivy({
    wallet: privyWallet,
    transaction,
    connection: conn,
    options: privyOptions,
  })
}

/**
 * Create a versioned transaction (V0)
 */
export async function buildVersionedTransaction(options: TransactionBuildOptions): Promise<VersionedTransaction> {
  const {
    instructions,
    feePayer,
    connection: conn = connection,
    computeUnitLimit = 400_000,
    computeUnitPrice = 1,
    addComputeBudget = true,
  } = options

  // Validate feePayer
  if (!feePayer) {
    throw new Error('feePayer is required for versioned transactions')
  }

  // Prepare instructions
  const allInstructions: TransactionInstruction[] = []

  // Add compute budget instructions if requested
  if (addComputeBudget) {
    const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
    const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computeUnitPrice })
    
    allInstructions.push(computeLimitIx, computePriceIx)
  }

  // Add main instructions
  allInstructions.push(...instructions)

  // Get recent blockhash
  const { blockhash } = await conn.getLatestBlockhash('confirmed')

  // Create transaction message
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message()

  return new VersionedTransaction(message)
}

/**
 * Estimate transaction size
 */
export function estimateTransactionSize(transaction: Transaction): number {
  try {
    return transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).length
  } catch {
    return 0
  }
}

/**
 * Check if transaction size is within limits
 */
export function isTransactionSizeValid(transaction: Transaction, maxSize = 1232): boolean {
  const size = estimateTransactionSize(transaction)
  return size > 0 && size <= maxSize
}

/**
 * Log transaction details for debugging
 */
export function logTransactionDetails(transaction: Transaction, name = 'Transaction'): void {
  console.log(`🔍 [${name}] Details:`, {
    feePayer: transaction.feePayer?.toString(),
    recentBlockhash: transaction.recentBlockhash,
    instructionCount: transaction.instructions.length,
    estimatedSize: estimateTransactionSize(transaction),
    instructions: transaction.instructions.map((ix, i) => ({
      index: i,
      programId: ix.programId.toString(),
      accountCount: ix.keys.length,
      dataLength: ix.data.length,
    })),
  })
}

/**
 * Retry transaction with exponential backoff
 */
export async function retryTransaction<T>(
  transactionFn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 [TransactionBuilder] Attempt ${attempt}/${maxRetries}`)
      }
      return await transactionFn()
    } catch (error) {
      lastError = error
      console.error(`❌ [TransactionBuilder] Attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1)
        if (process.env.NODE_ENV === 'development') {
          console.log(`⏳ [TransactionBuilder] Retrying in ${delay}ms...`)
        }
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}
