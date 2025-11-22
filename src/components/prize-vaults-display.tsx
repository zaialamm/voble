'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Calendar, CalendarDays, Loader2, RefreshCw } from 'lucide-react'
import { useVaultBalances } from '@/hooks/web3-js'

export function PrizeVaultsDisplay() {
  const { balances, isLoading, error, refetch, isFetching } = useVaultBalances()

  if (error) {
    return (
      <Card className="mb-6 border-red-500/50">
        <CardContent className="pt-6">
          <p className="text-center text-red-500 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-1 justify-center">
            <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Prize Pool
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Prize */}
          <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Daily</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
            ) : (
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {balances?.daily.balance.toFixed(4) || '0.0000'} SOL
              </p>
            )}
          </div>

          {/* Weekly Prize */}
          <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Weekly</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-purple-600 dark:text-purple-400" />
            ) : (
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {balances?.weekly.balance.toFixed(4) || '0.0000'} SOL
              </p>
            )}
          </div>

          {/* Monthly Prize */}
          <div className="flex flex-col items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-500 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly</span>
            </div>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-orange-600 dark:text-orange-400" />
            ) : (
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {balances?.monthly.balance.toFixed(4) || '0.0000'} SOL
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-4">
          Live prize pools from Solana Devnet • Click refresh to update
        </p>
      </CardContent>
    </Card>
  )
}
