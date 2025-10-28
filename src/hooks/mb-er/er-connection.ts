import { ConnectionMagicRouter } from '@magicblock-labs/ephemeral-rollups-sdk'

/**
 * Singleton Magic Router connection for Ephemeral Rollups
 * Shared across all hooks to prevent multiple WebSocket connections
 */
export const erConnection = new ConnectionMagicRouter(
  "https://devnet-router.magicblock.app",
  { 
    wsEndpoint: "wss://devnet-router.magicblock.app",
    commitment: 'confirmed'
  }
  
)