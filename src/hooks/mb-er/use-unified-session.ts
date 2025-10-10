import React from 'react'
import { useSessionWallet } from '@magicblock-labs/gum-react-sdk'
import { useERConnection } from '@/components/mb-er/er-connection-provider'
import { PROGRAM_IDS, ER_CONFIG } from './config'

interface UnifiedSessionStatus {
  // Session Key Status (GUM)
  hasSessionKey: boolean
  sessionPublicKey: string | null
  sessionToken: string | null
  isLoadingSession: boolean // ✅ NEW: Loading state for async session check
  
  // ER Connection Status
  isERConnected: boolean
  isBaseConnected: boolean
  
  // Combined Status
  isGaslessReady: boolean // Has session key AND ER connected
  canPlayGasless: boolean // Ready for gasless gameplay
  
  // Actions
  createSession: () => Promise<{ success: boolean; error?: string }>
  revokeSession: () => Promise<void>
  
  // Status Messages
  statusMessage: string
  statusType: 'success' | 'warning' | 'error' | 'info'
}

export function useUnifiedSession(): UnifiedSessionStatus {
  const sessionWallet = useSessionWallet()
  const { isERConnected, isBaseConnected } = useERConnection()
  
  // Session Key Status - check both sessionToken property and getSessionToken method
  const [sessionTokenFromMethod, setSessionTokenFromMethod] = React.useState<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = React.useState(true)
  
  // ✅ FIX: Extract only primitive/stable values to prevent infinite loop
  const sessionWalletPublicKey = sessionWallet?.publicKey?.toString()
  const sessionTokenProperty = sessionWallet?.sessionToken
  const hasGetSessionTokenMethod = !!sessionWallet?.getSessionToken
  
  React.useEffect(() => {
    const checkSession = async () => {
      setIsLoadingSession(true)
      if (sessionWallet?.getSessionToken) {
        try {
          const token = await sessionWallet.getSessionToken()
          setSessionTokenFromMethod(token)
          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [Unified Session] Session token from method:', token)
          }
        } catch (error) {
          console.error('❌ [Unified Session] Error getting session token:', error)
        }
      } else {
        setSessionTokenFromMethod(null)
      }
      setIsLoadingSession(false)
    }
    checkSession()
  }, [sessionWalletPublicKey, sessionTokenProperty, hasGetSessionTokenMethod]) // ✅ Only primitive dependencies
  
  // Debug: Log session wallet properties (moved to useEffect to avoid render spam)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [Unified Session] Session wallet:', {
        hasWallet: !!sessionWallet,
        publicKey: sessionWalletPublicKey,
        sessionTokenProperty,
        sessionTokenMethod: sessionTokenFromMethod,
      })
    }
  }, [sessionWalletPublicKey, sessionTokenProperty, sessionTokenFromMethod])
  
  // Check both the property and the method result
  const hasSessionKey = !!(sessionWallet?.sessionToken || sessionTokenFromMethod)
  const sessionPublicKey = sessionWallet?.publicKey?.toString() || null
  const sessionToken = sessionWallet?.sessionToken || sessionTokenFromMethod
  
  // ✅ TODO: Add session expiry validation
  // Session tokens have a validUntil field that needs to be checked
  // This requires fetching the session token account from chain and parsing the data
  // For now, we rely on on-chain validation in the program
  // Future enhancement: Add client-side expiry check to show warning before expiry
  
  // Combined Status Logic
  const isGaslessReady = hasSessionKey && isERConnected
  const canPlayGasless = isGaslessReady && isBaseConnected
  
  // Create Session (using GUM)
  const createSession = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!sessionWallet?.createSession) {
        throw new Error('Session wallet not available')
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [Unified Session] Creating GUM session for gasless gameplay...')
        console.log('🔑 [Unified Session] Target program:', PROGRAM_IDS.VOBLE.toString())
        console.log('🔑 [Unified Session] Top-up:', ER_CONFIG.SESSION_TOPUP_SOL, 'SOL')
        console.log('🔑 [Unified Session] Duration:', ER_CONFIG.SESSION_DURATION_MINUTES, 'minutes')
      }
      
      const session = await sessionWallet.createSession(
        PROGRAM_IDS.VOBLE, // Target program
        ER_CONFIG.SESSION_TOPUP_SOL * 1e9, // Convert SOL to lamports
        ER_CONFIG.SESSION_DURATION_MINUTES, // Duration in minutes
        (sessionInfo) => {
          // Callback when session is created
          if (process.env.NODE_ENV === 'development') {
            console.log('🎉 [Unified Session] Session created callback:', sessionInfo)
          }
          setSessionTokenFromMethod(sessionInfo.sessionToken)
        }
      )
      
      if (!session) {
        throw new Error('Failed to create session')
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [Unified Session] GUM session created successfully!')
        console.log('🔑 [Unified Session] Session object:', {
          publicKey: session.publicKey?.toString(),
          sessionToken: session.sessionToken,
        })
      }
      
      // Force update the session token
      if (session.sessionToken) {
        setSessionTokenFromMethod(session.sessionToken)
      }
      
      return { success: true }
      
    } catch (error: any) {
      console.error('❌ [Unified Session] Failed to create session:', error)
      console.error('❌ [Unified Session] Error details:', {
        message: error.message,
        code: error.code,
        logs: error.logs,
      })
      
      // ✅ FIX: Handle "already processed" error - but ONLY if it's NOT a simulation failure
      // Simulation failures mean the transaction never went through
      const isSimulationFailure = error.message?.includes('Simulation failed') || 
                                   error.message?.includes('simulation failed')
      const isAlreadyProcessed = error.message?.includes('already been processed') || 
                                 error.message?.includes('already processed') ||
                                 error.transactionMessage?.includes('already been processed') ||
                                 error.transactionMessage?.includes('already processed')
      
      // If it's a simulation failure, it's a real error - don't treat as success
      if (isSimulationFailure) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ [Unified Session] Transaction simulation failed - this is a real error')
          console.error('💡 [Unified Session] Possible causes:')
          console.error('   - Session already exists for this wallet')
          console.error('   - Insufficient funds')
          console.error('   - Invalid program state')
        }
        return {
          success: false,
          error: error.message || 'Transaction simulation failed'
        }
      }
      
      // Only treat as potential success if transaction was sent (not simulation failure)
      if (isAlreadyProcessed && !isSimulationFailure) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [Unified Session] Transaction already processed - retrieving existing session')
          console.log('⏰ [Unified Session] Waiting for GUM SDK to finish IndexedDB write...')
        }
        
        // ✅ FIX: Wait MUCH longer for GUM SDK to complete its internal IndexedDB write
        // The SDK needs time to: confirm tx, generate keypair, encrypt, and write to IndexedDB
        await new Promise(resolve => setTimeout(resolve, 10000)) // 10 seconds instead of 2
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [Unified Session] Starting to poll IndexedDB for session token...')
        }
        
        // Try to get the session token from IndexedDB with extended polling
        if (sessionWallet.getSessionToken) {
          // Poll for session token (may take time to write to IndexedDB)
          let retries = 0
          const maxRetries = 40 // 20 seconds of polling (40 * 500ms)
          while (retries < maxRetries) {
            try {
              const token = await sessionWallet.getSessionToken()
              if (token) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('✅ [Unified Session] Found existing session token:', token)
                  console.log(`⏱️ [Unified Session] Token found after ${retries * 0.5} seconds of polling`)
                }
                setSessionTokenFromMethod(token)
                return { success: true }  // ✅ Mark as success since session exists!
              }
            } catch {
              if (process.env.NODE_ENV === 'development' && retries % 10 === 0) {
                console.log(`⏳ [Unified Session] Polling for session token... (${retries + 0.5}/${maxRetries}) - ${(retries * 0.5).toFixed(1)}s elapsed`)
              }
            }
            await new Promise(resolve => setTimeout(resolve, 500))
            retries++
          }
          
          if (process.env.NODE_ENV === 'development') {
            console.error('❌ [Unified Session] Failed to retrieve session after 30 seconds of waiting')
            console.error('💡 [Unified Session] The session may still be writing to IndexedDB - check browser DevTools')
          }
        }
        
        // If we can't retrieve it, still mark as success since transaction went through
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [Unified Session] Session created but not yet in IndexedDB - will be available on refresh')
        }
        return { success: true }
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create session'
      }
    }
  }
  
  // Revoke Session (using GUM)
  const revokeSession = async (): Promise<void> => {
    try {
      if (sessionWallet?.revokeSession) {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔒 [Unified Session] Revoking GUM session...')
        }
        await sessionWallet.revokeSession()
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Unified Session] Session revoked successfully!')
        }
      }
    } catch (error) {
      console.error('❌ [Unified Session] Failed to revoke session:', error)
    }
  }
  
  // Status Message Logic
  const getStatusMessage = (): { message: string; type: 'success' | 'warning' | 'error' | 'info' } => {
    if (!isBaseConnected) {
      return {
        message: 'Connecting to Solana...',
        type: 'info'
      }
    }
    
    if (!isERConnected) {
      return {
        message: 'Connecting to Ephemeral Rollup...',
        type: 'info'
      }
    }
    
    if (!hasSessionKey) {
      return {
        message: 'Create session for gasless gameplay',
        type: 'warning'
      }
    }
    
    if (canPlayGasless) {
      return {
        message: 'Ready for gasless gameplay!',
        type: 'success'
      }
    }
    
    return {
      message: 'Checking session status...',
      type: 'info'
    }
  }
  
  const { message: statusMessage, type: statusType } = getStatusMessage()
  
  return {
    // Session Key Status
    hasSessionKey,
    sessionPublicKey,
    sessionToken,
    isLoadingSession, // ✅ NEW: Return loading state
    
    // ER Connection Status
    isERConnected,
    isBaseConnected,
    
    // Combined Status
    isGaslessReady,
    canPlayGasless,
    
    // Actions
    createSession,
    revokeSession,
    
    // Status Messages
    statusMessage,
    statusType,
  }
}
