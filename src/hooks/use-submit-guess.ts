import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import { erConnection } from '@/hooks/mb-er/er-connection'
import { vobleProgram } from './program'
import { getSessionPDA } from './pdas'
import { useTempKeypair } from '@/hooks/use-temp-keypair'

export interface SubmitGuessResult {
  success: boolean
  signature?: string
  error?: string
}

export function useSubmitGuess() {
  const { wallets } = useConnectedStandardWallets()
  const selectedWallet = wallets[0]
  const tempKeypair = useTempKeypair()


  const submitGuess = async (periodId: string, guess: string): Promise<SubmitGuessResult> => {
    try {
      // Validate inputs
      if (!selectedWallet) {
        throw new Error('No wallet connected')
      }

      if (!guess || guess.length !== 6) {
        throw new Error('Guess must be exactly 6 letters')
      }

      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }


      const normalizedGuess = guess.toUpperCase()
      const trimmedPeriodId = periodId.trim()
      const signerPublicKey = new PublicKey(selectedWallet.address)

      // Derive session PDA
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      // create transaction
      const submitGuess = await vobleProgram.methods
        .submitGuess(trimmedPeriodId, normalizedGuess)
        .accounts({
          session: sessionPDA,
        })
        .transaction()

      // get signature
      const signature = await sendAndConfirmTransaction(erConnection, submitGuess, [tempKeypair],
        { skipPreflight: true, commitment: 'confirmed' }
      );

      console.log('✅ Guess submitted:', signature)

      if (!signature) {
        throw new Error('Transaction failed')
      }

      return {
        success: true,
        signature: signature,
      }
    } catch (err: unknown) {
      const error = err as Error
      return {
        success: false,
        error: error.message || 'Transaction failed',
      }
    }
  }

  return {
    submitGuess,
  }
}