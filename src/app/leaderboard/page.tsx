'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Users, TrendingUp, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useVaultBalances } from '@/hooks/use-vault-balances'

type PeriodType = 'daily' | 'weekly' | 'monthly'

export default function LeaderboardPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodType>('daily')
  const { entries, totalPlayers, isLoading, error } = useLeaderboard(activePeriod)
  const { balances } = useVaultBalances()
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calculateTimeLeft = () => {
      // 1. Get current time in UTC+8
      const now = new Date()
      const utc8TimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })
      const nowUtc8 = new Date(utc8TimeStr)

      let targetDate = new Date(nowUtc8)

      if (activePeriod === 'daily') {
        // Next day at 00:00:00
        targetDate.setDate(nowUtc8.getDate() + 1)
        targetDate.setHours(0, 0, 0, 0)
      } else if (activePeriod === 'weekly') {
        // Next Monday at 00:00:00
        const day = nowUtc8.getDay() // 0 is Sunday, 1 is Monday
        const daysUntilMonday = (8 - day) % 7 || 7
        targetDate.setDate(nowUtc8.getDate() + daysUntilMonday)
        targetDate.setHours(0, 0, 0, 0)
      } else if (activePeriod === 'monthly') {
        // 1st of next month at 00:00:00
        targetDate.setMonth(nowUtc8.getMonth() + 1)
        targetDate.setDate(1)
        targetDate.setHours(0, 0, 0, 0)
      }

      const diff = targetDate.getTime() - nowUtc8.getTime()



      if (diff <= 0) {
        return 'Calculating...'
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (activePeriod === 'daily') {
        return `${hours}h ${minutes}m ${seconds}s`
      }
      return `${days}d ${hours}h ${minutes}m ${seconds}s`
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    setTimeLeft(calculateTimeLeft())

    return () => clearInterval(timer)
  }, [activePeriod])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatAddress = (address: string) => {
    if (!address || address.length <= 8) return address
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }



  const getPeriodLabel = (period: PeriodType) => {
    return period.charAt(0).toUpperCase() + period.slice(1)
  }

  const getPrizePoolForPeriod = (period: PeriodType) => {
    if (!balances) return 0

    switch (period) {
      case 'daily':
        return balances.daily.balance
      case 'weekly':
        return balances.weekly.balance
      case 'monthly':
        return balances.monthly.balance
      default:
        return 0
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
            Top players competing for daily, weekly, and monthly prizes
          </p>
        </div>

        {/* Period Tabs */}
        <div className="mb-6 md:mb-8">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-full sm:w-fit overflow-x-auto">
            {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((period) => (
              <Button
                key={period}
                variant={activePeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActivePeriod(period)}
                className={`flex-1 sm:flex-none px-4 ${activePeriod === period
                  ? 'bg-white dark:bg-slate-700 shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm dark:shadow-none flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Players</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {totalPlayers.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm dark:shadow-none flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-600 dark:text-yellow-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Prize Pool</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {getPrizePoolForPeriod(activePeriod).toFixed(4)} <span className="text-sm font-normal text-slate-500">SOL</span>
              </p>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm dark:shadow-none flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Time Remaining</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                {timeLeft}
              </p>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Rankings
              </h2>
            </div>
            {isLoading && (
              <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                Updating...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="divide-y divide-slate-200 dark:divide-white/5 min-w-[600px]">
              {entries.length === 0 && !isLoading && !error && (
                <div className="px-6 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">No players on the leaderboard yet.</p>
                </div>
              )}

              {entries.map((player) => {
                let rankIcon = <span className="font-mono text-slate-400 dark:text-slate-500 font-medium">#{player.rank}</span>
                if (player.rank === 1) rankIcon = <span className="text-2xl">🥇</span>
                if (player.rank === 2) rankIcon = <span className="text-2xl">🥈</span>
                if (player.rank === 3) rankIcon = <span className="text-2xl">🥉</span>

                return (
                  <div
                    key={player.rank}
                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="flex-shrink-0 w-8 text-center">
                        {rankIcon}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                            {player.username || 'Anonymous Player'}
                          </h3>
                          {player.rank <= 3 && (
                            <Badge variant="secondary" className="text-xs border-0 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                              Winner
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatAddress(player.player)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8 text-sm flex-shrink-0 ml-3">
                      <div className="text-right w-24">
                        <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                          {player.score.toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Score</p>
                      </div>

                      <div className="text-right w-20 hidden sm:block">
                        <p className="font-medium text-slate-900 dark:text-white tabular-nums">
                          {player.guessesUsed}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Guesses</p>
                      </div>

                      <div className="text-right w-20 hidden sm:block">
                        <p className="font-medium text-slate-900 dark:text-white tabular-nums">
                          {formatTime(player.timeMs)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Time</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="mt-8 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Prize Distribution
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">50%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">1st Place</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">30%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">2nd Place</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">20%</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">3rd Place</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
