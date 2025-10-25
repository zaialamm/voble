import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { useQueryClient } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'

import { 
  vocabeeProgram, 
  VOBLE_PROGRAM_ID, 
  SYSTEM_PROGRAM_ID 
} from './program'
import { getUserProfilePDA } from './pdas'
import { 
  buildTransaction
} from './transaction-builder'
import { handleTransactionError } from './utils'

export interface InitializeProfileResult {
  success: boolean
  signature?: string
  error?: string
  profileAddress?: string
  isDelegated?: boolean
}

export function useInitializeProfile() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const selectedWallet = wallets[0]

  const initializeProfile = async (username: string): Promise<InitializeProfileResult> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [useInitializeProfile] Starting profile creation for:', username)
    }
    setIsLoading(true)
    setError(null)

    try {
      // Validate inputs
      if (!selectedWallet) {
        console.error('❌ [useInitializeProfile] No wallet connected')
        throw new Error('No wallet connected')
      }

      if (!username || username.trim().length === 0) {
        console.error('❌ [useInitializeProfile] Username is empty')
        throw new Error('Username is required')
      }

      if (username.length > 32) {
        console.error('❌ [useInitializeProfile] Username too long:', username.length)
        throw new Error('Username must be 32 characters or less')
      }

      const trimmedUsername = username.trim()
      const payerPublicKey = new PublicKey(selectedWallet.address)

      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [useInitializeProfile] Creating instruction for wallet:', selectedWallet.address)
      }
      
      // Derive the user profile PDA
      const [userProfilePDA, userProfileBump] = getUserProfilePDA(payerPublicKey)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useInitializeProfile] User profile PDA:', {
          address: userProfilePDA.toString(),
          bump: userProfileBump,
        })
      }

      // Create A Profile
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 [useInitializeProfile] Creating profile...')
      }
      
      const initProfileInstruction = await vocabeeProgram.methods
        .initializeUserProfile(trimmedUsername)
        .accounts({
          userProfile: userProfilePDA,
          payer: payerPublicKey,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .instruction()
      
      const initTransaction = await buildTransaction({
        instructions: [initProfileInstruction],
        feePayer: payerPublicKey,
        computeUnitLimit: 300_000,
        addComputeBudget: true,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [useInitializeProfile] Transaction details:', {
          feePayer: initTransaction.feePayer?.toString(),
          recentBlockhash: initTransaction.recentBlockhash,
          instructionCount: initTransaction.instructions.length,
          instructions: initTransaction.instructions.map((ix, i) => ({
            index: i,
            programId: ix.programId.toString(),
            accountCount: ix.keys.length,
            dataLength: ix.data.length,
          })),
        })
        console.log('✍️ [useInitializeProfile] Sending profile creation transaction...')
      }
      
      let initResult
      try {
        // Privy expects Uint8Array, not Buffer
        const serializedTx = initTransaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        
        initResult = await selectedWallet.signAndSendTransaction({
          transaction: serializedTx,
          chain: 'solana:devnet' as any
        })
      } catch (txError: any) {
        console.error('❌ [useInitializeProfile] Profile creation transaction failed:', {
          error: txError,
          message: txError?.message,
          logs: txError?.logs,
          code: txError?.code,
          stack: txError?.stack,
        })
        throw new Error(`Profile creation failed: ${txError?.message || 'Unknown transaction error'}`)
      }
      
      const initSignature = typeof initResult.signature === 'string' 
        ? initResult.signature 
        : Buffer.from(initResult.signature as Uint8Array).toString('base64')
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useInitializeProfile] Profile created with signature:', initSignature)
      }

      // Invalidate React Query cache to refetch profile
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 [useInitializeProfile] Invalidating profile cache for:', selectedWallet.address)
      }
      await queryClient.invalidateQueries({ 
        queryKey: ['userProfile', selectedWallet.address] 
      })

      setIsLoading(false)
      return {
        success: true,
        signature: initSignature,
        profileAddress: userProfilePDA.toString(),
        isDelegated: false,
      }
    } catch (err: any) {
      console.error('❌ [useInitializeProfile] Error initializing profile:', err)
      let errorMessage = handleTransactionError(err)
      
      // Check for specific profile creation errors
      if (err?.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected'
      } else if (err?.message?.includes('insufficient')) {
        errorMessage = 'Insufficient SOL balance for profile creation'
      } else if (err?.message?.includes('already exists') || err?.message?.includes('already in use')) {
        errorMessage = 'User profile already exists for this wallet'
      } else if (err?.message?.includes('invalid username')) {
        errorMessage = 'Invalid username provided'
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
    initializeProfile,
    isLoading,
    error,
  }
}
