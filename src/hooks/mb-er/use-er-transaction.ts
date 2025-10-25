import { useMutation } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { useERConnection } from '@/components/mb-er/er-connection-provider'
import { shouldUseER } from './config'

import { Transaction, Connection } from '@solana/web3.js'
import { useTempKeypair } from '@/hooks/use-temp-keypair'

interface ERTransactionParams {
  transaction: Transaction
  instruction?: string // For routing decisions
  commitment?: 'processed' | 'confirmed' | 'finalized'
}

interface ERTransactionResult {
  success: boolean
  signature?: string
  error?: string
  routedTo: 'er' | 'base' | 'unknown'
}

export function useERTransaction() {
  const { wallets } = useConnectedStandardWallets()
  const { baseConnection, isERConnected } = useERConnection()
  const wallet = wallets[0]
  const tempKeypair = useTempKeypair()

  const mutation = useMutation({
    mutationKey: ['erTransaction'],
    mutationFn: async (params: ERTransactionParams): Promise<ERTransactionResult> => {
      const { transaction, instruction, commitment = 'confirmed' } = params

      if (!wallet?.address) {
        throw new Error('Wallet not connected')
      }

      try {
        console.log('🚀 [ER Transaction] Starting transaction...')
        console.log('📝 [ER Transaction] Instruction:', instruction || 'unknown')
        console.log('⚡ [ER Transaction] ER available:', isERConnected)
        console.log('👛 [ER Transaction] Wallet address:', wallet.address)

        // Determine routing strategy
        let connection = baseConnection
        let routedTo: 'er' | 'base' | 'unknown' = 'base'

        // Priority 1: Route to ER for eligible instructions
        if (instruction && shouldUseER(instruction) && isERConnected) {
          console.log('⚡ [ER Transaction] Routing to Ephemeral Rollup')
          
          // Use DIRECT ER endpoint (not Magic Router) for ER transactions
          const erDirectEndpoint = 'https://devnet.magicblock.app'
          connection = new Connection(erDirectEndpoint, {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
          })
          
          routedTo = 'er'
        } 
        // Priority 2: Default to base layer
        else {
          console.log('🔗 [ER Transaction] Routing to Base Layer (Solana)')
          connection = baseConnection
          routedTo = 'base'
        }

        if (!connection) {
          throw new Error('Connection not available')
        }

        let signature: string 

        // Temp Keypair
        if (routedTo === 'er') {
          console.log('⚡ [ER Transaction] Sending to ER with temp keypair')

          if (!tempKeypair) {
            throw new Error('Temp keypair not available')
          }

          console.log('🔑 [ER Transaction] Temp keypair:', tempKeypair.publicKey.toBase58())

          // Get latest blockhash
          console.log('⏳ [ER Transaction] Getting latest blockhash...')
          const { blockhash } = await connection.getLatestBlockhash()
          console.log('✅ [ER Transaction] Got blockhash:', blockhash)

          // Set transaction properties
          console.log('📝 [ER Transaction] Setting transaction properties...')
          transaction.recentBlockhash = blockhash
          transaction.feePayer = tempKeypair.publicKey
          console.log('✅ [ER Transaction] Transaction properties set')

          // Partially sign with temp keypair (as fee payer)
          console.log('✍️ [ER Transaction] Signing transaction...')
          transaction.partialSign(tempKeypair)
          console.log('✅ [ER Transaction] Transaction signed')

          // Send raw transaction to ER
          console.log('📡 [ER Transaction] Sending raw transaction...')
          signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: true }
          )
          
          console.log('✅ [ER Transaction] Transaction sent:', signature)

          console.log('✅ [ER Transaction] Sent to ER (gasless)')

        } else {
          // For base layer: Simulate and use wallet
          console.log('🧪 [ER Transaction] Simulating transaction on base layer...')
          
          try {
            const simulation = await connection.simulateTransaction(transaction)
            console.log('🧪 [ER Transaction] Simulation result:', simulation)
            
            if (simulation.value.err) {
              console.error('❌ [ER Transaction] Simulation failed:', simulation.value.err)
              console.error('📋 [ER Transaction] Simulation logs:', simulation.value.logs)
              throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
            }
            
            console.log('✅ [ER Transaction] Simulation successful!')
          } catch (simError: unknown) {
            console.error('❌ [ER Transaction] Simulation error:', simError)
            throw simError
          }
          
          console.log('👤 [ER Transaction] Using main wallet for signing')
          
          const result = await wallet.signAndSendTransaction({
            chain: 'solana:devnet' as const,
            transaction: new Uint8Array(
              transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
              })
            )
          })
          
          // Convert signature to base58 format
          const resultSignature: string | Uint8Array = result.signature as string | Uint8Array
          if (typeof resultSignature === 'string') {
            if (resultSignature.includes('+') || resultSignature.includes('/') || resultSignature.includes('=')) {
              const bs58 = await import('bs58')
              const signatureBytes = Buffer.from(resultSignature, 'base64')
              signature = bs58.default.encode(signatureBytes)
            } else {
              signature = resultSignature
            }
          } else {
            const bs58 = await import('bs58')
            signature = bs58.default.encode(resultSignature)
          }
        }

        console.log('📡 [ER Transaction] Transaction sent:', signature)
        console.log('🎯 [ER Transaction] Routed to:', routedTo.toUpperCase())

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, commitment)
          
          if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${confirmation.value.err}`)
          }

          console.log('✅ [ER Transaction] Transaction confirmed!')

          return {
            success: true,
            signature,
            routedTo,
          }

      } catch (error: unknown) {
        const err = error as Error & { message?: string; logs?: string[]; code?: number }
        console.error('❌ [ER Transaction] Transaction failed:', {
          error,
          message: err?.message,
          logs: err?.logs,
          code: err?.code,
        })
        
        // Provide helpful error messages
        let errorMessage = err.message || 'Transaction failed'
        
        if (err.message?.includes('ER connection required')) {
          errorMessage = 'Ephemeral Rollup not connected. Please refresh the page.'
        } else if (err.message?.includes('insufficient')) {
          errorMessage = 'Insufficient SOL balance for transaction fees.'
        }
        
        return {
          success: false,
          error: errorMessage,
          routedTo: 'unknown',
        }
      }
    },
  })

  return {
    sendTransaction: mutation.mutateAsync,
    isTransacting: mutation.isPending,
    error: mutation.error?.message || null,
    reset: mutation.reset,
  }
}

// Specialized hook for game-related transactions
export function useERGameTransaction() {
  const { sendTransaction, isTransacting, error, reset } = useERTransaction()

  // Submit guess with ER optimization
  const submitGuess = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'submit_guess',
      commitment: 'confirmed',
    })
  }

  // Complete game with ER optimization
  const completeGame = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'complete_voble_game',
      commitment: 'confirmed',
    })
  }

  const initializeSession = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'initialize_session',
      commitment: 'confirmed',
    })
  }

  // Buy ticket (must use main wallet for SOL payment)
  const buyTicket = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'buy_ticket_and_start_game',
      commitment: 'confirmed',
    })
  }

  const undelegateSession = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'undelegate_session',
      commitment: 'confirmed',
    })
  }

  return {
    submitGuess,
    completeGame,
    initializeSession,
    buyTicket,
    undelegateSession,
    isTransacting,
    error,
    reset,
  }
}

// Hook for profile-related ER transactions
export function useERProfileTransaction() {
  const { sendTransaction, isTransacting, error, reset } = useERTransaction()

  // Initialize profile (base layer)
  const initializeProfile = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'initialize_user_profile',
      commitment: 'confirmed',
    })
  }

  // Update profile (can use ER if delegated)
  const updateProfile = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'update_user_profile',
      commitment: 'confirmed',
    })
  }

  return {
    initializeProfile,
    updateProfile,
    isTransacting,
    error,
    reset,
  }
}
