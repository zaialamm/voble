import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { 
  vocabeeProgram, 
  SYSTEM_PROGRAM_ID
} from './program'
import { 
  getUserProfilePDA, 
  getSessionPDA, 
  getGlobalConfigPDA,
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
  getPlatformVaultPDA
} from './pdas'
import { 
  buildTransaction
} from './transaction-builder'
import { handleTransactionError } from './utils'
// ER Integration
import { useERGameTransaction } from '@/hooks/mb-er'
// ER Validator public key (Asia region)
const ER_VALIDATOR = new PublicKey('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57')

export interface BuyTicketResult {
  success: boolean
  signature?: string
  error?: string
  sessionId?: string
}

export function useBuyTicket() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ER Integration - ticket purchases typically stay on base layer
  const { buyTicket: buyTicketER, isTransacting: isERTransacting } = useERGameTransaction()

  const selectedWallet = wallets[0]

  const buyTicket = async (periodId: string): Promise<BuyTicketResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎫 [useBuyTicket] Starting ticket purchase for period:', periodId)
    }
    setIsLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!selectedWallet) {
        console.error('❌ [useBuyTicket] No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!selectedWallet.address) {
        console.error('❌ [useBuyTicket] Wallet not properly connected')
        throw new Error('Wallet not properly connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        console.error('❌ [useBuyTicket] Period ID is empty')
        throw new Error('Period ID is required')
      }

      const playerPublicKey = new PublicKey(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()

      if (process.env.NODE_ENV === 'development') {
        console.log('🎫 [useBuyTicket] Creating instruction for:', {
          wallet: selectedWallet.address,
          periodId: trimmedPeriodId,
        })
      }

      // Derive all required PDAs
      const [userProfilePDA] = getUserProfilePDA(playerPublicKey)
      const [sessionPDA] = getSessionPDA(playerPublicKey)
      const [globalConfigPDA] = getGlobalConfigPDA()
      const [dailyPrizeVaultPDA] = getDailyPrizeVaultPDA()
      const [weeklyPrizeVaultPDA] = getWeeklyPrizeVaultPDA()
      const [monthlyPrizeVaultPDA] = getMonthlyPrizeVaultPDA()
      const [platformVaultPDA] = getPlatformVaultPDA()


      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useBuyTicket] Derived PDAs:', {
          userProfile: userProfilePDA.toString(),
          session: sessionPDA.toString(),
          globalConfig: globalConfigPDA.toString(),
          dailyVault: dailyPrizeVaultPDA.toString(),
          weeklyVault: weeklyPrizeVaultPDA.toString(),
          monthlyVault: monthlyPrizeVaultPDA.toString(),
          platformVault: platformVaultPDA.toString()
        })
      }

      // Create the buy ticket and start game instruction using Anchor
      const buyTicketInstruction = await vocabeeProgram.methods
        .buyTicketAndStartGame(trimmedPeriodId)
        .accounts({
          payer: playerPublicKey,
          session: sessionPDA,
          userProfile: userProfilePDA,
          globalConfig: globalConfigPDA,
          dailyPrizeVault: dailyPrizeVaultPDA,
          weeklyPrizeVault: weeklyPrizeVaultPDA,
          monthlyPrizeVault: monthlyPrizeVaultPDA,
          platformVault: platformVaultPDA,
          systemProgram: SYSTEM_PROGRAM_ID
        })
        .instruction()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useBuyTicket] Buy ticket instruction created:', {
          programId: buyTicketInstruction.programId.toString(),
          accounts: buyTicketInstruction.keys.length,
          dataLength: buyTicketInstruction.data.length,
        })
      }

      // Create delegate session instruction to batch with buy ticket
      if (process.env.NODE_ENV === 'development') {
        console.log('🔨 [useBuyTicket] Creating delegate instruction...')
      }
      
      const delegateInstruction = await vocabeeProgram.methods
        .delegateSession()
        .accounts({
          payer: playerPublicKey,
          validator: ER_VALIDATOR,
          pda: sessionPDA,
        })
        .instruction()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useBuyTicket] Delegate instruction created')
      }

      // Build the transaction with BOTH instructions (buy + delegate)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔨 [useBuyTicket] Building transaction with buy + delegate...')
      }
      const transaction = await buildTransaction({
        instructions: [buyTicketInstruction, delegateInstruction],  // Both instructions!
        feePayer: playerPublicKey,
        computeUnitLimit: 400_000, // Increased for both instructions
        addComputeBudget: true,
      })
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useBuyTicket] Transaction built with 2 instructions')
      }

      // Use ER transaction system (will route to base layer for ticket purchases)
      if (process.env.NODE_ENV === 'development') {
        console.log('⚡ [useBuyTicket] Sending via ER system...')
      }
      const result = await buyTicketER(transaction)
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [useBuyTicket] Ticket purchased via ${result.routedTo.toUpperCase()}:`, result.signature)
      }

      // Generate session ID for tracking
      const sessionId = `voble-${selectedWallet.address}-${trimmedPeriodId}`

      setIsLoading(false)
      return {
        success: true,
        signature: result.signature,
        sessionId,
      }
    } catch (err: any) {
      console.error('❌ [useBuyTicket] Error buying ticket:', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
      })
      
      let errorMessage = handleTransactionError(err)
      
      // Check for specific game-related errors
      if (err?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (err?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance (need 0.1 SOL + fees)'
      } else if (err?.message?.includes('already exists')) {
        errorMessage = 'You already have an active game session for this period'
      }
      
      setError(errorMessage)
      setIsLoading(false)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    buyTicket,
    isLoading: isLoading || isERTransacting,
    error,
  }
}
