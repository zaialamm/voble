/**
 * MagicBlock Ephemeral Rollups Hooks
 * 
 * This module provides all the hooks needed for ER integration
 */

// Export shared ER connection
export { erConnection } from './er-connection'

// Re-export temp keypair hook
export { useTempKeypair } from '@/hooks/use-temp-keypair'