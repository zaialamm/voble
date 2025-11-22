import { useQuery } from '@tanstack/react-query'

import { vobleProgram } from './program'
import { getCurrentPeriodIds, getLeaderboardPDA } from './pdas'

export type PeriodType = 'daily' | 'weekly' | 'monthly'

export interface LeaderboardRow {
  rank: number
  player: string
  username: string
  score: number
  guessesUsed: number
  timeMs: number
  timestamp: number
}

export interface UseLeaderboardResult {
  entries: LeaderboardRow[]
  totalPlayers: number
  periodId: string
  prizePool: number
  isLoading: boolean
  isFetching: boolean
  error: string | null
  refetch: () => void
}

const toNumber = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (value && typeof value.toNumber === 'function') {
    try {
      return value.toNumber()
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useLeaderboard] Failed to convert BN to number', err)
      }
    }
  }
  return 0
}

export function useLeaderboard(periodType: PeriodType): UseLeaderboardResult {
  const { daily, weekly, monthly } = getCurrentPeriodIds()
  const periodId =
    periodType === 'daily' ? daily : periodType === 'weekly' ? weekly : monthly

  const queryResult = useQuery({
    queryKey: ['leaderboard', periodType, periodId],
    queryFn: async (): Promise<Omit<UseLeaderboardResult, 'isLoading' | 'isFetching' | 'error' | 'refetch'>> => {
      const [leaderboardPda] = getLeaderboardPDA(periodId, periodType)

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [useLeaderboard] Fetching leaderboard', {
          periodType,
          periodId,
          leaderboardPda: leaderboardPda.toString(),
        })
      }

      const account = await (vobleProgram.account as any).periodLeaderboard.fetchNullable(
        leaderboardPda,
      )

      if (!account) {
        if (process.env.NODE_ENV === 'development') {
          console.log('ℹ️ [useLeaderboard] No leaderboard account found for period:', {
            periodType,
            periodId,
          })
        }

        return {
          entries: [],
          totalPlayers: 0,
          periodId,
          prizePool: 0,
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useLeaderboard] Leaderboard account fetched', {
          periodType,
          periodId,
          totalPlayers: account.totalPlayers ?? account.total_players,
          entries: account.entries?.length,
        })
      }

      const entriesRaw = (account.entries ?? []) as any[]

      const entries: LeaderboardRow[] = entriesRaw.map((e, idx) => ({
        rank: idx + 1,
        player: e.player.toString(),
        username: e.username,
        score: Number(e.score ?? 0),
        guessesUsed: Number(e.guessesUsed ?? e.guesses_used ?? 0),
        timeMs: Number(e.timeMs ?? e.time_ms ?? 0),
        timestamp: Number(e.timestamp ?? 0),
      }))

      const totalPlayers: number = Number(
        account.totalPlayers ?? account.total_players ?? entries.length,
      )

      const prizePoolLamports = toNumber(account.prizePool ?? account.prize_pool ?? 0)

      return {
        entries,
        totalPlayers,
        periodId,
        prizePool: prizePoolLamports,
      }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  return {
    entries: queryResult.data?.entries ?? [],
    totalPlayers: queryResult.data?.totalPlayers ?? 0,
    periodId: queryResult.data?.periodId ?? periodId,
    prizePool: queryResult.data?.prizePool ?? 0,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    error: queryResult.error?.message ?? null,
    refetch: queryResult.refetch,
  }
}
