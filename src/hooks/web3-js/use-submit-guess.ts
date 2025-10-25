import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'
import { buildTransaction } from './transaction-builder'
import { useERGameTransaction } from '@/hooks/mb-er'

export interface SubmitGuessResult {
  success: boolean
  signature?: string
  error?: string
}

export function useSubmitGuess() {
  const { wallets } = useConnectedStandardWallets()
  const { submitGuess: submitGuessER, isTransacting } = useERGameTransaction()
  const selectedWallet = wallets[0]

  const submitGuess = async (
    periodId: string,
    guess: string
  ): Promise<SubmitGuessResult> => {
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

      const normalizedGuess = guess.toUpperCase()
      const trimmedPeriodId = periodId.trim()
      const signerPublicKey = new PublicKey(selectedWallet.address)

      // Derive session PDA
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      // Create instruction
      const submitGuessInstruction = await vocabeeProgram.methods
        .submitGuess(trimmedPeriodId, normalizedGuess)
        .accounts({
          session: sessionPDA,
        })
        .instruction()

      // Build transaction
      const transaction = await buildTransaction({
        instructions: [submitGuessInstruction],
        computeUnitLimit: 400_000,
        addComputeBudget: true,
      })

      // Send transaction via ER
      const result = await submitGuessER(transaction)

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      return {
        success: true,
        signature: result.signature,
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
    isLoading: isTransacting,
  }
}