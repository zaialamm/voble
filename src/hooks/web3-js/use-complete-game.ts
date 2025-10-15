import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { vocabeeProgram } from './program'
import { getUserProfilePDA, getSessionPDA, getLeaderboardPDA } from './pdas'
import { 
  buildTransaction
} from './transaction-builder'
import { handleTransactionError } from './utils'
import { useSessionWallet } from '@magicblock-labs/gum-react-sdk'
// ER Integration
import { useERGameTransaction } from '@/hooks/mb-er'

export interface CompleteGameResult {
  success: boolean
  signature?: string
  error?: string
  finalScore?: number
  leaderboardRank?: number
}

export function useCompleteGame() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionWallet = useSessionWallet()
  
  // ER Integration
  const { completeGame: completeGameER, isTransacting: isERTransacting } = useERGameTransaction()

  const selectedWallet = wallets[0]

  const completeGame = async (periodId: string): Promise<CompleteGameResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 [useCompleteGame] Completing game for period:', periodId)
    }
    setIsLoading(true)
    setError(null)

    try {
      // ✅ SECURITY: Validate session key exists
      if (!sessionWallet?.sessionToken) {
        console.error('❌ [useCompleteGame] SECURITY: No session key found!')
        throw new Error('Session key required. Please create a session key first.')
      }
      
      // Validate inputs
      if (!selectedWallet) {
        console.error('❌ [useCompleteGame] No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!selectedWallet.address) {
        console.error('❌ [useCompleteGame] Wallet not properly connected')
        throw new Error('Wallet not properly connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        console.error('❌ [useCompleteGame] Period ID is empty')
        throw new Error('Period ID is required')
      }

      const signerPublicKey = new PublicKey(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [useCompleteGame] Creating instruction for:', {
          wallet: selectedWallet.address,
          periodId: trimmedPeriodId,
        })
      }

      // Derive required PDAs
      const [userProfilePDA] = getUserProfilePDA(signerPublicKey)
      const [sessionPDA] = getSessionPDA(signerPublicKey, trimmedPeriodId)
      const [leaderboardPDA] = getLeaderboardPDA(trimmedPeriodId, 'daily')

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useCompleteGame] Derived PDAs:', {
          userProfile: userProfilePDA.toString(),
          session: sessionPDA.toString(),
          leaderboard: leaderboardPDA.toString(),
        })
      }

      // Create the complete game instruction using Anchor
      // When using session keys, the signer should be the session key (ephemeral keypair)
      // The session_auth_or macro will validate the session token
      const actualSigner = sessionWallet?.publicKey || signerPublicKey
      
      const accounts: any = {
        userProfile: userProfilePDA,
        session: sessionPDA,
        leaderboard: leaderboardPDA,
        signer: actualSigner, // Use session key if available, otherwise main wallet
      }
      
      // Include session token if we have an active session
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
          console.log('🔑 [useCompleteGame] Using session token:', sessionTokenPDA.toString())
        }
      }
      
      const completeGameInstruction = await vocabeeProgram.methods
        .completeVobleGame(trimmedPeriodId)
        .accounts(accounts)
        .instruction()

      // Build the transaction with compute budget
      const transaction = await buildTransaction({
        instructions: [completeGameInstruction],
        feePayer: actualSigner, // Use same signer as instruction for consistency
        computeUnitLimit: 400_000, // Higher compute for leaderboard updates
        computeUnitPrice: 1,
        addComputeBudget: true,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [useCompleteGame] Transaction details:', {
          feePayer: transaction.feePayer?.toString(),
          recentBlockhash: transaction.recentBlockhash,
          instructionCount: transaction.instructions.length,
        })
      }

      // Send transaction via ER
      if (process.env.NODE_ENV === 'development') {
        console.log('✍️ [useCompleteGame] Sending transaction...')
      }
      
      const result = await completeGameER(transaction)
      
      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useCompleteGame] Game completed successfully:', result.signature)
      }

      // TODO: Parse transaction logs to get the final score and leaderboard rank
      // For now, we'll need to fetch the session and leaderboard accounts to get the result

      setIsLoading(false)
      return {
        success: true,
        signature: result.signature,
        // finalScore and leaderboardRank will be populated by fetching the updated accounts
      }
    } catch (err: any) {
      console.error('❌ [useCompleteGame] Error completing game:', err)
      
      let errorMessage = handleTransactionError(err)
      
      // Check for specific game completion errors
      if (err?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (err?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for transaction fees'
      } else if (err?.message?.includes('game already completed')) {
        errorMessage = 'Game has already been completed'
      } else if (err?.message?.includes('game not started')) {
        errorMessage = 'No active game session found. Please buy a ticket first.'
      } else if (err?.message?.includes('no guesses submitted')) {
        errorMessage = 'You must submit at least one guess before completing the game'
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
    completeGame,
    isLoading: isLoading || isERTransacting,
    error,
  }
}
