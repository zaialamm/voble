'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award, Clock, Target, Zap } from 'lucide-react'

// Mock data representing smart contract leaderboard data
const mockLeaderboardData = {
  daily: [
    { rank: 1, username: 'WordMaster', score: 2850, guesses: 3, time: 45000, address: '7xKXt...9mPq' },
    { rank: 2, username: 'QuickSolver', score: 2720, guesses: 4, time: 52000, address: '9kLmN...3rTy' },
    { rank: 3, username: 'PuzzleKing', score: 2680, guesses: 3, time: 68000, address: '2vBnM...8wQx' },
    { rank: 4, username: 'WordNinja', score: 2540, guesses: 4, time: 71000, address: '5cDfG...1hJk' },
    { rank: 5, username: 'LetterLord', score: 2480, guesses: 5, time: 58000, address: '8xPqR...4mNb' },
    { rank: 6, username: 'GuessGuru', score: 2420, guesses: 4, time: 89000, address: '3yTgH...7sLp' },
    { rank: 7, username: 'WordWiz', score: 2380, guesses: 5, time: 76000, address: '6nFkJ...2qWe' },
    { rank: 8, username: 'SpeedSolver', score: 2340, guesses: 6, time: 43000, address: '1mCxV...9rTy' },
    { rank: 9, username: 'BrainBox', score: 2300, guesses: 5, time: 94000, address: '4bNhK...6pLm' },
    { rank: 10, username: 'WordSmith', score: 2280, guesses: 6, time: 82000, address: '7qWxZ...3dFg' },
  ],
  weekly: [
    { rank: 1, username: 'WeeklyChamp', score: 15420, guesses: 3.2, time: 48000, address: '9xKLm...4rTy' },
    { rank: 2, username: 'ConsistentPro', score: 14890, guesses: 3.8, time: 55000, address: '2vBnM...8wQx' },
    { rank: 3, username: 'SteadyPlayer', score: 14650, guesses: 4.1, time: 62000, address: '5cDfG...1hJk' },
  ],
  monthly: [
    { rank: 1, username: 'MonthlyKing', score: 58420, guesses: 3.5, time: 51000, address: '8xPqR...4mNb' },
    { rank: 2, username: 'LongTermPro', score: 56890, guesses: 3.9, time: 58000, address: '3yTgH...7sLp' },
    { rank: 3, username: 'MarathonMaster', score: 55650, guesses: 4.2, time: 65000, address: '6nFkJ...2qWe' },
  ]
}

const periodStats = {
  daily: { totalPlayers: 1247, prizePool: 12.5, endsIn: '8h 23m' },
  weekly: { totalPlayers: 5832, prizePool: 89.3, endsIn: '3d 14h' },
  monthly: { totalPlayers: 18429, prizePool: 342.7, endsIn: '18d 6h' }
}

type PeriodType = 'daily' | 'weekly' | 'monthly'

export default function LeaderboardPage() {
  const [activePeriod, setActivePeriod] = useState<PeriodType>('daily')

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getPeriodLabel = (period: PeriodType) => {
    return period.charAt(0).toUpperCase() + period.slice(1)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🏆 Leaderboard
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compete with players worldwide in daily, weekly, and monthly competitions. 
          Buy tickets, play games, and climb the rankings to win SOL prizes!
        </p>
      </div>

      {/* Period Tabs */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as PeriodType[]).map((period) => (
            <Button
              key={period}
              variant={activePeriod === period ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActivePeriod(period)}
              className="px-6"
            >
              {getPeriodLabel(period)}
            </Button>
          ))}
        </div>
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Players</p>
                <p className="text-2xl font-bold">{periodStats[activePeriod].totalPlayers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Prize Pool</p>
                <p className="text-2xl font-bold">{periodStats[activePeriod].prizePool} SOL</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Period Ends In</p>
                <p className="text-2xl font-bold">{periodStats[activePeriod].endsIn}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            {getPeriodLabel(activePeriod)} Leaderboard
          </CardTitle>
          <CardDescription>
            Top 10 players competing for {getPeriodLabel(activePeriod).toLowerCase()} prizes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockLeaderboardData[activePeriod].map((player) => (
              <div
                key={player.rank}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  player.rank <= 3 
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800' 
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2">
                    {getRankIcon(player.rank)}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{player.username}</h3>
                      {player.rank <= 3 && (
                        <Badge variant="secondary" className="text-xs">
                          Winner
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{player.address}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-lg">{player.score.toLocaleString()}</p>
                    <p className="text-muted-foreground">Score</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-semibold">{Number.isInteger(player.guesses) ? player.guesses : player.guesses.toFixed(1)}</p>
                    <p className="text-muted-foreground">Avg Guesses</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-semibold">{formatTime(player.time)}</p>
                    <p className="text-muted-foreground">Avg Time</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prize Distribution Info */}
      <Card>
        <CardHeader>
          <CardTitle>Prize Distribution</CardTitle>
          <CardDescription>
            How prizes are distributed among winners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <h4 className="font-semibold">1st Place</h4>
              <p className="text-2xl font-bold text-yellow-600">50%</p>
              <p className="text-sm text-muted-foreground">of prize pool</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20">
              <Medal className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h4 className="font-semibold">2nd Place</h4>
              <p className="text-2xl font-bold text-gray-600">30%</p>
              <p className="text-sm text-muted-foreground">of prize pool</p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
              <Award className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <h4 className="font-semibold">3rd Place</h4>
              <p className="text-2xl font-bold text-amber-600">20%</p>
              <p className="text-sm text-muted-foreground">of prize pool</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="text-center">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-2">Ready to Compete?</h3>
          <p className="text-muted-foreground mb-4">
            Buy a ticket and start playing to climb the leaderboard!
          </p>
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            Play Now
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
