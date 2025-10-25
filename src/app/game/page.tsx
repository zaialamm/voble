'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Target, 
  Zap,
  Timer,
  WalletIcon,
  Wallet,
  Ticket,
  UserCircle
} from 'lucide-react'
import { usePrivy } from "@privy-io/react-auth"
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana"
import { 
  useBuyTicket,
  useDelegateSession,
  useSubmitGuess,
  useCompleteGame,
  useFetchSession,
  useUserProfile
} from '@/hooks/web3-js'
import { useInitializeSession } from '@/hooks/web3-js/use-initialize-session'
import { useCheckSession } from '@/hooks/web3-js/use-check-session'
import { PrizeVaultsDisplay } from '@/components/prize-vaults-display'
import Link from 'next/link'
import { Connection, PublicKey } from '@solana/web3.js'
import { getSessionPDA } from '@/hooks/web3-js/pdas'
import { useUndelegateSession } from '@/hooks/web3-js/use-undelegate-session'

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
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE']
]

const ticketPrice = 0.001

export default function GamePage() {
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
  const { delegateSession, isLoading: isDelegating } = useDelegateSession()
  const { submitGuess: submitGuessToBlockchain } = useSubmitGuess()
  const { completeGame } = useCompleteGame()
  const { undelegateSession, isLoading: isUndelegating } = useUndelegateSession()  
  const { session, refetch: refetchSession } = useFetchSession(periodId)
  const { initializeSession, isLoading: isInitializing } = useInitializeSession()
  const { data: sessionExists, refetch: refetchSessionExists } = useCheckSession(activeWallet?.address)
  // Use activeWallet address to support both external and embedded wallets
  const { profile, isLoading: isLoadingProfile, refetch: refetchProfile } = useUserProfile(activeWallet?.address)
  
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
        shouldShowBuyTicket: !session || session.periodId !== periodId || session.completed || (session.guessesUsed >= 7),
        shouldShowGame: session && session.periodId === periodId && !session.completed && session.guessesUsed < 7 && isDelegated,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.periodId, session?.completed, session?.isSolved, session?.guessesUsed]) // Only log when these specific fields change - intentionally limited deps
  
  

  const [gameState, setGameState] = useState<GameState>({
    grid: Array(7).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ letter: '', state: 'empty' }))
    ),
    currentRow: 0,
    currentCol: 0,
    gameStatus: 'playing',
    targetWord: 'SOLANA', // Mock word - will come from smart contract VRF
    guesses: [],
    score: 0,
    timeElapsed: 0
  })

  const [keyboardState, setKeyboardState] = useState<Record<string, TileState>>({})
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [isDelegated, setIsDelegated] = useState(false) 

  // Function to update grid from blockchain session data
  const updateGridFromSession = () => {
    if (!session) return
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [updateGridFromSession] Updating grid from session:', {
        guessesUsed: session.guessesUsed,
        guessesArray: session.guesses,
      })
    }
    
    const newGrid = Array(7).fill(null).map(() => 
      Array(6).fill(null).map(() => ({ letter: '', state: 'empty' as TileState }))
    )
    const newKeyboardState: Record<string, TileState> = {}
    
    // Update grid with guesses from blockchain
    session.guesses.forEach((guessData: { guess: string; result: string[] } | null, rowIndex: number) => {
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
        currentRow: session.guessesUsed,
        keyboardState: newKeyboardState,
      })
    }
    
    setGameState(prev => ({
      ...prev,
      grid: newGrid,
      currentRow: session.guessesUsed,
      currentCol: 0
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
    const baseStyle = 'px-4 py-6 rounded-lg font-medium text-base transition-all duration-200 hover:scale-105 min-w-[2.5rem]'
    
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
  const canPlayGame = session && session.periodId === periodId && !session.completed && session.guessesUsed < 7

  const handleKeyPress = (key: string) => {
    // Block input if no valid ticket
    if (!canPlayGame) {
      console.warn('⚠️ Cannot play: Missing valid ticket')
      return
    }
    
    if (gameState.gameStatus !== 'playing') return

    if (key === 'BACKSPACE') {
      if (gameState.currentCol > 0) {
        const newGrid = [...gameState.grid]
        newGrid[gameState.currentRow][gameState.currentCol - 1] = { letter: '', state: 'empty' }
        setGameState(prev => ({
          ...prev,
          grid: newGrid,
          currentCol: prev.currentCol - 1
        }))
      }
    } else if (key === 'ENTER') {
      if (gameState.currentCol === 6) {
        submitGuess()
      }
    } else if (key.length === 1 && gameState.currentCol < 6) {
      const newGrid = [...gameState.grid]
      newGrid[gameState.currentRow][gameState.currentCol] = { letter: key, state: 'filled' }
      setGameState(prev => ({
        ...prev,
        grid: newGrid,
        currentCol: prev.currentCol + 1
      }))
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
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Guess submitted successfully!', result.signature)
        }
        
      // Refetch session to get updated guesses and results
      await refetchSession()

      // Update UI based on blockchain data (use session from hook)
      if (session) {
        // Check the last guess result directly from session data
        const lastGuessIndex = session.guessesUsed - 1
        const lastGuess = session.guesses[lastGuessIndex]
        const allCorrect = lastGuess?.result?.every((r: string) => r === 'Correct')
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Checking game end:', {
            lastGuessIndex,
            allCorrect,
            isSolved: session.isSolved,
            guessesUsed: session.guessesUsed
          })
        }
        
        updateGridFromSession()
        
        // Check if game ended
        if (allCorrect || session.isSolved || session.guessesUsed >= 7) {
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
    await refetchSessionExists()
    
    alert('Session created! You can now buy a ticket to play.')
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
    await refetchSession()   
    
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
      timeElapsed: 0
    })
    setKeyboardState({})
    setStartTime(Date.now())
    
    console.log('🎮 Ready to play on ER!')
    
  } catch (error: unknown) {
    const err = error as Error & { message?: string }
    console.error('❌ [handleBuyTicket] Error:', err)
    setIsDelegated(false)
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

      // Undelegate session from ER
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Undelegating session...')
      }

      await undelegateSession()  // ← ADD THIS
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Session undelegated!')
      }
      
      // Wait for session to update
      await new Promise(resolve => setTimeout(resolve, 2000))
      await refetchSession()
      
      // Wait for React state to update
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Now use the updated session data
      if (session) {
        setGameState(prev => ({
          ...prev,
          gameStatus: session.isSolved ? 'won' : 'lost',
          score: session.score || 0,
          targetWord: session.targetWord || 'UNKNOWN', // ← Add target word!
          timeElapsed: session.timeMs || 0 // ← Add time!
        }))
      }
    } else {
      console.error('❌ Failed to complete game:', result.error)
    }
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
      <div className="container mx-auto py-8">
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
    )
  }

  // Show login prompt if not authenticated or no wallet
  if (!authenticated || !activeWallet) {
    return (
      <div className="container mx-auto py-8">
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
    )
  }

  // Show create profile prompt if user doesn't have a profile
  if (!profile) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
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
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto py-8 max-w-4xl">
      {/* Prize Vaults Display */}
      <PrizeVaultsDisplay />

      {/* Session Creation (First Time Only) */}
      {!sessionExists && (
        <Card className="border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle className="text-yellow-800 dark:text-yellow-200">
              🎮 First Time Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Before you can play, you need to create a session account (one-time setup).
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Cost: ~0.002 SOL (rent, reclaimable)
            </p>
            <Button
              onClick={handleInitializeSession}
              disabled={isInitializing}
              className="w-full"
            >
              {isInitializing ? 'Creating Session...' : 'Create Session Account'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Buy Ticket Button (Only show if session exists) */}
      {sessionExists && !session && (
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
      {(!session || session.periodId !== periodId || session.completed || session.guessesUsed >= 7) && (
        <Card className="mb-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
                    disabled={isBuyingTicket || isDelegating}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    {isBuyingTicket ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Buying Ticket...
                      </>
                    ) : isDelegating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Delegating to ER...
                      </>
                    ) : (
                      <>
                        <Ticket className="h-5 w-5 mr-2" />
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

      {/* ✅ SECURITY: No warning banner - game UI only shows when ALL requirements met */}

      {/* Game Header */}
      {/* ✅ SECURITY: Only show game if BOTH session key AND valid ticket exist */}
      {canPlayGame && (
        <>
          <div className="flex justify-center items-center mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Voble
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Guess the 6-letter word!</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✅ Ticket Paid
                </p>
                <span className="text-slate-400">•</span>
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✅ On-Chain Session
                </p>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                🎮 Ready to play!
              </p>
            </div>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Timer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Time</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{formatTime(gameState.timeElapsed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Guesses</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{gameState.currentRow}/7</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Score</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{gameState.score.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white capitalize">{gameState.gameStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Game Grid */}
      <Card className="mb-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="pt-6">
          <div className="grid grid-rows-7 gap-1 max-w-md mx-auto">
            {gameState.grid.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-1">
                {row.map((tile, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-16 h-16 border-2 rounded flex items-center justify-center text-xl font-bold
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

      {/* Virtual Keyboard */}
      <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="pt-6">
          <div className="space-y-2">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {row.map((key) => (
                  <Button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={`
                      ${key === 'ENTER' || key === 'BACKSPACE' ? 'px-6 min-w-[4rem]' : ''} 
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

      {/* Game Result Modal */}
      {(gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-center">
                {gameState.gameStatus === 'won' ? (
                  <div className="text-blue-600 dark:text-blue-400">🎉 Congratulations!</div>
                ) : (
                  <div className="text-red-600 dark:text-red-400">😔 Game Over</div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-lg text-slate-900 dark:text-white">
                The word was: <span className="font-bold text-blue-600 dark:text-blue-400">{gameState.targetWord}</span>
              </p>
              
              {gameState.gameStatus === 'won' && (
                <div className="space-y-2 text-slate-900 dark:text-white">
                  <p>Your Score: <span className="font-bold text-blue-600 dark:text-blue-400">{gameState.score.toLocaleString()}</span></p>
                  <p>Guesses Used: <span className="font-bold">{gameState.guesses.length}/7</span></p>
                  <p>Time: <span className="font-bold">{formatTime(gameState.timeElapsed)}</span></p>
                </div>
              )}

                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const text = gameState.gameStatus === 'won' 
                        ? `🎉 I just solved today's Voble in ${gameState.guesses.length}/7 guesses and scored ${gameState.score.toLocaleString()} points! Can you beat my score? 🎮`
                        : `😔 I couldn't solve today's Voble. The word was ${gameState.targetWord}. Can you do better? 🎮`
                      const url = 'https://voble.fun' 
                      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
                      window.open(twitterUrl, '_blank')
                    }}
                  >
                    Share on 𝕏
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
