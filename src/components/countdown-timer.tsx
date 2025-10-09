'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface CountdownTimerProps {
  targetDate: Date
  label: string
  variant?: 'daily' | 'weekly' | 'monthly'
  compact?: boolean
  minimal?: boolean
}

export function CountdownTimer({ targetDate, label, variant = 'daily', compact = false, minimal = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())

  function calculateTimeLeft(): TimeLeft {
    const difference = +targetDate - +new Date()
    
    if (difference > 0) {
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      }
    }
    
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  const variantColors = {
    daily: 'from-blue-600 to-cyan-600',
    weekly: 'from-purple-600 to-pink-600',
    monthly: 'from-orange-600 to-red-600'
  }

  if (minimal) {
    // Minimal version for prize cards - simple text format with variant colors
    const formatTime = () => {
      const parts = []
      if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`)
      if (timeLeft.hours > 0) parts.push(`${timeLeft.hours}h`)
      if (timeLeft.minutes > 0) parts.push(`${timeLeft.minutes}m`)
      parts.push(`${timeLeft.seconds}s`)
      return parts.join(' ')
    }

    const variantTextColors = {
      daily: 'text-blue-600 dark:text-blue-400',
      weekly: 'text-purple-600 dark:text-purple-400',
      monthly: 'text-orange-600 dark:text-orange-400'
    }

    return (
      <div className="text-center">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</div>
        <div className={`text-sm font-medium ${variantTextColors[variant]}`}>{formatTime()}</div>
      </div>
    )
  }

  if (compact) {
    // Compact version for prize cards - just show time as text
    const formatTime = () => {
      if (timeLeft.days > 0) {
        return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`
      } else if (timeLeft.hours > 0) {
        return `${timeLeft.hours}h ${timeLeft.minutes}m`
      } else {
        return `${timeLeft.minutes}m ${timeLeft.seconds}s`
      }
    }

    return (
      <div className="text-center">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatTime()}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex gap-2">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center">
            <div className={`bg-gradient-to-br ${variantColors[variant]} text-white rounded-lg px-3 py-2 min-w-[60px] text-center`}>
              <div className="text-2xl font-bold">{timeLeft.days}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">days</div>
          </div>
        )}
        <div className="flex flex-col items-center">
          <div className={`bg-gradient-to-br ${variantColors[variant]} text-white rounded-lg px-3 py-2 min-w-[60px] text-center`}>
            <div className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">hours</div>
        </div>
        <div className="flex flex-col items-center">
          <div className={`bg-gradient-to-br ${variantColors[variant]} text-white rounded-lg px-3 py-2 min-w-[60px] text-center`}>
            <div className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">mins</div>
        </div>
        <div className="flex flex-col items-center">
          <div className={`bg-gradient-to-br ${variantColors[variant]} text-white rounded-lg px-3 py-2 min-w-[60px] text-center`}>
            <div className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">secs</div>
        </div>
      </div>
    </div>
  )
}
