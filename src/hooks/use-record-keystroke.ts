import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import 
{ PublicKey, 
  Transaction, 
  Keypair, 
  Connection, 
  sendAndConfirmTransaction 
} from '@solana/web3.js'

import { erConnection } from '@/hooks/mb-er/er-connection'

import { vobleProgram, createVobleProgram } from './program'
import { getSessionPDA } from './pdas'
import { useTempKeypair } from '@/hooks/use-temp-keypair'

import { 
  sendMagicTransaction,
  getWritableAccounts,
  getClosestValidator 
} from 'magic-router-sdk';


export interface RecordKeystrokeResult {
  success: boolean
  signature?: string
  error?: string
}

export function useRecordKeystroke() {
  const { wallets } = useConnectedStandardWallets()
  const tempKeypair = useTempKeypair()
  const selectedWallet = wallets[0]
  const connection = new Connection("https://devnet-router.magicblock.app", "confirmed")

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

      if (process.env.NODE_ENV === 'development') {
        try {
          const erProgram = createVobleProgram(connection)
          const sessionAccount = await (erProgram.account as any).sessionAccount.fetch(sessionPDA)

          console.log('🔍 [useRecordKeystroke] ER session snapshot before keystroke:', {
            periodId: sessionAccount.periodId,
            completed: sessionAccount.completed,
            guessesUsed: sessionAccount.guessesUsed,
            isSolved: sessionAccount.isSolved,
          })
        } catch (debugErr) {
          console.warn('⚠️ [useRecordKeystroke] Failed to fetch ER session for debug:', debugErr)
        }
      }

      // Get optimal validator
      const validator = await getClosestValidator(connection);
      console.log(`Using validator: ${validator.toBase58()}`);

      // create transaction
      const transaction = await vobleProgram.methods
        .recordKeystroke(key)
        .accounts({
          session: sessionPDA,
        })
        .transaction();
      
      // Analyze accounts that will be modified
      const writableAccounts = getWritableAccounts(transaction);
      console.log("Modifying accounts:", writableAccounts);
      
      /*
      // get signature
      const signature  = await sendAndConfirmTransaction(erConnection, recordKeystroke, [tempKeypair],
        { skipPreflight: true, commitment: 'confirmed' });
      */

      const signature = await sendMagicTransaction(
        connection,
        transaction,
        [tempKeypair]
      );

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