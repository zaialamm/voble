/**
 * MagicBlock Ephemeral Rollups Configuration
 * 
 * This file contains all the endpoints and constants needed for ER integration
 */

import { PublicKey } from '@solana/web3.js'

// ER Endpoints (from MagicBlock docs)
export const ER_ENDPOINTS = {
  // Magic Router - automatically routes transactions to ER or base layer
  MAGIC_ROUTER_DEVNET: 'https://devnet-router.magicblock.app',
  
  // Direct ER endpoints
  ER_DEVNET: 'https://devnet.magicblock.app',
  
  // Base Solana endpoints
  SOLANA_DEVNET: 'https://api.devnet.solana.com',
  
  // TEE (Trusted Execution Environment) for private ERs
  TEE_DEVNET: 'https://tee.magicblock.app/',
} as const

// ER Validators (from MagicBlock docs)
export const ER_VALIDATORS = {
  ASIA_DEVNET: new PublicKey('MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57'),
  EU_DEVNET: new PublicKey('MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e'),
  US_DEVNET: new PublicKey('MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'),
  LOCAL: new PublicKey('mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev'),
} as const

// Program IDs (from your IDL)
export const PROGRAM_IDS = {
  VOBLE: new PublicKey('86XhBCaTT5RdEeJKb6tHJ2tCoujhahsFFKpVkdHnaNvt'),
  DELEGATION: new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh'),
  MAGIC_CONTEXT: new PublicKey('MagicContext1111111111111111111111111111111'),
} as const

// ER Configuration
export const ER_CONFIG = {
  // Default validator (Asia for now)
  DEFAULT_VALIDATOR: ER_VALIDATORS.ASIA_DEVNET,
  
  // Commit frequency in milliseconds (30 seconds)
  COMMIT_FREQUENCY_MS: 30_000,
  
  // Session duration in minutes
  SESSION_DURATION_MINUTES: 60,
  
  // Session topup amount in SOL
  SESSION_TOPUP_SOL: 0.01,
} as const

// Environment-based endpoint selection
export function getEREndpoint(): string {
  // For now, always use devnet
  // TODO: Add environment variable support
  return ER_ENDPOINTS.MAGIC_ROUTER_DEVNET
}

export function getBaseEndpoint(): string {
  return ER_ENDPOINTS.SOLANA_DEVNET
}

// Helper to determine if we should use ER for a specific instruction
export function shouldUseER(instruction: string): boolean {
  const ER_INSTRUCTIONS = [
    'delegate_session',
    'submit_guess',
    'undelegate_session',
    'complete_voble_game',
  ]
  
  return ER_INSTRUCTIONS.includes(instruction)
}

// Helper to get the appropriate validator based on region
export function getValidatorByRegion(region: 'asia' | 'eu' | 'us' | 'local' = 'asia'): PublicKey {
  switch (region) {
    case 'asia':
      return ER_VALIDATORS.ASIA_DEVNET
    case 'eu':
      return ER_VALIDATORS.EU_DEVNET
    case 'us':
      return ER_VALIDATORS.US_DEVNET
    case 'local':
      return ER_VALIDATORS.LOCAL
    default:
      return ER_VALIDATORS.ASIA_DEVNET
  }
}
