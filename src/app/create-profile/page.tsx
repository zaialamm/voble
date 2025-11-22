'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { useInitializeProfile } from '@/hooks'

export default function CreateProfilePage() {
  const router = useRouter()
  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useConnectedStandardWallets()
  const { initializeProfile, isLoading, error } = useInitializeProfile()

  const [username, setUsername] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const wallet = wallets[0]

  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [CreateProfile] Render state:', {
      ready,
      authenticated,
      walletConnected: !!wallet,
      isCreating: isLoading,
    })
  }

  const validateUsername = (value: string): boolean => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [CreateProfile] Validating username:', value)
    }
    setValidationError(null)

    if (!value || value.trim().length === 0) {
      setValidationError('Username is required')
      return false
    }

    if (value.length > 32) {
      setValidationError('Username must be 32 characters or less')
      return false
    }

    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setValidationError('Username can only contain letters, numbers, and underscores')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 [CreateProfile] Form submitted with username:', username)
    }

    if (!validateUsername(username)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ [CreateProfile] Validation failed')
      }
      return
    }

    const result = await initializeProfile(username.trim())

    if (result.success) {

      setSuccess(true)

      // Wait a bit longer to ensure blockchain state is updated
      setTimeout(() => {
        router.push('/profile')
      }, 3000)
    } else {
      console.error('❌ [CreateProfile] Profile creation failed:', result.error)
    }
  }

  if (!ready) {
    return (
      <div className="container mx-auto py-8 max-w-md">
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!authenticated || !wallet) {
    return (
      <div className="container mx-auto py-8 max-w-md">
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your Solana wallet to create your profile.
            </p>
            <Button onClick={login} size="lg">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto py-8 max-w-md">
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold">Profile Created!</h2>
              <p className="text-muted-foreground">
                Your gaming profile is ready. You can now play!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-6 w-6" />
            Create Your Profile
          </CardTitle>
          <CardDescription>
            Choose a username to get started with Voble
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Wallet Info */}
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
              <p className="font-mono text-sm break-all">{wallet.address}</p>
            </div>

            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setValidationError(null)
                }}
                maxLength={32}
                disabled={isLoading}
                className={validationError ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, and underscores only. Max 10 characters.
              </p>
              {validationError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationError}
                </p>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info Alert */}
            <Alert>
              <AlertDescription className="text-sm">
                Creating a profile requires a transaction fee of ~0.003 SOL to store your data on the Solana blockchain.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !username}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up Profile...
                </>
              ) : (
                <>
                  <User className="h-4 w-4 mr-2" />
                  Create a Profile
                </>
              )}
            </Button>

            {/* Cancel Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
