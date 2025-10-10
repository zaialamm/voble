'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Zap } from 'lucide-react'

interface GameActivity {
  id: string
  username: string
  action: 'started' | 'completed' | 'won'
  score?: number
  timestamp: Date
}

// Mock data - replace with real-time data from blockchain
const generateMockActivity = (): GameActivity => {
  const usernames = ['CryptoFan', 'WordMaster', 'SolPlayer', 'VocabPro', 'ChainGamer', 'TokenHunter', 'BlockBee', 'Web3Wizard']
  const actions: GameActivity['action'][] = ['started', 'completed', 'won']
  const action = actions[Math.floor(Math.random() * actions.length)]
  
  return {
    id: Math.random().toString(36).substring(7),
    username: usernames[Math.floor(Math.random() * usernames.length)],
    action,
    score: action !== 'started' ? Math.floor(Math.random() * 2000) + 500 : undefined,
    timestamp: new Date()
  }
}

export function LiveGameFeed() {
  const [activities, setActivities] = useState<GameActivity[]>([
    generateMockActivity(),
    generateMockActivity(),
    generateMockActivity(),
    generateMockActivity(),
    generateMockActivity()
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity = generateMockActivity()
        return [newActivity, ...prev.slice(0, 4)]
      })
    }, 5000) // New activity every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const getActionText = (activity: GameActivity) => {
    switch (activity.action) {
      case 'started':
        return 'started a new game'
      case 'completed':
        return `completed a game with ${activity.score} points`
      case 'won':
        return `won with ${activity.score} points! 🎉`
    }
  }

  const getActionColor = (action: GameActivity['action']) => {
    switch (action) {
      case 'started':
        return 'text-blue-600 dark:text-blue-400'
      case 'completed':
        return 'text-purple-600 dark:text-purple-400'
      case 'won':
        return 'text-green-600 dark:text-green-400'
    }
  }

  return (
    <Card className="p-4 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-2">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary animate-pulse" />
        <h3 className="font-bold text-base sm:text-lg">Live Activity </h3>
        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
          <Zap className="h-3 w-3 mr-1" />
          *Demo
        </Badge>
      </div>
      
      <div className="space-y-2 sm:space-y-3 max-h-[250px] sm:max-h-[300px] overflow-y-auto">
        {activities.map((activity, index) => (
          <div
            key={activity.id}
            className={`flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white dark:bg-slate-800 border transition-all ${
              index === 0 ? 'animate-fade-in border-primary/50' : 'border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <span className="font-semibold text-xs sm:text-sm truncate">{activity.username}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {Math.floor((Date.now() - activity.timestamp.getTime()) / 1000)}s ago
                </span>
              </div>
              <p className={`text-xs sm:text-sm ${getActionColor(activity.action)}`}>
                {getActionText(activity)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
