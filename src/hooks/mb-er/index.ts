/**
 * MagicBlock Ephemeral Rollups Hooks
 * 
 * This module provides all the hooks needed for ER integration
 */

// Configuration
export * from './config'

// Delegation hooks
export * from './use-delegate-user-profile'
export * from './use-commit-user-profile'

// Session management
export * from './use-unified-session'

// Transaction hooks
export * from './use-er-transaction'

// Re-export connection provider hook
export { useERConnection, useConnectionForInstruction } from '@/components/mb-er/er-connection-provider'
