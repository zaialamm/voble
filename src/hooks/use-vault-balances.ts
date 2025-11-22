import { useQuery } from '@tanstack/react-query'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

import {
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
  getPlatformVaultPDA,
  getLuckyDrawVaultPDA,
  getAllVaultPDAs
} from './pdas'

export interface VaultBalance {
  address: string
  balance: number // in USDC
  balanceLamports: number // in atomic units
}

export interface VaultBalances {
  daily: VaultBalance
  weekly: VaultBalance
  monthly: VaultBalance
  luckyDraw: VaultBalance
  platform: VaultBalance
  totalPrizePool: number
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
          luckyDraw: vaultPDAs.luckyDraw[0].toString(),
          platform: vaultPDAs.platform[0].toString(),
        })
      }

      try {
        // Fetch all vault balances in parallel
        const [dailyBalance, weeklyBalance, monthlyBalance, luckyDrawBalance, platformBalance] = await Promise.all([
          connection.getTokenAccountBalance(vaultPDAs.daily[0]).catch(() => ({ value: { uiAmount: 0, amount: '0' } })),
          connection.getTokenAccountBalance(vaultPDAs.weekly[0]).catch(() => ({ value: { uiAmount: 0, amount: '0' } })),
          connection.getTokenAccountBalance(vaultPDAs.monthly[0]).catch(() => ({ value: { uiAmount: 0, amount: '0' } })),
          connection.getTokenAccountBalance(vaultPDAs.luckyDraw[0]).catch(() => ({ value: { uiAmount: 0, amount: '0' } })),
          connection.getTokenAccountBalance(vaultPDAs.platform[0]).catch(() => ({ value: { uiAmount: 0, amount: '0' } })),
        ])

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useVaultBalances] Balances fetched:', {
            daily: `${dailyBalance.value.uiAmount} USDC`,
            weekly: `${weeklyBalance.value.uiAmount} USDC`,
            monthly: `${monthlyBalance.value.uiAmount} USDC`,
            luckyDraw: `${luckyDrawBalance.value.uiAmount} USDC`,
            platform: `${platformBalance.value.uiAmount} USDC`,
          })
        }

        // Transform to our interface
        const balances: VaultBalances = {
          daily: {
            address: vaultPDAs.daily[0].toString(),
            balance: dailyBalance.value.uiAmount || 0,
            balanceLamports: Number(dailyBalance.value.amount),
          },
          weekly: {
            address: vaultPDAs.weekly[0].toString(),
            balance: weeklyBalance.value.uiAmount || 0,
            balanceLamports: Number(weeklyBalance.value.amount),
          },
          monthly: {
            address: vaultPDAs.monthly[0].toString(),
            balance: monthlyBalance.value.uiAmount || 0,
            balanceLamports: Number(monthlyBalance.value.amount),
          },
          luckyDraw: {
            address: vaultPDAs.luckyDraw[0].toString(),
            balance: luckyDrawBalance.value.uiAmount || 0,
            balanceLamports: Number(luckyDrawBalance.value.amount),
          },
          platform: {
            address: vaultPDAs.platform[0].toString(),
            balance: platformBalance.value.uiAmount || 0,
            balanceLamports: Number(platformBalance.value.amount),
          },
          totalPrizePool: (dailyBalance.value.uiAmount || 0) + (weeklyBalance.value.uiAmount || 0) + (monthlyBalance.value.uiAmount || 0),
        }

        return balances
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error('❌ [useVaultBalances] Error fetching balances:', err)
        throw new Error(`Failed to fetch vault balances: ${error.message}`)
      }
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
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
export function useVaultBalance(vaultType: 'daily' | 'weekly' | 'monthly' | 'luckyDraw' | 'platform'): {
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
        case 'luckyDraw':  // NEW
          vaultPDA = getLuckyDrawVaultPDA()[0]
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
        const tokenBalance = await connection.getTokenAccountBalance(vaultPDA).catch(() => ({ value: { uiAmount: 0, amount: '0' } }))

        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [useVaultBalance] ${vaultType} balance:`, `${tokenBalance.value.uiAmount} USDC`)
        }

        return {
          address: vaultPDA.toString(),
          balance: tokenBalance.value.uiAmount || 0,
          balanceLamports: Number(tokenBalance.value.amount),
        }
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        console.error(`❌ [useVaultBalance] Error fetching ${vaultType} balance:`, err)
        throw new Error(`Failed to fetch ${vaultType} vault balance: ${error.message}`)
      }
    },
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
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
      ? balances.daily.balanceLamports + balances.weekly.balanceLamports + balances.monthly.balanceLamports + balances.luckyDraw.balanceLamports
      : 0,
    isLoading,
    error,
  }
}
