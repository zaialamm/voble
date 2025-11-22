import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'

import { vobleProgram } from './program'
import { handleTransactionError } from './utils'

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { erConnection } from '@/hooks/mb-er/er-connection'

import {
  getSessionPDA,
  getUserProfilePDA,
  getLeaderboardPDA,
  getCurrentPeriodIds,
} from './pdas'

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
  const tempKeypair = useTempKeypair()
  const queryClient = useQueryClient()

  const selectedWallet = wallets[0]

  const completeGame = async (periodId: string): Promise<CompleteGameResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 [useCompleteGame] Completing game for period:', periodId)
    }
    setIsLoading(true)
    setError(null)

    try {
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
      const { daily, weekly, monthly } = getCurrentPeriodIds()

      // Use temp keypair as payer for gasless ER transaction
      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [useCompleteGame] Creating instruction for:', {
          wallet: selectedWallet.address,
          periodId: trimmedPeriodId,
        })
      }

      // Derive all PDAs
      const [sessionPDA] = getSessionPDA(signerPublicKey)
      const [userProfilePDA] = getUserProfilePDA(signerPublicKey)
      const [dailyLeaderboardPDA] = getLeaderboardPDA(daily, 'daily')
      const [weeklyLeaderboardPDA] = getLeaderboardPDA(weekly, 'weekly')
      const [monthlyLeaderboardPDA] = getLeaderboardPDA(monthly, 'monthly')

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useCompleteGame] PDAs:', {
          session: sessionPDA.toString(),
          profile: userProfilePDA.toString(),
          leaderboard: dailyLeaderboardPDA.toString(),
        })
      }

      console.log('🔧 [DEBUG] Building commitAndUpdateStats transaction...')
      console.log('   Period IDs:', { daily, weekly, monthly })
      console.log('   Payer:', tempKeypair.publicKey.toString())
      console.log('   Session PDA:', sessionPDA.toString())
      console.log('   Leaderboard PDAs:', {
        daily: dailyLeaderboardPDA.toString(),
        weekly: weeklyLeaderboardPDA.toString(),
        monthly: monthlyLeaderboardPDA.toString(),
      })
      console.log('   UserProfile PDA:', userProfilePDA.toString())
      console.log('   Program ID:', vobleProgram.programId.toString())

      const commitAndUpdateStats = await vobleProgram.methods
        .commitAndUpdateStats(daily, weekly, monthly)
        .accounts({
          payer: tempKeypair.publicKey,
          player: signerPublicKey,
          session: sessionPDA,
          dailyLeaderboard: dailyLeaderboardPDA,
          weeklyLeaderboard: weeklyLeaderboardPDA,
          monthlyLeaderboard: monthlyLeaderboardPDA,
          userProfile: userProfilePDA,
          programId: vobleProgram.programId,  // Add this
        })
        .transaction()

      console.log('📦 [DEBUG] Transaction built successfully')
      console.log('   Instructions:', commitAndUpdateStats.instructions.length)
      console.log('   Accounts in first instruction:', commitAndUpdateStats.instructions[0]?.keys.length)

      // Log all accounts being passed
      commitAndUpdateStats.instructions[0]?.keys.forEach((key, idx) => {
        console.log(`   Account ${idx}:`, key.pubkey.toString(),
          `(writable: ${key.isWritable}, signer: ${key.isSigner})`)
      })

      console.log('📤 [DEBUG] Sending transaction to ER...')

      const signature = await sendAndConfirmTransaction(erConnection, commitAndUpdateStats, [tempKeypair],
        { skipPreflight: true, commitment: 'confirmed' }
      );

      console.log('✅ Commit and update stats:', signature)

      /*
      // Add this - Undelegate session after stats are updated
      console.log('🔄 [DEBUG] Undelegating session...')

      const undelegateSession = await vobleProgram.methods
        .undelegateSession()
        .accounts({
          payer: tempKeypair.publicKey,
          player: signerPublicKey,
          session: sessionPDA,
        })
        .transaction()

      const undelegateSignature = await sendAndConfirmTransaction(erConnection, undelegateSession, [tempKeypair],
        { skipPreflight: true, commitment: 'confirmed' }
      );

      console.log('✅ Session undelegated:', undelegateSignature)
      */

      // Invalidate profile cache to refresh stats
      await queryClient.invalidateQueries({
        queryKey: ['userProfile', selectedWallet.address]
      })

      if (!signature) {
        throw new Error('Transaction failed')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useCompleteGame] Commit and update stats successfully:', signature)
        console.log('   Leaderboard and profile will be updated automatically')
      }

      setIsLoading(false)
      return {
        success: true,
        signature: signature,
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
    isLoading: isLoading,
    error,
  }
}
