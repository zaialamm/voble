'use client'

import React from 'react'
import { Connection } from '@solana/web3.js'
import { ConnectionContext, type ConnectionContextState } from '@/hooks/use-connection'

interface ConnectionProviderProps {
  children: React.ReactNode
  endpoint?: string
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ 
  children, 
  endpoint = process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com'
}) => {
  // Create stable connection instance with extended timeout for GUM SDK session creation
  // The GUM SDK uses Anchor Provider internally which needs:
  // 1. Longer confirmation timeout to prevent retries
  // 2. skipPreflight to avoid "already processed" errors during simulation
  const connection = React.useMemo(() => new Connection(endpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 90000, // 90 seconds (default is 30s)
    disableRetryOnRateLimit: false,
  }), [endpoint])
  
  // Note: skipPreflight must be set per transaction, not on Connection
  // The GUM SDK should handle this internally, but we can't control it
  
  const contextValue: ConnectionContextState = React.useMemo(() => ({
    connection
  }), [connection])

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}
