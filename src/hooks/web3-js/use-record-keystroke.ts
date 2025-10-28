import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js'
import { erConnection } from '@/hooks/mb-er/er-connection'

import { vobleProgram } from './program'
import { getSessionPDA } from './pdas'
import { useTempKeypair } from '@/hooks/use-temp-keypair'


export interface RecordKeystrokeResult {
  success: boolean
  signature?: string
  error?: string
}

export function useRecordKeystroke() {
  const { wallets } = useConnectedStandardWallets()
  const tempKeypair = useTempKeypair()
  const selectedWallet = wallets[0]

  const recordKeystroke = async (key: string): Promise<RecordKeystrokeResult> => {
    try {
      if (!selectedWallet) {
        throw new Error('No wallet connected')
      }

      if (!key || key.length === 0) {
        throw new Error('Key is required')
      }

      if (!tempKeypair) {
        throw new Error('Temp keypair not available')
      }

      const signerPublicKey = new PublicKey(selectedWallet.address)
      const [sessionPDA] = getSessionPDA(signerPublicKey)

      // create transaction
      const recordKeystroke = await vobleProgram.methods
        .recordKeystroke(key)
        .accounts({
          session: sessionPDA,
        })
        .transaction();
      
      // get signature
      const signature  = await sendAndConfirmTransaction(erConnection, recordKeystroke, [tempKeypair],
        { skipPreflight: true, commitment: 'confirmed' });

      console.log('✅ Keystroke recorded:', signature)

      return {
        success: true,
        signature,
      }
    } catch (err: unknown) {
      const error = err as Error
      console.warn('⚠️ Failed to record keystroke:', error.message)
      return {
        success: false,
        error: error.message || 'Transaction failed',
      }
    }
  }

  return {
    recordKeystroke,
    isLoading: false,
  }
}