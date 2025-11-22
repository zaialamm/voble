'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  WalletIcon,
  Wallet,
  UserCircle,
  Trophy,
  Timer,
  X,
  Share2,
  Target
} from 'lucide-react'
import { usePrivy } from "@privy-io/react-auth"
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana"
import {
  useBuyTicket,
  useRecordKeystroke,
  useSubmitGuess,
  useCompleteGame,
  useFetchSession,
  useUserProfile,
  SessionData
} from '@/hooks'
import { useLeaderboard } from '@/hooks/use-leaderboard'
import { useInitializeSession } from '@/hooks/use-initialize-session'
import { PrizeVaultsDisplay } from '@/components/prize-vaults-display'
import Link from 'next/link'

// Game state types
type TileState = 'empty' | 'filled' | 'correct' | 'present' | 'absent'
type GameStatus = 'playing' | 'won' | 'lost' | 'loading'

interface GameTile {
  letter: string
  state: TileState
}

interface GameState {
  grid: GameTile[][]
  currentRow: number
  currentCol: number
  gameStatus: GameStatus
  targetWord: string
  guesses: string[]
  score: number
  timeElapsed: number
  showResultModal: boolean
}

type GuessEntry = NonNullable<SessionData['guesses'][number]>

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
]

const ticketPrice = 0.001

