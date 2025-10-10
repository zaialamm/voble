'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUnifiedSession } from '@/hooks/mb-er'
import { 
  Key, 
  Clock, 
  Zap, 
  AlertTriangle, 
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  Wallet
} from 'lucide-react'

interface SessionStatusProps {
  variant?: 'minimal' | 'detailed' | 'card'
  showCreateButton?: boolean
}

export function SessionStatus({ 
  variant = 'minimal',
  showCreateButton = true 
}: SessionStatusProps) {
  // ✅ UPDATED: Use useUnifiedSession instead of deleted useSessionManagement
  const {
    hasSessionKey: isSessionActive,
    sessionPublicKey,
    isLoadingSession,
    createSession,
    revokeSession,
    statusMessage,
    statusType,
  } = useUnifiedSession()
  
  // Legacy compatibility - map to old interface
  const isCreatingSession = isLoadingSession
  const sessionError = statusType === 'error' ? statusMessage : null
  const clearError = () => {} // No-op for now
  const closeSession = revokeSession
  const isSessionExpiringSoon = false // TODO: Implement expiry check
  const timeRemaining = null // TODO: Implement time remaining

  const [, setShowCreateForm] = useState(false)

  // Format time remaining
  const formatTimeRemaining = (seconds: number | null) => {
    if (!seconds) return null
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const handleCreateSession = async () => {
    const result = await createSession()
    if (result.success) {
      setShowCreateForm(false)
    }
  }

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  isSessionActive 
                    ? isSessionExpiringSoon 
                      ? 'destructive' 
                      : 'default'
                    : 'secondary'
                }
                className="flex items-center gap-1 cursor-help"
              >
                {isSessionActive ? (
                  <>
                    <Key className="h-3 w-3" />
                    {isSessionExpiringSoon ? 'Expiring Soon' : 'Session Active'}
                  </>
                ) : (
                  <>
                    <Key className="h-3 w-3 opacity-50" />
                    No Session
                  </>
                )}
              </Badge>
              
              {!isSessionActive && showCreateButton && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCreateSession}
                  disabled={isCreatingSession}
                  className="h-6 px-2 text-xs"
                >
                  {isCreatingSession ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              {isSessionActive ? (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Session Active
                  </div>
                  <div>Public Key: {sessionPublicKey?.toString().slice(0, 8)}...</div>
                  {timeRemaining && (
                    <div>Expires in: {formatTimeRemaining(timeRemaining)}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <X className="h-3 w-3 text-red-500" />
                    No Active Session
                  </div>
                  <div>Create a session for gasless gameplay</div>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'card') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Session Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSessionActive ? (
            <>
              {/* Active Session Info */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Session Active</span>
                </div>
                <Badge variant="default">
                  <Zap className="h-3 w-3 mr-1" />
                  Gasless Ready
                </Badge>
              </div>

              {/* Session Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Public Key:</span>
                  <span className="font-mono text-xs">
                    {sessionPublicKey?.toString().slice(0, 16)}...
                  </span>
                </div>
                
                {timeRemaining && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Remaining:</span>
                    <span className={isSessionExpiringSoon ? 'text-red-600' : ''}>
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Top-up Amount:</span>
                  <span>0.01 SOL</span>
                </div>
              </div>

              {/* Expiring Warning */}
              {isSessionExpiringSoon && (
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>Session expiring soon! Consider creating a new one.</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={closeSession}
                >
                  Close Session
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCreateSession}
                  disabled={isCreatingSession}
                >
                  {isCreatingSession ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Extend Session
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* No Session */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">No Active Session</span>
                </div>
                <Badge variant="secondary">
                  <Wallet className="h-3 w-3 mr-1" />
                  Wallet Required
                </Badge>
              </div>

              {/* Benefits */}
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Create a session for:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Gasless gameplay transactions</li>
                  <li>• No wallet popups during games</li>
                  <li>• Faster transaction processing</li>
                </ul>
              </div>

              {/* Create Session Button */}
              <Button 
                onClick={handleCreateSession}
                disabled={isCreatingSession}
                className="w-full"
              >
                {isCreatingSession ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating Session...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Create Session
                  </>
                )}
              </Button>
            </>
          )}

          {/* Error Display */}
          {sessionError && (
            <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
              <div className="flex items-center justify-between">
                <span className="text-red-600">{sessionError}</span>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Detailed variant
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Session Status</div>
      
      <div className="flex items-center justify-between p-2 border rounded">
        <div className="flex items-center gap-2">
          {isSessionActive ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          <span className="text-sm">
            {isSessionActive ? 'Session Active' : 'No Session'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={isSessionActive ? 'default' : 'secondary'}>
            {isSessionActive ? 'Gasless Ready' : 'Wallet Required'}
          </Badge>
          
          {!isSessionActive && showCreateButton && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCreateSession}
              disabled={isCreatingSession}
            >
              {isCreatingSession ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Time remaining */}
      {isSessionActive && timeRemaining && (
        <div className="text-xs text-muted-foreground">
          <Clock className="h-3 w-3 inline mr-1" />
          {formatTimeRemaining(timeRemaining)} remaining
        </div>
      )}
    </div>
  )
}
