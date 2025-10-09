'use client'

import { Connection } from '@solana/web3.js'
import { createContext, useContext } from 'react'

// Match the exact interface from @solana/wallet-adapter-react
export interface ConnectionContextState {
  connection: Connection
}

export const ConnectionContext = createContext<ConnectionContextState>({} as ConnectionContextState)

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext)
}
