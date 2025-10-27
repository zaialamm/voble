import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { useQueryClient } from '@tanstack/react-query'
import {PublicKey, Connection, Transaction} from '@solana/web3.js';
import bs58 from 'bs58';

import { 
  vobleProgram, 
  SYSTEM_PROGRAM_ID 
} from './program'

import { getUserProfilePDA } from './pdas'
import { handleTransactionError } from './utils'

export interface InitializeProfileResult {
  success: boolean
  signature?: string
  error?: string
  profileAddress?: string
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

      // ==== CREATE PROFILE === \\

      // get connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // get blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()     
      
      // create instruction
      const createProfileIx = await vobleProgram.methods
        .initializeUserProfile(trimmedUsername)
        .accounts({
          userProfile: userProfilePDA,
          payer: payerPublicKey,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .instruction()
      
      // build transaction
      const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: payerPublicKey
      }).add(createProfileIx);

      // send tx with Privy
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

      console.log('✅ Profile created:', signature)

      await queryClient.invalidateQueries({ 
        queryKey: ['userProfile', selectedWallet.address] 
      })

      setIsLoading(false)
      return {
        success: true,
        profileAddress: userProfilePDA.toString()
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
