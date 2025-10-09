import { PublicKey } from '@solana/web3.js'
import { VOBLE_PROGRAM_ID } from './program'

// Session Keys program ID
export const SESSION_KEYS_PROGRAM_ID = new PublicKey('KeyspM2ssCJbqUhQ4k7sveSiY4WjnYsrXkC8oDbwde5')

/**
 * PDA seed constants (matching the smart contract)
 */
export const PDA_SEEDS = {
  USER_PROFILE: 'user_profile',
  SESSION: 'session',
  SESSION_TOKEN: 'session_token',
  GLOBAL_CONFIG: 'global_config_v2',
  DAILY_PRIZE_VAULT: 'daily_prize_vault',
  WEEKLY_PRIZE_VAULT: 'weekly_prize_vault',
  MONTHLY_PRIZE_VAULT: 'monthly_prize_vault',
  PLATFORM_VAULT: 'platform_vault',
  LEADERBOARD: 'leaderboard',
  DAILY_PERIOD: 'daily_period',
  WEEKLY_PERIOD: 'weekly_period',
  MONTHLY_PERIOD: 'monthly_period',
  WINNER_ENTITLEMENT: 'winner_entitlement',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const

/**
 * Derive user profile PDA
 */
export function getUserProfilePDA(playerAddress: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.USER_PROFILE, 'utf8'),
      playerAddress.toBuffer(),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive session PDA
 */
export function getSessionPDA(playerAddress: PublicKey, periodId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.SESSION, 'utf8'),
      playerAddress.toBuffer(),
      Buffer.from(periodId, 'utf8'), // Explicit UTF-8 encoding for consistency
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive session token PDA (for session keys)
 * Seeds: ["session_token", authority, target_program, session_signer]
 */
export function getSessionTokenPDA(
  authority: PublicKey,
  targetProgram: PublicKey,
  sessionSigner: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.SESSION_TOKEN, 'utf8'),
      authority.toBuffer(),
      targetProgram.toBuffer(),
      sessionSigner.toBuffer(),
    ],
    SESSION_KEYS_PROGRAM_ID
  )
}

/**
 * Derive global config PDA
 */
export function getGlobalConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG, 'utf8')],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive daily prize vault PDA
 */
export function getDailyPrizeVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.DAILY_PRIZE_VAULT, 'utf8')],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive weekly prize vault PDA
 */
export function getWeeklyPrizeVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.WEEKLY_PRIZE_VAULT, 'utf8')],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive monthly prize vault PDA
 */
export function getMonthlyPrizeVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.MONTHLY_PRIZE_VAULT, 'utf8')],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive platform vault PDA
 */
export function getPlatformVaultPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PDA_SEEDS.PLATFORM_VAULT, 'utf8')],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive leaderboard PDA
 */
export function getLeaderboardPDA(periodId: string, leaderboardType: 'daily' | 'weekly' | 'monthly'): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.LEADERBOARD, 'utf8'),
      Buffer.from(periodId, 'utf8'),
      Buffer.from(leaderboardType, 'utf8'),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive daily period state PDA
 */
export function getDailyPeriodPDA(periodId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.DAILY_PERIOD, 'utf8'),
      Buffer.from(periodId, 'utf8'),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive weekly period state PDA
 */
export function getWeeklyPeriodPDA(periodId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.WEEKLY_PERIOD, 'utf8'),
      Buffer.from(periodId, 'utf8'),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive monthly period state PDA
 */
export function getMonthlyPeriodPDA(periodId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.MONTHLY_PERIOD, 'utf8'),
      Buffer.from(periodId, 'utf8'),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Derive winner entitlement PDA
 */
export function getWinnerEntitlementPDA(
  winnerAddress: PublicKey,
  entitlementType: 'daily' | 'weekly' | 'monthly',
  periodId: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(PDA_SEEDS.WINNER_ENTITLEMENT, 'utf8'),
      winnerAddress.toBuffer(),
      Buffer.from(entitlementType, 'utf8'),
      Buffer.from(periodId, 'utf8'),
    ],
    VOBLE_PROGRAM_ID
  )
}

/**
 * Get all vault PDAs
 */
export function getAllVaultPDAs(): {
  daily: [PublicKey, number]
  weekly: [PublicKey, number]
  monthly: [PublicKey, number]
  platform: [PublicKey, number]
} {
  return {
    daily: getDailyPrizeVaultPDA(),
    weekly: getWeeklyPrizeVaultPDA(),
    monthly: getMonthlyPrizeVaultPDA(),
    platform: getPlatformVaultPDA(),
  }
}

/**
 * Helper to log PDA derivation for debugging
 */
export function logPDADerivation(
  name: string,
  seeds: (Buffer | Uint8Array)[],
  pda: PublicKey,
  bump: number
): void {
  console.log(`🔑 [PDA] ${name}:`, {
    seeds: seeds.map(seed => seed.toString()),
    pda: pda.toString(),
    bump,
    programId: VOBLE_PROGRAM_ID.toString(),
  })
}

/**
 * Validate that a PDA was derived correctly
 */
export function validatePDA(
  expectedPDA: PublicKey,
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey = VOBLE_PROGRAM_ID
): boolean {
  try {
    const [derivedPDA] = PublicKey.findProgramAddressSync(seeds, programId)
    return derivedPDA.equals(expectedPDA)
  } catch {
    return false
  }
}

/**
 * Get period ID for current day (YYYY-MM-DD format)
 */
export function getCurrentDayPeriodId(): string {
  const now = new Date()
  return now.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Get period ID for current week (YYYY-WW format)
 */
export function getCurrentWeekPeriodId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7)
  return `${year}-W${week.toString().padStart(2, '0')}`
}

/**
 * Get period ID for current month (YYYY-MM format)
 */
export function getCurrentMonthPeriodId(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get all current period IDs
 */
export function getCurrentPeriodIds(): {
  daily: string
  weekly: string
  monthly: string
} {
  return {
    daily: getCurrentDayPeriodId(),
    weekly: getCurrentWeekPeriodId(),
    monthly: getCurrentMonthPeriodId(),
  }
}
