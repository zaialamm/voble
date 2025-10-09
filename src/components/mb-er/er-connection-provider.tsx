'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Connection } from '@solana/web3.js'
import { getEREndpoint, getBaseEndpoint } from '@/hooks/mb-er/config'

interface ERConnectionContextType {
  // ER Connection (Magic Router)
  erConnection: Connection | null
  
  // Base Layer Connection (Solana)
  baseConnection: Connection | null
  
  // Connection status
  isERConnected: boolean
  isBaseConnected: boolean
  
  // Error states
  erError: string | null
  baseError: string | null
  
  // Retry functions
  retryERConnection: () => void
  retryBaseConnection: () => void
}

const ERConnectionContext = createContext<ERConnectionContextType | null>(null)

interface ERConnectionProviderProps {
  children: ReactNode
}

export function ERConnectionProvider({ children }: ERConnectionProviderProps) {
  const [erConnection, setERConnection] = useState<Connection | null>(null)
  const [baseConnection, setBaseConnection] = useState<Connection | null>(null)
  const [isERConnected, setIsERConnected] = useState(false)
  const [isBaseConnected, setIsBaseConnected] = useState(false)
  const [erError, setERError] = useState<string | null>(null)
  const [baseError, setBaseError] = useState<string | null>(null)

  // Initialize ER Connection (Magic Router)
  const initializeERConnection = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 [ER] Initializing Magic Router connection...')
      }
      const endpoint = getEREndpoint()
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      })
      
      // Test connection with getSlot instead of getVersion (Magic Router compatible)
      try {
        await connection.getSlot()
      } catch (testError) {
        console.warn('⚠️ [ER] Connection test failed, but continuing anyway:', testError)
        // Continue anyway - Magic Router might not support all RPC methods
      }
      
      setERConnection(connection)
      setIsERConnected(true)
      setERError(null)
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [ER] Magic Router connected:', endpoint)
      }
    } catch (error) {
      console.error('❌ [ER] Failed to connect to Magic Router:', error)
      setERError(error instanceof Error ? error.message : 'Unknown error')
      setIsERConnected(false)
    }
  }

  // Initialize Base Connection (Solana)
  const initializeBaseConnection = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 [Base] Initializing Solana connection...')
      }
      const endpoint = getBaseEndpoint()
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
      })
      
      // Test connection
      await connection.getVersion()
      
      setBaseConnection(connection)
      setIsBaseConnected(true)
      setBaseError(null)
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [Base] Solana connected:', endpoint)
      }
    } catch (error) {
      console.error('❌ [Base] Failed to connect to Solana:', error)
      setBaseError(error instanceof Error ? error.message : 'Unknown error')
      setIsBaseConnected(false)
    }
  }

  // Initialize connections on mount
  useEffect(() => {
    initializeERConnection()
    initializeBaseConnection()
  }, [])

  // Retry functions
  const retryERConnection = () => {
    setERError(null)
    initializeERConnection()
  }

  const retryBaseConnection = () => {
    setBaseError(null)
    initializeBaseConnection()
  }

  const contextValue: ERConnectionContextType = {
    erConnection,
    baseConnection,
    isERConnected,
    isBaseConnected,
    erError,
    baseError,
    retryERConnection,
    retryBaseConnection,
  }

  return (
    <ERConnectionContext.Provider value={contextValue}>
      {children}
    </ERConnectionContext.Provider>
  )
}

// Hook to use ER connections
export function useERConnection() {
  const context = useContext(ERConnectionContext)
  if (!context) {
    throw new Error('useERConnection must be used within ERConnectionProvider')
  }
  return context
}

// Hook to get the appropriate connection for an instruction
export function useConnectionForInstruction(instruction?: string) {
  const { erConnection, baseConnection, isERConnected, isBaseConnected } = useERConnection()
  
  // For now, always use base connection for safety
  // TODO: Implement Magic Router logic
  const shouldUseER = false // instruction && shouldUseER(instruction)
  
  if (shouldUseER && isERConnected && erConnection) {
    return {
      connection: erConnection,
      type: 'er' as const,
      isConnected: isERConnected,
    }
  }
  
  return {
    connection: baseConnection,
    type: 'base' as const,
    isConnected: isBaseConnected,
  }
}
