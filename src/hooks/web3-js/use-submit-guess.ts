import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { vocabeeProgram } from './program'
import { getUserProfilePDA, getSessionPDA } from './pdas'
import { 
  buildTransaction
} from './transaction-builder'
import { handleTransactionError } from './utils'
import { useSessionWallet } from '@magicblock-labs/gum-react-sdk'
// ER Integration
import { useERGameTransaction } from '@/hooks/mb-er'

export type LetterResult = 'Correct' | 'Present' | 'Absent'

export interface GuessResult {
  guess: string
  result: LetterResult[]
  isSolved: boolean
  guessesUsed: number
}

export interface SubmitGuessResult {
  success: boolean
  signature?: string
  error?: string
  guessResult?: GuessResult
}

export function useSubmitGuess() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionWallet = useSessionWallet()
  
  // ER Integration
  const { submitGuess: submitGuessER, isTransacting: isERTransacting } = useERGameTransaction()

  const selectedWallet = wallets[0]

  const submitGuess = async (
    periodId: string,
    guess: string
  ): Promise<SubmitGuessResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [useSubmitGuess] Submitting guess:', { periodId, guess })
    }
    setIsLoading(true)
    setError(null)

    try {
      // ✅ SECURITY: Validate session key exists
      if (!sessionWallet?.sessionToken) {
        console.error('❌ [useSubmitGuess] SECURITY: No session key found!')
        throw new Error('Session key required. Please create a session key first.')
      }
      
      // Validate inputs
      if (!selectedWallet) {
        console.error('❌ [useSubmitGuess] No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!guess || guess.length !== 6) {
        console.error('❌ [useSubmitGuess] Invalid guess length:', guess?.length)
        throw new Error('Guess must be exactly 6 letters')
      }

      if (!periodId || periodId.trim().length === 0) {
        console.error('❌ [useSubmitGuess] Period ID is empty')
        throw new Error('Period ID is required')
      }

      const normalizedGuess = guess.toUpperCase()
      const trimmedPeriodId = periodId.trim()
      const signerPublicKey = new PublicKey(selectedWallet.address)

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [useSubmitGuess] Creating instruction for:', {
          wallet: selectedWallet.address,
          periodId: trimmedPeriodId,
          guess: normalizedGuess,
        })
      }

      // Derive required PDAs
      const [userProfilePDA] = getUserProfilePDA(signerPublicKey)
      const [sessionPDA] = getSessionPDA(signerPublicKey, trimmedPeriodId)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useSubmitGuess] Derived PDAs:', {
          userProfile: userProfilePDA.toString(),
          session: sessionPDA.toString(),
        })
      }

      // Create the submit guess instruction using Anchor
      const accounts: {
        userProfile: PublicKey
        session: PublicKey
        signer: PublicKey
        sessionToken?: PublicKey
      } = {
        userProfile: userProfilePDA,
        session: sessionPDA,
        signer: signerPublicKey,
      }
      
      // Include session token if we have an active session
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [useSubmitGuess] Session wallet check:', {
          hasSessionWallet: !!sessionWallet,
          hasSessionToken: !!sessionWallet?.sessionToken,
          hasPublicKey: !!sessionWallet?.publicKey,
          sessionTokenValue: sessionWallet?.sessionToken,
          publicKeyValue: sessionWallet?.publicKey?.toString(),
        })
      }
      
      if (sessionWallet?.sessionToken && sessionWallet?.publicKey) {
        const { getSessionTokenPDA } = await import('./pdas')
        const { VOBLE_PROGRAM_ID } = await import('./program')
        
        // Derive session token PDA
        const [sessionTokenPDA] = getSessionTokenPDA(
          signerPublicKey, // authority (main wallet)
          VOBLE_PROGRAM_ID, // target program
          sessionWallet.publicKey // session signer (ephemeral key)
        )
        
        accounts.sessionToken = sessionTokenPDA
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 [useSubmitGuess] Using session token:', sessionTokenPDA.toString())
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [useSubmitGuess] No session token available - this will fail!')
        }
      }
      
      const submitGuessInstruction = await vocabeeProgram.methods
        .submitGuess(trimmedPeriodId, normalizedGuess)
        .accounts(accounts)
        .instruction()

      // Build transaction
      const transaction = await buildTransaction({
        instructions: [submitGuessInstruction],
        feePayer: sessionWallet?.publicKey || signerPublicKey,
        computeUnitLimit: 400_000,
        addComputeBudget: true,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [useSubmitGuess] Transaction details:', {
          feePayer: transaction.feePayer?.toString(),
          recentBlockhash: transaction.recentBlockhash,
          instructionCount: transaction.instructions.length,
          usingSessionWallet: !!sessionWallet?.sessionToken,
        })
      }
      
      // Send transaction via ER
      const result = await submitGuessER(transaction)
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [useSubmitGuess] Guess submitted via ${result.routedTo.toUpperCase()}:`, result.signature)
      }

      setIsLoading(false)
      return {
        success: true,
        signature: result.signature,
        // guessResult will be populated by fetching the updated session account
      }
    } catch (err: unknown) {
      console.error('❌ [useSubmitGuess] Error submitting guess:', err)
      
      const error = err as Error & { message?: string }
      let errorMessage = handleTransactionError(err)
      
      // Check for specific game-related errors
      if (error?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (error?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for transaction fees'
      } else if (error?.message?.includes('game already completed')) {
        errorMessage = 'Game has already been completed'
      } else if (error?.message?.includes('invalid guess')) {
        errorMessage = 'Invalid guess - must be 6 letters'
      } else if (error?.message?.includes('no active session')) {
        errorMessage = 'No active game session found. Please buy a ticket first.'
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
    submitGuess,
    isLoading: isLoading || isERTransacting,
    error,
  }
}
