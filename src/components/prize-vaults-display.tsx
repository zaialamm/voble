'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { useVaultBalances } from '@/hooks'

export function PrizeVaultsDisplay() {
  const { balances, isLoading, error, refetch, isFetching } = useVaultBalances()

  if (error) {
    return (
      <Card className="mb-4 bg-white dark:bg-[#1a1a1a] border border-red-500/50">
        <CardContent className="p-4">
          <p className="text-center text-red-500 text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-4 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Prize Pools
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Compact horizontal layout for mobile */}
        <div className="grid grid-cols-3 gap-3">
          {/* Daily Prize */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Daily</p>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600 mx-auto" />
            ) : (
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {balances?.daily.balance.toFixed(3) || '0.000'} SOL
              </p>
            )}
          </div>

          {/* Weekly Prize */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Weekly</p>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600 mx-auto" />
            ) : (
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {balances?.weekly.balance.toFixed(3) || '0.000'} SOL
              </p>
            )}
          </div>

          {/* Monthly Prize */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Monthly</p>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-600 mx-auto" />
            ) : (
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {balances?.monthly.balance.toFixed(3) || '0.000'} SOL
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
