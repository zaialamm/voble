'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useERConnection } from './er-connection-provider'
import { Zap, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface ERStatusIndicatorProps {
  showDetails?: boolean
  variant?: 'minimal' | 'detailed'
}

export function ERStatusIndicator({ 
  variant = 'minimal' 
}: ERStatusIndicatorProps) {
  const {
    isERConnected,
    isBaseConnected,
    erError,
    baseError,
    retryERConnection,
    retryBaseConnection,
  } = useERConnection()

  // Determine overall status
  const isFullyConnected = isERConnected && isBaseConnected
  const hasErrors = erError || baseError

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isFullyConnected ? 'default' : hasErrors ? 'destructive' : 'secondary'}
              className="flex items-center gap-1 cursor-help"
            >
              {isFullyConnected ? (
                <>
                  <Zap className="h-3 w-3" />
                  ER Ready
                </>
              ) : hasErrors ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  ER Error
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Connecting...
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {isERConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                Magic Router: {isERConnected ? 'Connected' : 'Disconnected'}
              </div>
              <div className="flex items-center gap-2">
                {isBaseConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                Solana: {isBaseConnected ? 'Connected' : 'Disconnected'}
              </div>
              {hasErrors && (
                <div className="text-red-400 mt-2">
                  {erError && <div>ER: {erError}</div>}
                  {baseError && <div>Base: {baseError}</div>}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Detailed variant
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Network Status</div>
      
      {/* Magic Router Status */}
      <div className="flex items-center justify-between p-2 border rounded">
        <div className="flex items-center gap-2">
          {isERConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">Magic Router</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isERConnected ? 'default' : 'destructive'}>
            {isERConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isERConnected && (
            <Button size="sm" variant="outline" onClick={retryERConnection}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Solana Status */}
      <div className="flex items-center justify-between p-2 border rounded">
        <div className="flex items-center gap-2">
          {isBaseConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">Solana Devnet</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isBaseConnected ? 'default' : 'destructive'}>
            {isBaseConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isBaseConnected && (
            <Button size="sm" variant="outline" onClick={retryBaseConnection}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {hasErrors && (
        <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
          {erError && (
            <div className="text-red-600 dark:text-red-400">
              <strong>Magic Router Error:</strong> {erError}
            </div>
          )}
          {baseError && (
            <div className="text-red-600 dark:text-red-400">
              <strong>Solana Error:</strong> {baseError}
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {isFullyConnected && (
        <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm">
          <div className="text-green-600 dark:text-green-400 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <strong>Ready for Ephemeral Rollups!</strong>
          </div>
          <div className="text-green-600 dark:text-green-400 text-xs mt-1">
            Transactions will be automatically routed for optimal performance.
          </div>
        </div>
      )}
    </div>
  )
}
