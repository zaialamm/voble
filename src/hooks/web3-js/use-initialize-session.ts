import { useState } from 'react';
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana';
import {PublicKey, Connection, Transaction} from '@solana/web3.js';
import bs58 from 'bs58';

import { vobleProgram } from './program';
import { getSessionPDA } from './pdas';
import { handleTransactionError } from './utils';

export interface InitializeSessionResult {
  success: boolean
  signature?: string
  error?: string
}

export function useInitializeSession() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const selectedWallet = wallets[0]

  const initializeSession = async (): Promise<InitializeSessionResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!selectedWallet) {
        throw new Error('No wallet connected')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🎮 [useInitializeSession] Initializing session account')
      }

      const signerPublicKey = new PublicKey(selectedWallet.address)
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useInitializeSession] Session PDA:', sessionPDA.toBase58())
      }

      // === CREATE SESSION === \ 

      // get connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // get blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()     

      // Create initialize_session instruction
      const createSessionIx = await vobleProgram.methods
        .initializeSession()
        .accounts({
          payer: signerPublicKey,
          session: sessionPDA,
        })
        .instruction()

      // build transaction
      const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: signerPublicKey
      }).add(createSessionIx);

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

      // get transaction
      const signature = bs58.encode(result.signature)

      console.log('✅ Session initialized:', signature)
    
      setIsLoading(false)
      return {
        success: true,
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