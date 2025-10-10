'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Trophy, 
  Target, 
  Clock, 
  Zap, 
  TrendingUp, 
  Calendar,
  Award,
  Star,
  GamepadIcon,
  Wallet,
  WalletIcon,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { usePrivy } from "@privy-io/react-auth" 
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { useCurrentUserProfile } from '@/hooks/web3-js'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'achievements'>('overview')
  const router = useRouter()
  const { ready, authenticated, login } = usePrivy()
  const { wallets } = useConnectedStandardWallets()
  
  const wallet = wallets[0]
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [ProfilePage] Render state:', {
      ready,
      authenticated,
      walletConnected: !!wallet,
      walletAddress: wallet?.address,
    })
  }
  
  // Fetch user profile from blockchain (includes existence check)
  const { profile, isLoading: loadingProfile, error, exists: hasProfile } = useCurrentUserProfile()
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [ProfilePage] Profile fetch:', {
      hasProfile: !!profile,
      loadingProfile,
      error: error,
      profileData: profile ? {
        username: profile.username,
        totalGamesPlayed: profile.totalGamesPlayed,
        gamesWon: profile.gamesWon,
        currentStreak: profile.currentStreak,
      } : null,
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getGuessDistributionPercentage = (count: number, distribution: number[]) => {
    const total = distribution.reduce((sum, val) => sum + val, 0)
    return total > 0 ? Math.round((count / total) * 100) : 0
  }

  // Wallet connection prompt - CHECK THIS FIRST
  if (!authenticated || !wallet) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔌 [ProfilePage] No wallet connected:', { 
        ready, 
        authenticated, 
        wallet: !!wallet 
      })
    }
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <WalletIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Please connect your Solana wallet to view your profile and game statistics.
            </p>
            <Button onClick={login} size="lg">
              <Wallet className="h-5 w-5 mr-2" />
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state - AFTER wallet check
  if (!ready || loadingProfile) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⏳ [ProfilePage] Loading state:', { ready, loadingProfile })
    }
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error) {
    console.error('❌ [ProfilePage] Error loading profile:', error)
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load profile data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // No profile state - show create profile prompt
  if (!hasProfile || !profile) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🚫 [ProfilePage] No profile found:', { 
        hasProfile, 
        hasStats: !!profile,
        walletAddress: wallet?.address,
        error: error 
      })
    }
    
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Profile Found</h2>
            <p className="text-muted-foreground mb-6">
              Create a profile to start playing VocaBee!
            </p>
            
            {/* Debug info */}
            <div className="mb-4 p-4 bg-muted rounded-lg text-left text-sm">
              <p className="font-mono text-xs break-all mb-2">
                <strong>Wallet:</strong> {wallet?.address}
              </p>
              <p className="text-xs">
                <strong>Has Profile:</strong> {String(hasProfile)}
              </p>
              <p className="text-xs">
                <strong>Loading:</strong> {String(loadingProfile)}
              </p>
              {error && (
                <p className="text-xs text-red-500">
                  <strong>Error:</strong> {error}
                </p>
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔄 [ProfilePage] Navigating to create profile...')
                  }
                  router.push('/create-profile')
                }} 
                size="lg"
              >
                <User className="h-5 w-5 mr-2" />
                Create Profile
              </Button>
              
              <Button 
                onClick={() => {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('🔄 [ProfilePage] Manual refresh...')
                  }
                  window.location.reload()
                }} 
                variant="outline"
                size="lg"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Calculate derived stats
  const winRate = profile.totalGamesPlayed > 0 ? Math.round((profile.gamesWon / profile.totalGamesPlayed) * 100) : 0
  const averageScore = profile.totalGamesPlayed > 0 ? Math.round(profile.totalScore / profile.totalGamesPlayed) : 0

  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [ProfilePage] Rendering profile with profile:', {
      username: profile.username,
      totalGamesPlayed: profile.totalGamesPlayed,
      achievements: profile.achievements.length,
      winRate,
      averageScore,
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.profilePictureUrl ?? undefined} />
              <AvatarFallback className="text-2xl">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{profile.username}</h1>
                {profile.isPremium && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              
              <p className="text-muted-foreground font-mono text-sm">
                {wallet.address}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(new Date(profile.createdAt * 1000))}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Last played {formatDate(new Date(profile.lastPlayed * 1000))}
                </div>
              </div>
            </div>

            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="flex bg-muted rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Target },
            { id: 'achievements', label: 'Achievements', icon: Award }
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeTab === id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(id as 'overview' | 'achievements' | 'history')}
              className="px-6"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <GamepadIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Games Played</p>
                    <p className="text-2xl font-bold">{profile.totalGamesPlayed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Games Won</p>
                    <p className="text-2xl font-bold">{profile.gamesWon}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold">{winRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Best Score</p>
                    <p className="text-2xl font-bold">{profile.bestScore.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Streaks and Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Streaks & Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Current Streak</span>
                  <span className="text-2xl font-bold text-green-500">{profile.currentStreak}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Max Streak</span>
                  <span className="text-xl font-semibold">{profile.maxStreak}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Guesses</span>
                  <span className="text-xl font-semibold">{profile.averageGuesses}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="text-xl font-semibold">{averageScore}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Guess Distribution
                </CardTitle>
                <CardDescription>Games won by number of guesses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.guessDistribution.map((count, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-4 text-sm font-mono">{index + 1}</span>
                      <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${getGuessDistributionPercentage(count, profile.guessDistribution)}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                          {count}
                        </span>
                      </div>
                      <span className="w-8 text-xs text-muted-foreground">
                        {getGuessDistributionPercentage(count, profile.guessDistribution)}%
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Achievements
            </CardTitle>
            <CardDescription>
              Unlock achievements by reaching milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.achievements.map((achievement, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      achievement.unlockedAt
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-950/20 dark:to-orange-950/20 dark:border-yellow-800'
                        : 'bg-muted/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        achievement.unlockedAt ? 'bg-yellow-500' : 'bg-muted'
                      }`}>
                        <Award className={`h-5 w-5 ${
                          achievement.unlockedAt ? 'text-white' : 'text-muted-foreground'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{achievement.name}</h4>
                          {achievement.unlockedAt && (
                            <Badge variant="secondary" className="text-xs">
                              Unlocked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No achievements yet. Start playing to unlock them!
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
