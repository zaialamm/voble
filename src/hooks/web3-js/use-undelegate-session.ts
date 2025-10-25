import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'
import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'
import { buildTransaction } from './transaction-builder'
import { useERGameTransaction } from '@/hooks/mb-er'

export function useUndelegateSession() {
  const { wallets } = useConnectedStandardWallets()
  const [isLoading, setIsLoading] = useState(false)
  const { undelegateSession: undelegateSessionER } = useERGameTransaction()
  const selectedWallet = wallets[0]

  const undelegateSession = async () => {
    setIsLoading(true)
    try {
      if (!selectedWallet?.address) throw new Error('No wallet connected')

      const signerPublicKey = new PublicKey(selectedWallet.address)
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      const instruction = await vocabeeProgram.methods
        .undelegateSession()
        .accounts({
          payer: signerPublicKey,
          session: sessionPDA,
        })
        .instruction()

      const transaction = await buildTransaction({
        instructions: [instruction],
        feePayer: signerPublicKey,
      })

      const result = await undelegateSessionER(transaction)
      setIsLoading(false)
      return result
    } catch (error) {
      console.error('Error undelegating session:', error)
      setIsLoading(false)
      throw error
    }
  }

  return { undelegateSession, isLoading }
}