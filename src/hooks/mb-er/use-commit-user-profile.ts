import { useMutation } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'
import { useERConnection } from '@/components/mb-er/er-connection-provider'
import { vocabeeProgram } from '@/hooks/web3-js/program'
import { getUserProfilePDA } from '@/hooks/web3-js/pdas'

interface CommitUserProfileResult {
  success: boolean
  signature?: string
  error?: string
}

export function useCommitUserProfile() {
  const { wallets } = useConnectedStandardWallets()
  const { baseConnection } = useERConnection()
  const wallet = wallets[0]

  const mutation = useMutation({
    mutationKey: ['commitUserProfile'],
    mutationFn: async (): Promise<CommitUserProfileResult> => {
      if (!wallet?.address || !baseConnection) {
        throw new Error('Wallet not connected or connection not available')
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [Commit] Starting user profile commit...')
        }
        
        const playerPublicKey = new PublicKey(wallet.address)
        const [userProfilePDA] = getUserProfilePDA(playerPublicKey)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 [Commit] User Profile PDA:', userProfilePDA.toString())
          console.log('👤 [Commit] Player:', playerPublicKey.toString())
        }

        // Build commit transaction using your program's commit_user_profile instruction
        const tx = await vocabeeProgram.methods
          .commitUserProfile()
          .accounts({
            payer: playerPublicKey,
            userProfile: userProfilePDA,
            player: playerPublicKey,
            // Magic Context and Delegation Program will be added by Anchor
          })
          .transaction()

        if (process.env.NODE_ENV === 'development') {
          console.log('📝 [Commit] Transaction built, requesting signature...')
        }

        // Sign and send transaction using Privy
        // Privy expects Uint8Array according to docs
        const serializedTx = new Uint8Array(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          })
        )
        
        const result = await wallet.signAndSendTransaction({
          transaction: serializedTx,
          chain: 'solana:devnet' as any
        })
        
        const signature = typeof result.signature === 'string' 
          ? result.signature 
          : Buffer.from(result.signature as Uint8Array).toString('base64')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 [Commit] Transaction sent:', signature)
        }

        // Wait for confirmation
        const confirmation = await baseConnection.confirmTransaction(signature, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`)
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Commit] User profile committed successfully!')
          console.log('🔗 [Commit] Signature:', signature)
        }

        return {
          success: true,
          signature,
        }

      } catch (error: any) {
        console.error('❌ [Commit] Failed to commit user profile:', error)
        
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
        }
      }
    },
  })

  return {
    commitUserProfile: mutation.mutateAsync,
    isCommitting: mutation.isPending,
    error: mutation.error?.message || null,
    reset: mutation.reset,
  }
}

// Hook for automatic commit strategies
export function useAutoCommitUserProfile() {
  const { commitUserProfile, isCommitting } = useCommitUserProfile()

  // Commit on game completion
  const commitOnGameComplete = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎮 [Auto Commit] Committing profile after game completion...')
    }
    return await commitUserProfile()
  }

  // Commit on profile update
  const commitOnProfileUpdate = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 [Auto Commit] Committing profile after update...')
    }
    return await commitUserProfile()
  }

  // Commit on session end
  const commitOnSessionEnd = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('⏰ [Auto Commit] Committing profile on session end...')
    }
    return await commitUserProfile()
  }

  return {
    commitOnGameComplete,
    commitOnProfileUpdate,
    commitOnSessionEnd,
    isCommitting,
  }
}