export default function GamePage() {
  const router = useRouter()
  const { ready, authenticated, login, user } = usePrivy()
  const { wallets } = useConnectedStandardWallets() // External wallets only
  const wallet = wallets[0] // First external Solana wallet

  // Check for embedded wallet from user object
  const embeddedWallet = user?.linkedAccounts?.find(
    (account: { type: string; chainType?: string }) => account.type === 'wallet' && account.chainType === 'solana'
  )

  // Use embedded wallet if no external wallet
  const activeWallet = wallet || embeddedWallet

  // Debug: Log wallet status (only on mount and when authentication changes)
  useEffect(() => {
    if (ready && process.env.NODE_ENV === 'development') {
      console.log('👛 [Game Page] Wallet status:', {
        ready,
        authenticated,
        externalWalletsCount: wallets.length,
        hasExternalWallet: !!wallet,
        hasEmbeddedWallet: !!embeddedWallet,
        activeWalletAddress: activeWallet?.address,
        userLinkedAccounts: user?.linkedAccounts?.map((a: { type: string; chainType?: string }) => ({ type: a.type, chainType: a.chainType })),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]) // Only log when these change - intentionally limited deps for debug logging

  // Generate period ID (daily format: YYYY-MM-DD)
  const periodId = new Date().toISOString().split('T')[0]

  const { buyTicket, isLoading: isBuyingTicket, error: buyTicketError } = useBuyTicket()
  const { recordKeystroke } = useRecordKeystroke()
  const { submitGuess: submitGuessToBlockchain } = useSubmitGuess()
  const { completeGame } = useCompleteGame()
  const { session, refetch: refetchSession } = useFetchSession(periodId)
  const { initializeSession, isLoading: isInitializing } = useInitializeSession()
  // Use activeWallet address to support both external and embedded wallets
  const { profile, isLoading: isLoadingProfile } = useUserProfile(activeWallet?.address)
  const dailyLeaderboard = useLeaderboard('daily')
  const weeklyLeaderboard = useLeaderboard('weekly')
  const monthlyLeaderboard = useLeaderboard('monthly')

  const playerAddress = activeWallet?.address || wallet?.address || null

  const [gameState, setGameState] = useState<GameState>({
    grid: Array(7).fill(null).map(() =>
      Array(6).fill(null).map(() => ({ letter: '', state: 'empty' }))
    ),
    currentRow: 0,
    currentCol: 0,
    gameStatus: 'playing',
    targetWord: 'SOLANA',
    guesses: [],
    score: 0,
    timeElapsed: 0,
    showResultModal: false
  })

  const [keyboardState, setKeyboardState] = useState<Record<string, TileState>>({})
  const [startTime, setStartTime] = useState<number>(Date.now())

  const shareSummary = useMemo(() => {
    const base = gameState.gameStatus === 'won'
      ? `🎉 Crushed today's @VobleFun word in ${gameState.guesses.length}/7 guesses for ${gameState.score.toLocaleString()} pts!`
      : `� Today's @VobleFun word beat me. It was ${gameState.targetWord}.`
    const leaderboardHint = gameState.score > 0
      ? `Can you top that on the leaderboard?`
      : `Think you can do better?`
    return `${base}\n${leaderboardHint}\nhttps://voble.fun`
  }, [gameState.gameStatus, gameState.guesses.length, gameState.score, gameState.targetWord])

  const isResultModalOpen = gameState.showResultModal && (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost')

  // Check if session account exists (session will be null if account doesn't exist)
  const sessionAccountExists = session !== null
  const sessionIsCurrentPeriod = !!session?.isCurrentPeriod

  // Debug: Log session status (only when session data changes)
  useEffect(() => {
    if (session !== undefined && process.env.NODE_ENV === 'development') { // Only log when we have data (not initial undefined)
      console.log('🎮 [Game Page] Session check:', {
        hasSession: !!session,
        sessionPeriodId: session?.periodId,
        currentPeriodId: periodId,
        isCompleted: session?.completed,
        guessesUsed: session?.guessesUsed,
        maxGuesses: 7,
        hasGuessesRemaining: session ? session.guessesUsed < 7 : false,
        isSolved: session?.isSolved,
        score: session?.score,
        shouldShowBuyTicket: !sessionIsCurrentPeriod || session.completed || (session?.guessesUsed ?? 0) >= 7,
        shouldShowGame: sessionIsCurrentPeriod && !session?.completed && (session?.guessesUsed ?? 0) < 7,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.periodId, session?.completed, session?.isSolved, session?.guessesUsed]) // Only log when these specific fields change - intentionally limited deps



  // Function to update grid from blockchain session data
  const updateGridFromSession = (sessionData?: SessionData | null) => {
    const dataToUse = sessionData || session
    if (!dataToUse) return

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [updateGridFromSession] Updating grid from session:', {
        guessesUsed: dataToUse.guessesUsed,
        guessesArray: dataToUse.guesses,
      })
    }

    const newGrid = Array(7).fill(null).map(() =>
      Array(6).fill(null).map(() => ({ letter: '', state: 'empty' as TileState }))
    )
    const newKeyboardState: Record<string, TileState> = {}

    // Update grid with guesses from blockchain
    dataToUse.guesses.forEach((guessData: { guess: string; result: string[] } | null, rowIndex: number) => {
      // Check if guess data exists
      if (!guessData || !guessData.guess) return

      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 Processing guess ${rowIndex}:`, guessData.guess)
      }

      const letters = guessData.guess.split('')
      letters.forEach((letter: string, colIndex: number) => {
        const result = guessData.result[colIndex]
        let state: TileState = 'absent'

        // LetterResult comes as string: 'Correct', 'Present', or 'Absent'
        if (result === 'Correct') {
          state = 'correct'
          newKeyboardState[letter] = 'correct'
        } else if (result === 'Present') {
          state = 'present'
          if (newKeyboardState[letter] !== 'correct') {
            newKeyboardState[letter] = 'present'
          }
        } else { // 'Absent'
          state = 'absent'
          if (!newKeyboardState[letter]) {
            newKeyboardState[letter] = 'absent'
          }
        }

        newGrid[rowIndex][colIndex] = { letter, state }
      })
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [updateGridFromSession] Grid updated:', {
        currentRow: dataToUse.guessesUsed,
        keyboardState: newKeyboardState,
      })
    }

    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      currentRow: dataToUse.guessesUsed,
      currentCol: 0,
      guesses: dataToUse.guesses
        .filter((guess): guess is GuessEntry => !!guess)
        .map(guess => guess.guess)
    }))
    setKeyboardState(newKeyboardState)
  }

  // Update grid when session data changes
  useEffect(() => {
    if (session) {
      updateGridFromSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.guessesUsed]) // Re-run when guesses change - session and updateGridFromSession are stable

  // Timer effect
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      const timer = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: Math.floor((Date.now() - startTime) / 1000)
        }))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameState.gameStatus, startTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTileStyle = (state: TileState) => {
    switch (state) {
      case 'correct':
        return 'bg-[#14F195] border-[#14F195] text-white font-bold shadow-lg'
      case 'present':
        return 'bg-[#9945FF] border-[#9945FF] text-white font-bold shadow-lg'
      case 'absent':
        return 'bg-gray-500 border-gray-500 text-white font-bold'
      case 'filled':
        return 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold border-2 scale-105'
      default:
        return 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white border-2'
    }
  }

  const getKeyStyle = (letter: string) => {
    const state = keyboardState[letter] || 'empty'
    const baseStyle = 'px-2 py-3 sm:px-4 sm:py-6 rounded-lg font-medium text-sm sm:text-base transition-all duration-200 hover:scale-105 min-w-[2rem] sm:min-w-[2.5rem]'

    switch (state) {
      case 'correct':
        return `${baseStyle} bg-[#14F195] text-white shadow-lg`
      case 'present':
        return `${baseStyle} bg-[#9945FF] text-white shadow-lg`
      case 'absent':
        return `${baseStyle} bg-gray-500 text-white`
      default:
        return `${baseStyle} bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600`
    }
  }

  // Validate requirements before allowing gameplay:
  // 1. Has valid ticket (paid and on-chain)
  // 2. Session exists on-chain for current period
  const canPlayGame = sessionIsCurrentPeriod && !!session && !session.completed && session.guessesUsed < 7

  const handleKeyPress = async (key: string) => {
    if (!canPlayGame || gameState.gameStatus !== 'playing') return

    if (key === 'BACKSPACE') {
      if (gameState.currentCol > 0) {
        // Update UI
        const newGrid = [...gameState.grid]
        newGrid[gameState.currentRow][gameState.currentCol - 1] = {
          letter: '',
          state: 'empty'
        }
        setGameState(prev => ({
          ...prev,
          grid: newGrid,
          currentCol: prev.currentCol - 1
        }))

        // Record keystroke
        recordKeystroke('Backspace').catch(err => {
          console.warn('⚠️ Failed to record backspace:', err)
        })
      } else {
        // NEW: Record invalid backspace too (player tried to delete when empty)
        recordKeystroke('Backspace').catch(err => {
          console.warn('⚠️ Failed to record backspace:', err)
        })
      }
    }
    else if (key === 'ENTER') {
      // NEW: Always record Enter (even if invalid)
      recordKeystroke('Enter').catch(err => {
        console.warn('⚠️ Failed to record Enter:', err)
      })

      // Only submit if valid
      if (gameState.currentCol === 6) {
        submitGuess()
      }
    }
    else if (key.length === 1 && gameState.currentCol < 6) {
      // Update UI
      const newGrid = [...gameState.grid]
      newGrid[gameState.currentRow][gameState.currentCol] = {
        letter: key,
        state: 'filled'
      }
      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        currentCol: prev.currentCol + 1
      }))

      // Record keystroke
      recordKeystroke(key).catch(err => {
        console.warn(`⚠️ Failed to record '${key}':`, err)
      })
    }
    // NEW: Record invalid letter inputs too (when row is full)
    else if (key.length === 1 && gameState.currentCol >= 6) {
      recordKeystroke(key).catch(err => {
        console.warn(`⚠️ Failed to record '${key}':`, err)
      })
    }
  }

  const submitGuess = async () => {
    // ✅ SECURITY: Double-check before submitting to blockchain
    if (!canPlayGame) {
      console.error('❌ SECURITY: Attempted to submit guess without session key or ticket!')
      alert('Error: You must have a session key and valid ticket to play.')
      return
    }

    const currentGuess = gameState.grid[gameState.currentRow]
      .map(tile => tile.letter)
      .join('')

    if (currentGuess.length !== 6) return

    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Submitting guess to blockchain:', currentGuess)
      console.log('🔐 Security checks passed: hasTicket=', !!session)
    }
    setGameState(prev => ({ ...prev, gameStatus: 'loading' }))

    try {
      // Submit to blockchain
      const result = await submitGuessToBlockchain(periodId, currentGuess)

      if (result.success) {

        const { data: freshSession } = await refetchSession()

        if (freshSession) {
          // Check the last guess result directly from session data
          const lastGuessIndex = freshSession.guessesUsed - 1
          const lastGuess = freshSession.guesses[lastGuessIndex]
          const allCorrect = lastGuess?.result?.every((r: string) => r === 'Correct')

          updateGridFromSession(freshSession)

          // Check if game ended
          if (allCorrect || freshSession.isSolved || freshSession.guessesUsed >= 7) {

            console.log('🏁 Game ended! Completing game...');

            await handleCompleteGame()

          } else {
            setGameState(prev => ({ ...prev, gameStatus: 'playing' }))
          }
        }
      } else {
        console.error('❌ Failed to submit guess:', result.error)
        setGameState(prev => ({ ...prev, gameStatus: 'playing' }))
      }
    } catch (error) {
      console.error('❌ Error submitting guess:', error)
      setGameState(prev => ({ ...prev, gameStatus: 'playing' }))
    }
  }

  const handleInitializeSession = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎮 Initializing session...')
    }

    const result = await initializeSession()

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Session initialized!', result.signature)
      }

      // Refetch to update UI
      await refetchSession()
    } else {
      console.error('❌ Failed to initialize session:', result.error)
      alert(`Error: ${result.error}`)
    }
  }

  const handleBuyTicket = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎫 [handleBuyTicket] Starting ticket purchase...')
    }

    try {

      // Buy ticket AND delegate in ONE transaction!
      console.log('🎫 Step 1: Buying ticket and delegating session...')
      const result = await buyTicket(periodId)

      if (!result.success) {
        throw new Error(result.error || 'Failed to buy ticket')
      }

      console.log('✅ Ticket purchased and session delegated!')

      // Wait for ER to sync the account
      console.log('⏳ Syncing account to ER...')
      await new Promise(resolve => setTimeout(resolve, 3000))

      console.log('✅ Account synced to ER!')

      // Refetch session to get updated data
      const { data: freshSession } = await refetchSession()

      console.log('🔄 [handleBuyTicket] Refetched session:', {
        completed: freshSession?.completed,
        guessesUsed: freshSession?.guessesUsed,
        isSolved: freshSession?.isSolved,
        periodId: freshSession?.periodId,
      })

      // Reset game state for new session
      setGameState({
        grid: Array(7).fill(null).map(() =>
          Array(6).fill(null).map(() => ({ letter: '', state: 'empty' }))
        ),
        currentRow: 0,
        currentCol: 0,
        gameStatus: 'playing',
        targetWord: '',
        guesses: [],
        score: 0,
        timeElapsed: 0,
        showResultModal: false
      })
      setKeyboardState({})
      setStartTime(Date.now())

      console.log('🎮 Ready to play on ER!')

    } catch (error: unknown) {
      const err = error as Error & { message?: string }
      console.error('❌ [handleBuyTicket] Error:', err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleCompleteGame = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏁 Completing game...')
    }
    const result = await completeGame(periodId)

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Game completed!', result.signature)
      }

      // Wait for session to update
      await new Promise(resolve => setTimeout(resolve, 2000))

      const { data: updatedSession } = await refetchSession()

      // Now use the updated session data
      if (updatedSession) {
        setGameState(prev => ({
          ...prev,
          gameStatus: updatedSession.isSolved ? 'won' : 'lost',
          score: updatedSession.score || 0,
          targetWord: updatedSession.targetWord || 'UNKNOWN',
          timeElapsed: updatedSession.timeMs || 0,
          showResultModal: true,
        }))
      }
    } else {
      console.error('❌ Failed to complete game:', result.error)
    }
  }

  const closeResultModal = () => {
    setGameState(prev => ({ ...prev, showResultModal: false }))
  }

  const handleShareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareSummary)}`
    window.open(url, '_blank')
  }

  // Log profile check for debugging
  useEffect(() => {
    if (ready && authenticated && activeWallet && !isLoadingProfile) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [Game Page] Profile check:', {
          ready,
          authenticated,
          activeWalletAddress: activeWallet?.address,
          isLoadingProfile,
          hasProfile: !!profile,
          profileUsername: profile?.username,
        })
      }

      if (profile) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Game Page] Profile exists:', profile.username)
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [Game Page] No profile found - user needs to create one')
        }
      }
    }
  }, [ready, authenticated, activeWallet, profile, isLoadingProfile])

  // Session keys removed - transactions now use direct wallet signing

  // Add BEFORE the authentication check
  // Show loading while Privy is initializing or checking profile
  if (!ready || (authenticated && activeWallet && isLoadingProfile)) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
                <p className="text-muted-foreground">
                  {!ready ? 'Initializing...' : 'Checking profile...'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated or no wallet
  if (!authenticated || !activeWallet) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card className="text-center py-12">
            <CardContent>
              <WalletIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Please {authenticated ? 'create or connect' : 'sign in with'} a Solana wallet to start playing.
              </p>
              <Button onClick={login} size="lg">
                <Wallet className="h-5 w-5 mr-2" />
                {authenticated ? 'Create Wallet' : 'Sign In'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show create profile prompt if user doesn't have a profile
  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0f0f0f]">
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <Card className="text-center py-12 border-2 border-blue-200 dark:border-blue-800">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-6">
                  <UserCircle className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Create Your Profile First
                </h2>
                <p className="text-lg text-muted-foreground">
                  You need to create a gaming profile before you can access the game.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  Why create a profile?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                    <span>Track your game statistics and progress</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                    <span>Compete on the leaderboard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                    <span>Earn achievements and rewards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-0.5">✓</span>
                    <span>Enable gasless gaming with Ephemeral Rollups</span>
                  </li>
                </ul>
              </div>

              <Link href="/create-profile">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8">
                  <UserCircle className="h-5 w-5 mr-2" />
                  Create Your Profile Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 dark:bg-[#0f0f0f]">
      <div className="container mx-auto py-4 sm:py-8 px-4 max-w-4xl">

        {/* For new users: Only show session creation */}
        {!sessionAccountExists ? (
          <div className="max-w-md mx-auto mt-16">
            <Card className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
              <CardContent className="pt-8 pb-8 px-8 text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Welcome to Voble
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400">
                    Create your gaming session to start playing
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    One-time setup required to create your session account
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Cost: ~0.002 SOL (rent deposit, fully reclaimable)
                  </p>
                </div>

                <Button
                  onClick={handleInitializeSession}
                  disabled={isInitializing}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {isInitializing ? 'Creating Session...' : 'Create Session Account'}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* For existing users: Show full game interface */}
            <PrizeVaultsDisplay />

            {/* Buy Ticket Button (Only show if session exists) */}
            {sessionAccountExists && !sessionIsCurrentPeriod && (
              <Card>
                <CardHeader>
                  <CardTitle>Buy Ticket to Play</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleBuyTicket}
                    disabled={isBuyingTicket}
                    className="w-full"
                  >
                    {isBuyingTicket ? 'Buying Ticket...' : `Buy Ticket (${ticketPrice} SOL)`}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Buy Ticket Section */}
            {/* Show when: no valid ticket OR session not on-chain */}
            {(!sessionIsCurrentPeriod || (session?.completed && gameState.gameStatus === 'playing') || (session?.guessesUsed ?? 0) >= 7) && (
              <Card className="mb-6 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ready to Play?</h2>
                    </div>

                    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">

                      {/* Original Buy Ticket Button */}
                      <div className="w-full space-y-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Ticket Price: <span className="font-bold text-blue-600 dark:text-blue-400">0.001 SOL</span>
                        </p>
                        <Button
                          onClick={handleBuyTicket}
                          disabled={isBuyingTicket}
                          size="lg"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                        >
                          {isBuyingTicket ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Buying Ticket...
                            </>
                          ) : (
                            <>
                              Buy Ticket & Start Game
                            </>
                          )}
                        </Button>
                      </div>
                      {buyTicketError && (
                        <p className="text-red-500 text-sm mt-2">
                          {buyTicketError}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game UI - Only show when user has valid ticket and can play */}
            {sessionIsCurrentPeriod && session && !session.completed && session.guessesUsed < 7 && (
              <>
                {/* Game Stats - Compact Design */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Time</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatTime(gameState.timeElapsed)}</p>
                  </div>

                  <div className="text-center p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Guesses</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{gameState.currentRow}/7</p>
                  </div>

                  <div className="text-center p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Score</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{gameState.score.toLocaleString()}</p>
                  </div>

                  <div className="text-center p-3 bg-white dark:bg-[#1a1a1a] rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{gameState.gameStatus}</p>
                  </div>
                </div>

                {/* Game Grid */}
                <Card className="mb-6 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
                  <CardContent className="pt-6">
                    <div className="space-y-1 max-w-sm mx-auto">
                      {gameState.grid.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-6 gap-1">
                          {row.map((tile, colIndex) => (
                            <div
                              key={`${rowIndex}-${colIndex}`}
                              className={`
                          w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 border-2 rounded flex items-center justify-center text-lg sm:text-xl font-bold
                          transition-all duration-300 ease-in-out
                          ${getTileStyle(tile.state)}
                        `}
                            >
                              {tile.letter}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Virtual Keyboard - Only show when user can play */}
            {sessionIsCurrentPeriod && session && !session.completed && session.guessesUsed < 7 && (
              <Card className="mb-6 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800">
                <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
                  <div className="space-y-1 sm:space-y-2">
                    {KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex justify-center gap-1">
                        {row.map((key) => (
                          <Button
                            key={key}
                            onClick={() => handleKeyPress(key)}
                            className={`
                      ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-3 sm:px-6 min-w-[3rem] sm:min-w-[4rem]' : ''} 
                      ${getKeyStyle(key)}
                    `}
                            disabled={gameState.gameStatus !== 'playing' || !canPlayGame}
                            title={!canPlayGame ? 'Session key and ticket required' : ''}
                          >
                            {key === 'BACKSPACE' ? '⌫' : key}
                          </Button>
                        ))}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Game Result Modal */}
            {isResultModalOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-lg bg-white dark:bg-[#0e0e0e] border border-slate-200 dark:border-slate-800 shadow-2xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground uppercase tracking-wide">
                          {gameState.gameStatus === 'won' ? 'Victory' : 'Try Again'}
                        </p>
                        <CardTitle className={`text-2xl font-bold ${gameState.gameStatus === 'won' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                          {gameState.gameStatus === 'won' ? 'You Crushed It!' : 'Word Escaped!'}
                        </CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" onClick={closeResultModal}>
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      The word was <span className="font-semibold text-slate-900 dark:text-white">{gameState.targetWord}</span>
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Trophy className="w-3.5 h-3.5" /> Score</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{gameState.score.toLocaleString()}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Target className="w-3.5 h-3.5" /> Guesses</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{gameState.guesses.length}/7</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Timer className="w-3.5 h-3.5" /> Time</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">{formatTime(gameState.timeElapsed)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Trophy className="w-3.5 h-3.5" /> Status</p>
                        <p className={`text-lg font-bold ${gameState.gameStatus === 'won' ? 'text-blue-600 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>
                          {gameState.gameStatus === 'won' ? 'Solved' : 'Failed'}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        closeResultModal()
                        router.push('/leaderboard')
                      }}
                    >
                      View Leaderboards
                    </Button>

                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share your run</p>
                      <Button variant="outline" className="w-full" onClick={handleShareToTwitter}>
                        <Share2 className="w-4 h-4 mr-2" /> Share on 𝕏
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
