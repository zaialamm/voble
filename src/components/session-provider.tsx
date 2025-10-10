'use client'

import React from 'react'
import {
  SessionWalletProvider,
  useSessionKeyManager,
} from '@magicblock-labs/gum-react-sdk'
//import { usePrivy } from '@privy-io/react-auth'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Transaction, VersionedTransaction, Connection } from '@solana/web3.js'
import { useConnection } from '@/hooks/use-connection'

// Define AnchorWallet interface to match what MagicBlock expects
interface AnchorWallet {
  publicKey: PublicKey
  signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T>
  signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]>
  signAndSendTransaction?: <T extends Transaction | VersionedTransaction>(transactions: T | T[], connection?: Connection, options?: any) => Promise<string[]>
}

interface SessionProviderProps {
  children: React.ReactNode
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  // const { ready, authenticated } = usePrivy()
  const { wallets } = useConnectedStandardWallets() // ✅ CORRECT: Solana-specific hook
  
  // Use the proper connection hook (matches @solana/wallet-adapter-react)
  const { connection } = useConnection()
  
  // ✅ FIX: Extract stable wallet address to prevent infinite re-renders
  const walletAddress = wallets[0]?.address
  
  // Convert Privy wallet to AnchorWallet format - ONLY SIGNING, NO SENDING
  const anchorWallet: AnchorWallet | undefined = React.useMemo(() => {
    const solanaWallet = wallets[0] // useConnectedStandardWallets already filters for Solana
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SessionProvider] Solana wallets:', wallets.length, wallets.map(w => w.address))
      console.log('🔄 [SessionProvider] Creating anchorWallet, hasSolanaWallet:', !!solanaWallet, 'address:', solanaWallet?.address)
    }
    
    if (!solanaWallet) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [SessionProvider] No Solana wallet found, returning undefined')
      }
      return undefined
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [SessionProvider] Creating anchorWallet for:', solanaWallet.address)
    }
    
    return {
      publicKey: new PublicKey(solanaWallet.address),
      signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
        // Only sign the transaction, don't send it (this is key for session keys!)
        if (!solanaWallet.signTransaction) {
          throw new Error('Wallet does not support transaction signing')
        }

        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔐 [SessionProvider] signTransaction called')
            console.log('🔐 [SessionProvider] Transaction type:', transaction instanceof VersionedTransaction ? 'Versioned' : 'Legacy')
          }

          // Use Privy's signTransaction method (not signAndSendTransaction)
          const signedTxData = await solanaWallet.signTransaction({
            transaction: transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false
            }),
            chain: 'solana:devnet' as any
          })
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [SessionProvider] Transaction signed successfully')
          }
          
          // Reconstruct the signed transaction
          if (transaction instanceof VersionedTransaction) {
            return VersionedTransaction.deserialize(signedTxData.signedTransaction) as T
          } else {
            return Transaction.from(signedTxData.signedTransaction) as T
          }
        } catch (error) {
          console.error('❌ [SessionProvider] Failed to sign transaction:', error)
          throw error
        }
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
        // Sign all transactions individually (Privy doesn't have bulk signing)
        const signedTransactions: T[] = []
        
        for (const transaction of transactions) {
          try {
            const signedTxData = await solanaWallet.signTransaction({
              transaction: transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false
              }),
              chain: 'solana:devnet' as any
            })
            
            // Reconstruct the signed transaction
            if (transaction instanceof VersionedTransaction) {
              signedTransactions.push(VersionedTransaction.deserialize(signedTxData.signedTransaction) as T)
            } else {
              signedTransactions.push(Transaction.from(signedTxData.signedTransaction) as T)
            }
          } catch (error) {
            console.error('Failed to sign transaction:', error)
            throw error
          }
        }
        
        return signedTransactions
      },
      signAndSendTransaction: async <T extends Transaction | VersionedTransaction>(
        transactions: T | T[]
      ): Promise<string[]> => {
        // ✅ GUM SDK needs this to properly track transaction confirmation and store session in IndexedDB
        // Must return string[] (array of signatures) as per SessionWalletInterface
        if (!solanaWallet.signAndSendTransaction) {
          throw new Error('Wallet does not support signAndSendTransaction')
        }

        try {
          const txArray = Array.isArray(transactions) ? transactions : [transactions]
          
          if (process.env.NODE_ENV === 'development') {
            console.log('🚀 [SessionProvider] ========================================')
            console.log('🚀 [SessionProvider] signAndSendTransaction called by GUM SDK!')
            console.log('🚀 [SessionProvider] Number of transactions:', txArray.length)
            console.log('🚀 [SessionProvider] ========================================')
          }

          const signatures: string[] = []
          
          for (const tx of txArray) {
            const result = await solanaWallet.signAndSendTransaction({
              transaction: tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false
              }),
              chain: 'solana:devnet' as any
            })
            
            // Convert signature to string if it's a Uint8Array
            const signature = typeof result.signature === 'string' 
              ? result.signature 
              : Buffer.from(result.signature).toString('base64')
            
            signatures.push(signature)
            
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [SessionProvider] Transaction sent, signature:', signature)
            }
          }

          return signatures
        } catch (error) {
          console.error('❌ [SessionProvider] Failed to sign and send transaction:', error)
          throw error
        }
      }
    }
  }, [walletAddress]) // ✅ Only depend on wallet address string, not entire wallets array
  
  const cluster = 'devnet' as const
  
  // Log for debugging
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [SessionProvider] Wallet status:', {
        hasAnchorWallet: !!anchorWallet,
        anchorWalletPubkey: anchorWallet?.publicKey?.toString(),
        hasPrivyWallet: !!walletAddress,
        privyWalletAddress: walletAddress,
        usingDummyWallet: !anchorWallet,
      })
      console.log('🔍 [SessionProvider] Initializing with:', anchorWallet ? 'REAL WALLET' : 'DUMMY WALLET')
    }
  }, [walletAddress, anchorWallet?.publicKey?.toString()]) // ✅ Only depend on stable primitive values
  
  // Create a dummy wallet for when no real wallet is connected
  // This allows SessionWalletProvider to always render (required for hooks)
  const dummyWallet: AnchorWallet = React.useMemo(() => ({
    publicKey: new PublicKey('11111111111111111111111111111111'),
    signTransaction: async <T extends Transaction | VersionedTransaction>(): Promise<T> => {
      throw new Error('No wallet connected')
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(): Promise<T[]> => {
      throw new Error('No wallet connected')
    },
  }), [])
  
  // ✅ FIX: Always initialize session manager, but with dummy wallet if needed
  // This ensures SessionWalletProvider is always rendered (required for hooks to work)
  const sessionWallet = useSessionKeyManager(
    anchorWallet || dummyWallet, 
    connection, 
    cluster
  )
  
  return (
    <SessionWalletProvider sessionWallet={sessionWallet}>
      {children}
    </SessionWalletProvider>
  )
}
