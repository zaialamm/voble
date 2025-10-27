import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Transaction, Connection } from '@solana/web3.js'
import bs58 from 'bs58';

import { 
  vobleProgram, 
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
import { handleTransactionError } from './utils'

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

      // === Buy Ticket and Delegate Session === \\

      // Create buy ticket instruction
      const buyTicketInstruction = await vobleProgram.methods
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
      
      // Create delegate session instruction
      const delegateInstruction = await vobleProgram.methods
        .delegateSession()
        .accounts({
          payer: playerPublicKey,
          pda: sessionPDA,
        })
        .instruction()

      // get connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // get latest blockhash
      const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash()

      const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: playerPublicKey
      }).add(buyTicketInstruction, delegateInstruction)
  
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

      console.log('✅ Success Buy Ticket and Delegate Session:', signature)
      
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
    isLoading,  // ← Fixed: removed isERTransacting
    error,
  }
}