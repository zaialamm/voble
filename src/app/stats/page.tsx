'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeaderboard, useVaultBalances } from '@/hooks'
import { vobleProgram } from '@/hooks/program'

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

const formatSol = (amount: number, digits = 3) => `${amount.toFixed(digits)} SOL`

const getLeaderboardFallback = (isLoading: boolean, value: number) =>
  isLoading ? <Skeleton className="h-8 w-20 mx-auto" /> : formatNumber(value)

const formatAddress = (address: string) => {
  if (!address || address.length <= 8) return address
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

const StatCard = ({ title, value }: { title: string; value: React.ReactNode }) => (
  <Card className="bg-slate-50 dark:bg-slate-900">
    <CardContent className="py-4 md:py-6 text-center space-y-1">
      <div className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
      <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400">{title}</p>
    </CardContent>
  </Card>
)

export default function StatsPage() {
  const vaults = useVaultBalances()
  const dailyLeaderboard = useLeaderboard('daily')
  const weeklyLeaderboard = useLeaderboard('weekly')
  const monthlyLeaderboard = useLeaderboard('monthly')

  const protocolStatsQuery = useQuery({
    queryKey: ['protocol-stats'],
    queryFn: async () => {
      const accounts = (vobleProgram.account as any)
      const [profiles, entitlements] = await Promise.all([
        accounts.userProfile?.all?.([]) ?? [],
        accounts.winnerEntitlement?.all?.([]) ?? [],
      ])

      const totalPlayers = Array.isArray(profiles) ? profiles.length : 0
      const totalPrizeClaimedLamports = Array.isArray(entitlements)
        ? entitlements.reduce((sum: number, item: any) => {
          if (item?.account?.claimed) {
            return sum + Number(item.account.amount ?? 0)
          }
          return sum
        }, 0)
        : 0

      return { totalPlayers, totalPrizeClaimedLamports }
    },
    staleTime: 60_000,
  })

  const prizeTotals = vaults.balances
    ? vaults.balances.daily.balance + vaults.balances.weekly.balance + vaults.balances.monthly.balance
    : 0

  const totalPlayersDisplay = useMemo(() => {
    if (protocolStatsQuery.isLoading) {
      return <Skeleton className="h-8 w-24 mx-auto" />
    }
    return formatNumber(protocolStatsQuery.data?.totalPlayers ?? 0)
  }, [protocolStatsQuery.isLoading, protocolStatsQuery.data?.totalPlayers])

  const totalPrizeClaimedSol = useMemo(() => {
    if (!protocolStatsQuery.data) return 0
    return (protocolStatsQuery.data.totalPrizeClaimedLamports || 0) / LAMPORTS_PER_SOL
  }, [protocolStatsQuery.data])

  const totalPrizeClaimedDisplay = protocolStatsQuery.isLoading
    ? <Skeleton className="h-8 w-24 mx-auto" />
    : formatSol(totalPrizeClaimedSol)

  const recentDailyLeaders = dailyLeaderboard.entries.slice(0, 5)
  const weeklySnapshot = weeklyLeaderboard.entries.slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Protocol Statistics</h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Live snapshots pulled directly from the Solana program</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard title="Total Players" value={totalPlayersDisplay} />
          <StatCard
            title="Active Prize Pool"
            value={vaults.isLoading ? <Skeleton className="h-8 w-24 mx-auto" /> : formatSol(prizeTotals)}
          />
          <StatCard title="Total Prize Claimed" value={totalPrizeClaimedDisplay} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Prize Pool Breakdown</CardTitle>
              <p className="text-sm text-muted-foreground">Pulling balances directly from the prize vault PDAs</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['daily', 'weekly', 'monthly'] as const).map(period => (
                <div key={period} className="flex justify-between items-center">
                  <span className="capitalize text-slate-600 dark:text-slate-400">{period}</span>
                  {vaults.isLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <span className="text-xl font-semibold text-slate-900 dark:text-white">
                      {formatSol(vaults.balances?.[period].balance ?? 0)}
                    </span>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                <span className="font-medium text-slate-900 dark:text-white">Total Active</span>
                {vaults.isLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatSol(prizeTotals)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg">Weekly Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground">Top performers for the current calendar week</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyLeaderboard.isLoading && (
                <div className="space-y-2">
                  {[0, 1, 2].map(idx => (
                    <Skeleton key={idx} className="h-14 w-full" />
                  ))}
                </div>
              )}
              {!weeklyLeaderboard.isLoading && weeklySnapshot.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No weekly games recorded yet.</p>
              )}
              {!weeklyLeaderboard.isLoading && weeklySnapshot.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="space-y-3 min-w-[560px]">
                    {weeklySnapshot.map((entry, idx) => (
                      <div
                        key={entry.player + idx}
                        className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            #{idx + 1} {entry.username || entry.player.slice(0, 4) + '…'}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatAddress(entry.player)}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {entry.score.toLocaleString()} pts
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.guessesUsed} guesses</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Daily Leaders</h2>
                <p className="text-sm text-muted-foreground">Latest results from today’s daily leaderboard</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Period {dailyLeaderboard.periodId}
              </Badge>
            </div>
            {!dailyLeaderboard.isLoading && dailyLeaderboard.error && (
              <p className="text-sm text-red-500">{dailyLeaderboard.error}</p>
            )}
          </div>

          {dailyLeaderboard.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(idx => (
                <Skeleton key={idx} className="h-14 w-full" />
              ))}
            </div>
          ) : recentDailyLeaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No games recorded yet for the current day.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="space-y-3 min-w-[620px]">
                {recentDailyLeaders.map(entry => (
                  <div
                    key={entry.player}
                    className="flex items-center justify-between border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {entry.username || entry.player.slice(0, 6) + '…'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground whitespace-nowrap">
                        {formatAddress(entry.player)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-base font-bold text-slate-900 dark:text-white">
                        {entry.score.toLocaleString()} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.guessesUsed} guesses · {(entry.timeMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
