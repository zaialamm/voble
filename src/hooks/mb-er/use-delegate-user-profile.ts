import { useMutation } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'
import { useERConnection } from '@/components/mb-er/er-connection-provider'
import { vocabeeProgram } from '@/hooks/web3-js/program'
import { getUserProfilePDA } from '@/hooks/web3-js/pdas'
import { PROGRAM_IDS } from './config'
import { connection } from '@/hooks/web3-js/utils'

interface DelegateUserProfileResult {
  success: boolean
  signature?: string
  error?: string
}

export function useDelegateUserProfile() {
  const { wallets } = useConnectedStandardWallets()
  const wallet = wallets[0]
  // Use the singleton connection from utils instead of ER connection
  const baseConnection = connection

  const mutation = useMutation({
    mutationKey: ['delegateUserProfile'],
    mutationFn: async (): Promise<DelegateUserProfileResult> => {
      if (!wallet?.address) {
        throw new Error('Wallet not connected')
      }

      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [Delegate] Starting user profile delegation...')
        }
        
        const playerPublicKey = new PublicKey(wallet.address)
        const [userProfilePDA] = getUserProfilePDA(playerPublicKey)
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📍 [Delegate] User Profile PDA:', userProfilePDA.toString())
          console.log('👤 [Delegate] Player:', playerPublicKey.toString())
        }

        // Derive delegation accounts
        const DELEGATION_PROGRAM_ID = PROGRAM_IDS.DELEGATION
        const VOBLE_PROGRAM_ID_LOCAL = PROGRAM_IDS.VOBLE
        
        // Buffer PDA - derived by YOUR program (according to IDL)
        const [bufferUserProfile, bufferBump] = PublicKey.findProgramAddressSync(
          [Buffer.from('buffer'), userProfilePDA.toBuffer()],
          VOBLE_PROGRAM_ID_LOCAL
        )
        
        // Delegation record - derived by delegation program
        const [delegationRecordUserProfile, recordBump] = PublicKey.findProgramAddressSync(
          [Buffer.from('delegation'), userProfilePDA.toBuffer()],
          DELEGATION_PROGRAM_ID
        )
        
        // Delegation metadata - derived by delegation program
        const [delegationMetadataUserProfile, metadataBump] = PublicKey.findProgramAddressSync(
          [Buffer.from('delegation-metadata'), userProfilePDA.toBuffer()],
          DELEGATION_PROGRAM_ID
        )
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 [Delegate] Delegation accounts:', {
            buffer: bufferUserProfile.toString(),
            bufferBump,
            record: delegationRecordUserProfile.toString(),
            recordBump,
            metadata: delegationMetadataUserProfile.toString(),
            metadataBump,
          })
        }
        
        // Build delegation transaction using your program's delegate_user_profile instruction
        const tx = await vocabeeProgram.methods
          .delegateUserProfile(30_000) // commitFrequencyMs
          .accounts({
            payer: playerPublicKey,
            bufferUserProfile,
            delegationRecordUserProfile,
            delegationMetadataUserProfile,
            userProfile: userProfilePDA,
            player: playerPublicKey,
            delegationBuffer: bufferUserProfile,
            delegationRecord: delegationRecordUserProfile,
            delegationMetadata: delegationMetadataUserProfile,
            delegationProgram: DELEGATION_PROGRAM_ID,
            systemProgram: new PublicKey('11111111111111111111111111111111'),
            ownerProgram: VOBLE_PROGRAM_ID_LOCAL,
          })
          .transaction()

        // Add recent blockhash and fee payer
        tx.feePayer = playerPublicKey
        const { blockhash } = await baseConnection.getLatestBlockhash('confirmed')
        tx.recentBlockhash = blockhash

        if (process.env.NODE_ENV === 'development') {
          console.log('📝 [Delegate] Transaction built, requesting signature...')
          console.log('🔍 [Delegate] Transaction details:', {
            feePayer: tx.feePayer?.toString(),
            recentBlockhash: tx.recentBlockhash,
            instructionCount: tx.instructions.length,
          })
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 [Delegate] Simulating transaction...')
        }
        try {
          const simulation = await baseConnection.simulateTransaction(tx)
          if (process.env.NODE_ENV === 'development') {
            console.log('🧪 [Delegate] Simulation result:', simulation)
          }
          
          if (simulation.value.err) {
            console.error('❌ [Delegate] Simulation failed:', simulation.value.err)
            console.error('❌ [Delegate] Simulation logs:', simulation.value.logs)
            throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`)
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [Delegate] Simulation successful!')
          }
        } catch (simError: any) {
          console.error('❌ [Delegate] Simulation error:', simError)
          throw simError
        }
        let result
        try {
          const serializedTx = tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false
          })
          
          if (process.env.NODE_ENV === 'development') {
            console.log('📦 [Delegate] Serialized transaction size:', serializedTx.length, 'bytes')
          }
          
          result = await wallet.signAndSendTransaction({
            transaction: serializedTx,
            chain: 'solana:devnet' as any
          })
        } catch (txError: any) {
          console.error('❌ [Delegate] Transaction signing/sending failed:', {
            error: txError,
            message: txError?.message,
            logs: txError?.logs,
            code: txError?.code,
          })
          throw new Error(`Transaction failed: ${txError?.message || 'Unknown error'}`)
        }
        
        const signature = typeof result.signature === 'string' 
          ? result.signature 
          : Buffer.from(result.signature as Uint8Array).toString('base64')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Delegate] User profile delegated successfully!')
          console.log('🔗 [Delegate] Signature:', signature)
        }

        return {
          success: true,
          signature,
        }

      } catch (error: any) {
        console.error('❌ [Delegate] Failed to delegate user profile:', error)
        
        return {
          success: false,
          error: error.message || 'Unknown error occurred',
        }
      }
    },
  })

  return {
    delegateUserProfile: mutation.mutateAsync,
    isDelegating: mutation.isPending,
    error: mutation.error?.message || null,
    reset: mutation.reset,
  }
}

// Hook to check if user profile is delegated
export function useIsUserProfileDelegated() {
  const { wallets } = useConnectedStandardWallets()
  const { baseConnection } = useERConnection()
  const wallet = wallets[0]

  const checkDelegation = async (): Promise<boolean> => {
    if (!wallet?.address || !baseConnection) {
      return false
    }

    try {
      const playerPublicKey = new PublicKey(wallet.address)
      const [userProfilePDA] = getUserProfilePDA(playerPublicKey)
      
      // Fetch the account to check its owner
      const accountInfo = await baseConnection.getAccountInfo(userProfilePDA)
      
      if (!accountInfo) {
        return false
      }

      // Check if the account is owned by the delegation program
      const isDelegated = accountInfo.owner.equals(PROGRAM_IDS.DELEGATION)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [Delegation Check] Profile delegated:', isDelegated)
        console.log('🔍 [Delegation Check] Current owner:', accountInfo.owner.toString())
      }
      
      return isDelegated

    } catch (error) {
      console.error('❌ [Delegation Check] Error checking delegation status:', error)
      return false
    }
  }

  return { checkDelegation }
}
