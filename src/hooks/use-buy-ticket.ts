import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Transaction, Connection, sendAndConfirmTransaction } from '@solana/web3.js'
import bs58 from 'bs58';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { erConnection } from '@/hooks/mb-er/er-connection'

import {
  vobleProgram,
  SYSTEM_PROGRAM_ID,
  createVobleProgram,
} from './program'
import {
  getUserProfilePDA,
  getSessionPDA,
  getGlobalConfigPDA,
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
  getPlatformVaultPDA,
  getLuckyDrawVaultPDA
} from './pdas'
import { handleTransactionError } from './utils'

export interface BuyTicketResult {
  success: boolean
  signature?: string
  error?: string
  sessionId?: string
}

export function useBuyTicket() {
  const { wallets } = useConnectedStandardWallets()
  const tempKeypair = useTempKeypair()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


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

      // Derive all required PDAs
      const [userProfilePDA] = getUserProfilePDA(playerPublicKey)
      const [sessionPDA] = getSessionPDA(playerPublicKey)
      const [globalConfigPDA] = getGlobalConfigPDA()
      const [dailyPrizeVaultPDA] = getDailyPrizeVaultPDA()
      const [weeklyPrizeVaultPDA] = getWeeklyPrizeVaultPDA()
      const [monthlyPrizeVaultPDA] = getMonthlyPrizeVaultPDA()
      const [platformVaultPDA] = getPlatformVaultPDA()
      const [luckyDrawVaultPDA] = getLuckyDrawVaultPDA()

      // === Buy Ticket === \\

      // Create buy ticket instruction
      const buyTicketInstruction = await vobleProgram.methods
        .buyTicketAndStartGame(trimmedPeriodId)
        .accounts({
          payer: playerPublicKey,
          userProfile: userProfilePDA, // Updated to use userProfile for payment tracking
          globalConfig: globalConfigPDA,
          dailyPrizeVault: dailyPrizeVaultPDA,
          weeklyPrizeVault: weeklyPrizeVaultPDA,
          monthlyPrizeVault: monthlyPrizeVaultPDA,
          platformVault: platformVaultPDA,
          luckyDrawVault: luckyDrawVaultPDA,
          payerTokenAccount: getAssociatedTokenAddressSync(new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), playerPublicKey),
          mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
          systemProgram: SYSTEM_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .instruction()

      // get connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: playerPublicKey
      }).add(buyTicketInstruction)

      const result = await selectedWallet.signAndSendTransaction!({
        chain: 'solana:devnet',
        transaction: new Uint8Array(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          })
        )
      })

      // get signature
      const signature = bs58.encode(result.signature)

      console.log('✅ Success Buy Ticket:', signature)

      // === Reset Session on ER === \\
      if (tempKeypair) {
        try {
          const resetSessionTx = await (vobleProgram.methods as any)
            .resetSession(trimmedPeriodId) // Add periodId argument
            .accounts({
              session: sessionPDA,
              userProfile: userProfilePDA, // Use userProfile instead of ticketReceipt
            })
            .transaction()

          const resetSignature = await sendAndConfirmTransaction(
            erConnection,
            resetSessionTx,
            [tempKeypair],
            { skipPreflight: true, commitment: 'confirmed' }
          )

          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Session reset on ER:', resetSignature)
          }
        } catch (erErr: any) {
          // We don't fail the whole process if ER reset fails, but we log it
          console.error('⚠️ [useBuyTicket] Failed to reset session on ER:', erErr)
          // The user might face issues on ER, but their ticket is bought on base layer.
        }
      } else {
        console.warn('⚠️ [useBuyTicket] No temp keypair available, skipping ER session reset')
      }

      // Generate session ID for tracking
      const sessionId = `voble-${selectedWallet.address}-${trimmedPeriodId}`

      setIsLoading(false)
      return {
        success: true,
        sessionId,
      }
    } catch (err: any) {
      console.error('❌ [useBuyTicket] Error buying ticket:', {
        error: err,
        message: err?.message,
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
    isLoading,
    error,
  }
}