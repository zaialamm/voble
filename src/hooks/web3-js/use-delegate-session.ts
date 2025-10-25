import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'
import { useTempKeypair } from '@/hooks/use-temp-keypair'
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js'
import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'
import { handleTransactionError, connection } from './utils'

// ER Validator public key (Asia region)
const ER_VALIDATOR = new PublicKey('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57')

export interface DelegateSessionResult {
  success: boolean
  signature?: string
  error?: string
}

export function useDelegateSession() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const tempKeypair = useTempKeypair()
  const selectedWallet = wallets[0]

  // Create delegate_session instruction
  const delegateSession = async (): Promise<DelegateSessionResult> => {
    console.log('⚡ [useDelegateSession] Delegating session to ER')
    setIsLoading(true)
    setError(null)

    try {
      // Validate
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }
      
      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }

      // Derive session PDA using PLAYER's pubkey (not temp keypair!)
      const playerPublicKey = new PublicKey(selectedWallet.address)
      const [sessionPDA] = getSessionPDA(playerPublicKey)

      console.log('🔑 [useDelegateSession] Session PDA:', sessionPDA.toString())
      console.log('👤 [useDelegateSession] Player:', playerPublicKey.toString())
      console.log('🔑 [useDelegateSession] Temp keypair:', tempKeypair.publicKey.toString())

      // Create delegate_session instruction
      const delegateInstruction = await vocabeeProgram.methods
        .delegateSession()
        .accounts({
          payer: tempKeypair.publicKey,  // ✅ Temp keypair (no popup!)
          validator: ER_VALIDATOR,
          pda: sessionPDA,  // ✅ Player's session PDA
        })
        .instruction()

      // Build transaction manually
      const transaction = new Transaction()
      
      // Add compute budget
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 })
      )
      
      // Add delegate instruction
      transaction.add(delegateInstruction)

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = tempKeypair.publicKey  // ✅ Temp keypair

      // Sign with temp keypair (no popup!)
      transaction.sign(tempKeypair)

      console.log('📡 [useDelegateSession] Sending transaction to base layer...')

      // Send to base layer
      const signature = await connection.sendRawTransaction(
        transaction.serialize()
      )

      console.log('⏳ [useDelegateSession] Waiting for confirmation...')

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      console.log('✅ [useDelegateSession] Session delegated:', signature)

      setIsLoading(false)
      return {
        success: true,
        signature,
      }
    } catch (err: unknown) {
      console.error('❌ [useDelegateSession] Error:', err)
      
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
    delegateSession,
    isLoading,
    error,
  }
}