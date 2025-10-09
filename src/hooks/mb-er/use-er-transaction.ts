import { useMutation } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { Transaction } from '@solana/web3.js'
import { useERConnection } from '@/components/mb-er/er-connection-provider'
import { useSessionWallet } from '@magicblock-labs/gum-react-sdk'
import { shouldUseER } from './config'

interface ERTransactionParams {
  transaction: Transaction
  instruction?: string // For routing decisions
  useSession?: boolean // Whether to use session key
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
  const { erConnection, baseConnection, isERConnected, isBaseConnected } = useERConnection()
  const sessionWallet = useSessionWallet() // Use GUM session wallet
  const wallet = wallets[0]

  const mutation = useMutation({
    mutationKey: ['erTransaction'],
    mutationFn: async (params: ERTransactionParams): Promise<ERTransactionResult> => {
      const { transaction, instruction, useSession = false, commitment = 'confirmed' } = params

      if (!wallet?.address) {
        throw new Error('Wallet not connected')
      }

      try {
        console.log('🚀 [ER Transaction] Starting transaction...')
        console.log('📝 [ER Transaction] Instruction:', instruction || 'unknown')
        console.log('🔑 [ER Transaction] Use session:', useSession)
        console.log('⚡ [ER Transaction] ER available:', isERConnected)
        console.log('👛 [ER Transaction] Wallet address:', wallet.address)
        console.log('🔌 [ER Transaction] Has session wallet:', !!sessionWallet?.sessionToken)

        // Determine routing strategy
        let connection = baseConnection
        let routedTo: 'er' | 'base' | 'unknown' = 'base'

        // Priority 1: Session transactions MUST go to ER
        if (useSession && sessionWallet?.sessionToken) {
          if (!erConnection || !isERConnected) {
            throw new Error('ER connection required for session transactions. Please ensure ER is connected.')
          }
          console.log('⚡ [ER Transaction] Routing to ER (session transaction)')
          connection = erConnection
          routedTo = 'er'
        }
        // Priority 2: Magic Router logic for non-session transactions
        else if (instruction && shouldUseER(instruction) && isERConnected && erConnection) {
          console.log('⚡ [ER Transaction] Routing to Ephemeral Rollup via Magic Router')
          connection = erConnection
          routedTo = 'er'
        } 
        // Priority 3: Default to base layer
        else {
          console.log('🔗 [ER Transaction] Routing to Base Layer (Solana)')
          connection = baseConnection
          routedTo = 'base'
        }

        if (!connection) {
          throw new Error(`Connection not available for ${routedTo}`)
        }

        // Choose signer (session key or main wallet)
        let signature: string

        if (useSession && sessionWallet?.sessionToken && sessionWallet.signAndSendTransaction) {
          console.log('🔑 [ER Transaction] Using GUM session key for gasless signing')
          
          // Session transactions MUST go to ER
          if (!erConnection) {
            throw new Error('ER connection required for session transactions')
          }
          
          // Use GUM session wallet for gasless transactions - ALWAYS use ER connection
          const signatures = await sessionWallet.signAndSendTransaction(transaction, erConnection)
          signature = Array.isArray(signatures) ? signatures[0] : signatures
          routedTo = 'er' // Force ER routing for session transactions
          
          console.log('✅ [ER Transaction] Gasless transaction via session key to ER')
        } else {
          console.log('👤 [ER Transaction] Using main wallet for signing')
          
          // Simulate transaction first to catch errors
          console.log('🧪 [ER Transaction] Simulating transaction...')
          try {
            const simulation = await connection.simulateTransaction(transaction)
            console.log('🧪 [ER Transaction] Simulation result:', simulation)
            
            if (simulation.value.err) {
              console.error('❌ [ER Transaction] Simulation failed:', simulation.value.err)
              console.error('📋 [ER Transaction] Simulation logs:', simulation.value.logs)
              throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
            }
            
            console.log('✅ [ER Transaction] Simulation successful!')
          } catch (simError: any) {
            console.error('❌ [ER Transaction] Simulation error:', simError)
            throw simError
          }
          
          // Use Privy's signAndSendTransaction (as per Privy docs)
          // This handles both signing and sending in one call
          const result = await wallet.signAndSendTransaction({
            chain: 'solana:devnet' as any,
            transaction: new Uint8Array(
              transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
              })
            )
          })
          
          // Convert signature to base58 format (Privy returns base64 or Uint8Array)
          if (typeof result.signature === 'string') {
            // If it's a string, check if it's base64 or base58
            if (result.signature.includes('+') || result.signature.includes('/') || result.signature.includes('=')) {
              // It's base64, convert to base58
              const bs58 = await import('bs58')
              const signatureBytes = Buffer.from(result.signature, 'base64')
              signature = bs58.default.encode(signatureBytes)
            } else {
              // Already base58
              signature = result.signature
            }
          } else {
            // It's Uint8Array, convert to base58
            const bs58 = await import('bs58')
            signature = bs58.default.encode(result.signature as Uint8Array)
          }
          
          console.log('✅ [ER Transaction] Transaction signed and sent via Privy')
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

      } catch (error: any) {
        console.error('❌ [ER Transaction] Transaction failed:', {
          error,
          message: error?.message,
          logs: error?.logs,
          code: error?.code,
        })
        
        // Provide helpful error messages
        let errorMessage = error.message || 'Transaction failed'
        
        if (error.message?.includes('ER connection required')) {
          errorMessage = 'Ephemeral Rollup not connected. Please refresh the page.'
        } else if (error.message?.includes('session')) {
          errorMessage = 'Session key error. Please create a new session.'
        } else if (error.message?.includes('insufficient')) {
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
      useSession: true, // Use session key for gasless experience
      commitment: 'confirmed',
    })
  }

  // Complete game with ER optimization
  const completeGame = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'complete_voble_game',
      useSession: true,
      commitment: 'confirmed',
    })
  }

  // Buy ticket (must use main wallet for SOL payment, but route to ER if profile delegated)
  const buyTicket = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'buy_ticket_and_start_game',
      useSession: false, // Must use main wallet to pay ticket price
      commitment: 'confirmed',
    })
  }

  return {
    submitGuess,
    completeGame,
    buyTicket,
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
      useSession: false,
      commitment: 'confirmed',
    })
  }

  // Update profile (can use ER if delegated)
  const updateProfile = async (transaction: Transaction) => {
    return await sendTransaction({
      transaction,
      instruction: 'update_user_profile',
      useSession: true,
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
