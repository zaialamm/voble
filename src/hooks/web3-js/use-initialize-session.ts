import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'
import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'
import { buildTransaction } from './transaction-builder'
import { handleTransactionError } from './utils'
import { useERGameTransaction } from '@/hooks/mb-er'

export interface InitializeSessionResult {
  success: boolean
  signature?: string
  error?: string
}

export function useInitializeSession() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { initializeSession: sendTransactionToER } = useERGameTransaction()
  const selectedWallet = wallets[0]

  const initializeSession = async (): Promise<InitializeSessionResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎮 [useInitializeSession] Initializing session account')
    }
    setIsLoading(true)
    setError(null)

    try {
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }

      const signerPublicKey = new PublicKey(selectedWallet.address)
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useInitializeSession] Session PDA:', sessionPDA.toString())
      }

      // Create initialize_session instruction
      const initializeInstruction = await vocabeeProgram.methods
        .initializeSession()
        .accounts({
          payer: signerPublicKey,
          session: sessionPDA,
        })
        .instruction()

      // Build transaction
      const transaction = await buildTransaction({
        instructions: [initializeInstruction],
        feePayer: signerPublicKey,
        computeUnitLimit: 200_000,
        addComputeBudget: true,
      })

      // Send transaction via ER system (routes to base layer)
      if (process.env.NODE_ENV === 'development') {
        console.log('✍️ [useInitializeSession] Sending transaction...')
      }

      const result = await sendTransactionToER(transaction)

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useInitializeSession] Session initialized:', result.signature)
      }

      setIsLoading(false)
      return {
        success: true,
        signature: result.signature,
      }
    } catch (err: unknown) {
      console.error('❌ [useInitializeSession] Error:', err)
      
      const errorMessage = handleTransactionError(err)
      setError(errorMessage)
      setIsLoading(false)
      
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    initializeSession,
    isLoading,
    error,
  }
}