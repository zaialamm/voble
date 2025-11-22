'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Gift, Users, Clock, Coins, Percent, Star, Loader2 } from 'lucide-react'
import { useLuckyDrawData } from '@/hooks/use-lucky-draw'

export default function RafflePage() {
  const {
    currentBalance,
    totalEligiblePlayers,
    nextDrawIn,
    drawFrequency,
    ticketPrice,
    allocationPercentage,
    recentWinners,
    weeklyStats,
    isLoading,
    refetch
  } = useLuckyDrawData()

  const handleRefresh = () => {
    refetch()
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Weekly Lucky Draw
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Automatic weekly lottery for all players - {allocationPercentage}% of ticket sales
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prize Pool</p>
                  {isLoading ? (
                    <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {currentBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Eligible Players</p>
                  {isLoading ? (
                    <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
                  ) : (
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalEligiblePlayers.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Next Draw</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {nextDrawIn}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Percent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Allocation</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {allocationPercentage}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* How Lucky Draw Works */}
          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Star className="h-5 w-5 text-yellow-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Automatic Entry</h4>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  Every player who completes at least one game during the week is automatically entered into the Lucky Draw - no additional cost!
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900 dark:text-white">Eligibility Criteria:</h4>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Play at least 1 game during the week</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Complete the game (win or lose)</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Have an active session account</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Automatic entry - no additional cost</p>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-400">
                  <strong>{allocationPercentage}% of all ticket sales</strong> are automatically allocated to the weekly Lucky Draw pool
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Lucky Draw Winners */}
          <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Recent Lucky Draw Winners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentWinners.length > 0 ? (
                  recentWinners.map((winner, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="font-mono text-sm text-slate-900 dark:text-white">
                          {winner.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {winner.week}
                          </Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {winner.date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">
                          +{winner.amount} SOL
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p>No recent winners found yet.</p>
                    <p className="text-xs mt-1">Be the first to win!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Statistics */}
        <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">This Week's Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {weeklyStats.totalTicketsSold.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">Est. Tickets Sold</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {weeklyStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">Est. Total Revenue</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {weeklyStats.luckyDrawAllocation.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">Lucky Draw Pool</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center">
                {isLoading ? (
                  <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mx-auto mb-2" />
                ) : (
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {weeklyStats.averageGamesPerPlayer}
                  </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-400">Avg Games/Player</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h4 className="font-medium text-purple-900 dark:text-purple-300">Current Week Progress</h4>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-400">
                <strong>{totalEligiblePlayers}</strong> players are eligible for this week's Lucky Draw.
                The winner will be randomly selected from all eligible players when the draw period ends.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
