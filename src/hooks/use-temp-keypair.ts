import { useEffect, useRef } from 'react'
import { Keypair, PublicKey } from '@solana/web3.js'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'

export function useTempKeypair() {
  const { wallets } = useConnectedStandardWallets()
  const wallet = wallets[0]
  const tempKeypair = useRef<Keypair | null>(null)

  useEffect(() => {
    if (!wallet?.address) {
      tempKeypair.current = null
      return
    }

    const publicKey = new PublicKey(wallet.address)
    
    // Check if we already have this keypair
    if (tempKeypair.current && 
        Keypair.fromSeed(publicKey.toBytes()).publicKey.equals(tempKeypair.current.publicKey)) {
      return
    }

    // Derive deterministic keypair from wallet public key
    const newTempKeypair = Keypair.fromSeed(publicKey.toBytes())
    tempKeypair.current = newTempKeypair
    
    console.log('🔑 Temp Keypair created:', newTempKeypair.publicKey.toBase58())
  }, [wallet?.address])

  return tempKeypair.current
}