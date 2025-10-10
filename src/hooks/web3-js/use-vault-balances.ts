import { useQuery } from '@tanstack/react-query'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

import { 
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
  getPlatformVaultPDA,
  getAllVaultPDAs
} from './pdas'

export interface VaultBalance {
  address: string
  balance: number // in SOL
  balanceLamports: number // in lamports
}

export interface VaultBalances {
  daily: VaultBalance
  weekly: VaultBalance
  monthly: VaultBalance
  platform: VaultBalance
  totalPrizePool: number // Combined daily + weekly + monthly in SOL
}

export interface VaultBalancesResult {
  balances: VaultBalances | null
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

export function useVaultBalances(): VaultBalancesResult {
  const queryResult = useQuery({
    queryKey: ['vaultBalances'],
    queryFn: async (): Promise<VaultBalances> => {
      if (process.env.NODE_ENV === 'development') {
        console.log('💰 [useVaultBalances] Fetching vault balances...')
      }

      // Get RPC connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Get all vault PDAs
      const vaultPDAs = getAllVaultPDAs()

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useVaultBalances] Vault PDAs:', {
          daily: vaultPDAs.daily[0].toString(),
          weekly: vaultPDAs.weekly[0].toString(),
          monthly: vaultPDAs.monthly[0].toString(),
          platform: vaultPDAs.platform[0].toString(),
        })
      }

      try {
        // Fetch all vault balances in parallel
        const [dailyBalance, weeklyBalance, monthlyBalance, platformBalance] = await Promise.all([
          connection.getBalance(vaultPDAs.daily[0]),
          connection.getBalance(vaultPDAs.weekly[0]),
          connection.getBalance(vaultPDAs.monthly[0]),
          connection.getBalance(vaultPDAs.platform[0]),
        ])

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useVaultBalances] Balances fetched:', {
            daily: `${dailyBalance / LAMPORTS_PER_SOL} SOL`,
            weekly: `${weeklyBalance / LAMPORTS_PER_SOL} SOL`,
            monthly: `${monthlyBalance / LAMPORTS_PER_SOL} SOL`,
            platform: `${platformBalance / LAMPORTS_PER_SOL} SOL`,
          })
        }

        // Transform to our interface
        const balances: VaultBalances = {
          daily: {
            address: vaultPDAs.daily[0].toString(),
            balance: dailyBalance / LAMPORTS_PER_SOL,
            balanceLamports: dailyBalance,
          },
          weekly: {
            address: vaultPDAs.weekly[0].toString(),
            balance: weeklyBalance / LAMPORTS_PER_SOL,
            balanceLamports: weeklyBalance,
          },
          monthly: {
            address: vaultPDAs.monthly[0].toString(),
            balance: monthlyBalance / LAMPORTS_PER_SOL,
            balanceLamports: monthlyBalance,
          },
          platform: {
            address: vaultPDAs.platform[0].toString(),
            balance: platformBalance / LAMPORTS_PER_SOL,
            balanceLamports: platformBalance,
          },
          totalPrizePool: (dailyBalance + weeklyBalance + monthlyBalance) / LAMPORTS_PER_SOL,
        }

        return balances
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error('❌ [useVaultBalances] Error fetching balances:', err)
        throw new Error(`Failed to fetch vault balances: ${error.message}`)
      }
    },
    staleTime: 15000, // Consider data stale after 15 seconds
    refetchInterval: false, // Refetch every 30 seconds
    retry: 3,
  })

  return {
    balances: queryResult.data || null,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}

/**
 * Hook to get individual vault balance
 */
export function useVaultBalance(vaultType: 'daily' | 'weekly' | 'monthly' | 'platform'): {
  balance: VaultBalance | null
  isLoading: boolean
  error: string | null
  refetch: () => void
} {
  const queryResult = useQuery({
    queryKey: ['vaultBalance', vaultType],
    queryFn: async (): Promise<VaultBalance> => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`💰 [useVaultBalance] Fetching ${vaultType} vault balance...`)
      }

      // Get RPC connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_DEVNET || 'https://api.devnet.solana.com',
        'confirmed'
      )

      // Get the specific vault PDA
      let vaultPDA: PublicKey
      switch (vaultType) {
        case 'daily':
          vaultPDA = getDailyPrizeVaultPDA()[0]
          break
        case 'weekly':
          vaultPDA = getWeeklyPrizeVaultPDA()[0]
          break
        case 'monthly':
          vaultPDA = getMonthlyPrizeVaultPDA()[0]
          break
        case 'platform':
          vaultPDA = getPlatformVaultPDA()[0]
          break
        default:
          throw new Error(`Invalid vault type: ${vaultType}`)
      }

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 [useVaultBalance] ${vaultType} vault PDA:`, vaultPDA.toString())
      }

      try {
        const balance = await connection.getBalance(vaultPDA)

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [useVaultBalance] ${vaultType} balance:`, `${balance / LAMPORTS_PER_SOL} SOL`)
        }

        return {
          address: vaultPDA.toString(),
          balance: balance / LAMPORTS_PER_SOL,
          balanceLamports: balance,
        }
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error(`❌ [useVaultBalance] Error fetching ${vaultType} balance:`, err)
        throw new Error(`Failed to fetch ${vaultType} vault balance: ${error.message}`)
      }
    },
    staleTime: 15000, // Consider data stale after 15 seconds
    refetchInterval: false, // Refetch every 30 seconds
    retry: 3,
  })

  return {
    balance: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}

/**
 * Hook to get total prize pool (daily + weekly + monthly)
 */
export function useTotalPrizePool(): {
  totalSOL: number
  totalLamports: number
  isLoading: boolean
  error: string | null
} {
  const { balances, isLoading, error } = useVaultBalances()

  return {
    totalSOL: balances?.totalPrizePool || 0,
    totalLamports: balances 
      ? balances.daily.balanceLamports + balances.weekly.balanceLamports + balances.monthly.balanceLamports
      : 0,
    isLoading,
    error,
  }
}
