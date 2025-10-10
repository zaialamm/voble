'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Target, 
  Zap,
  Timer,
  WalletIcon,
  Wallet,
  Ticket
} from 'lucide-react'
import { usePrivy } from "@privy-io/react-auth"
import { useConnectedStandardWallets } from "@privy-io/react-auth/solana"
import { 
  useBuyTicket,
  useSubmitGuess,
  useCompleteGame,
  useFetchSession
} from '@/hooks/web3-js'
import { useSessionWallet } from '@magicblock-labs/gum-react-sdk'
import { PrizeVaultsDisplay } from '@/components/prize-vaults-display'
// ER Integration
import { useUnifiedSession } from '@/hooks/mb-er'

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
  const { submitGuess: submitGuessToBlockchain } = useSubmitGuess()
  const { completeGame } = useCompleteGame()
  const { session, refetch: refetchSession } = useFetchSession(periodId)
  
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
        shouldShowGame: session && session.periodId === periodId && !session.completed && session.guessesUsed < 7,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.periodId, session?.completed, session?.isSolved, session?.guessesUsed]) // Only log when these specific fields change - intentionally limited deps
  
  // ER Integration - Unified Session Management
  const sessionWallet = useSessionWallet()
  const {
    hasSessionKey,
    canPlayGasless,
    createSession,
    statusMessage,
    statusType
  } = useUnifiedSession()
  
  const [creatingSession, setCreatingSession] = useState(false)
  const creatingSessionRef = useRef(false) // ✅ FIX: Prevent double-calling createSession
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null)
  
  // Session status now handled by useUnifiedSession hook
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
        
        // LetterResult is an enum: 0 = Correct, 1 = Present, 2 = Absent
        // Result comes as string from the array
        if (result === '0') { // LetterResult.Correct
          state = 'correct'
          newKeyboardState[letter] = 'correct'
        } else if (result === '1') { // LetterResult.Present
          state = 'present'
          if (newKeyboardState[letter] !== 'correct') {
            newKeyboardState[letter] = 'present'
          }
        } else { // LetterResult.Absent
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
        return 'bg-blue-600 border-blue-600 text-white font-bold shadow-sm'
      case 'present':
        return 'bg-orange-500 border-orange-500 text-white font-bold shadow-sm'
      case 'absent':
        return 'bg-slate-400 dark:bg-slate-600 border-slate-400 dark:border-slate-600 text-white font-bold'
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
        return `${baseStyle} bg-blue-600 text-white shadow-sm`
      case 'present':
        return `${baseStyle} bg-orange-500 text-white shadow-sm`
      case 'absent':
        return `${baseStyle} bg-slate-400 dark:bg-slate-600 text-white`
      default:
        return `${baseStyle} bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600`
    }
  }

  const handleKeyPress = (key: string) => {
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
    const currentGuess = gameState.grid[gameState.currentRow]
      .map(tile => tile.letter)
      .join('')

    if (currentGuess.length !== 6) return
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 Submitting guess to blockchain:', currentGuess)
    }
    setGameState(prev => ({ ...prev, gameStatus: 'loading' }))

    try {
      // Submit to blockchain
      const result = await submitGuessToBlockchain(periodId, currentGuess)
      
      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Guess submitted successfully!', result.signature)
        }
        
        // Wait for blockchain to process
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Refetch session to get updated guesses and results
        await refetchSession()
        
        // Update UI based on blockchain data
        if (session) {
          updateGridFromSession()
          
          // Check if game ended
          if (session.isSolved || session.guessesUsed >= 7) {
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

  // Score calculation handled by smart contract
  // const calculateScore = (guessCount: number, timeElapsed: number) => {
  //   const baseScore = 1000
  //   const guessBonus = Math.max(0, (8 - guessCount) * 100)
  //   const timeBonus = Math.max(0, (300 - timeElapsed) * 2)
  //   return baseScore + guessBonus + timeBonus
  // }


  const handleBuyTicket = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🎫 [handleBuyTicket] Starting ticket purchase...')
    }
    
    // Clear previous errors
    setSessionError(null)
    
    try {
      // Step 1: Ensure session key exists FIRST (one wallet popup)
      if (!hasSessionKey) {
        // ✅ FIX: Prevent double-calling createSession (React strict mode issue)
        if (creatingSessionRef.current) {
          if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ [handleBuyTicket] Session creation already in progress, skipping...')
          }
          return
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔑 [handleBuyTicket] Creating session key first...')
        }
        creatingSessionRef.current = true
        setCreatingSession(true)
        
        const sessionResult = await createSession()
        
        if (!sessionResult.success) {
          setCreatingSession(false)
          creatingSessionRef.current = false
          const errorMsg = sessionResult.error || 'Failed to create session'
          setSessionError(errorMsg)
          throw new Error(errorMsg)
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [handleBuyTicket] Session created successfully!')
        }
        
        // Session is now created and stored in IndexedDB
        // The createSession() already handles the full flow including IndexedDB write
        setCreatingSession(false)
        creatingSessionRef.current = false
      }
      
      // Step 2: Buy ticket (second wallet popup - uses main wallet, goes to base layer)
      if (process.env.NODE_ENV === 'development') {
        console.log('🎫 [handleBuyTicket] Purchasing ticket...')
      }
      const result = await buyTicket(periodId)
      
      if (result.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [handleBuyTicket] Ticket purchased successfully!')
        }
        
        // Refetch session to get the new game session from blockchain
        await refetchSession()
        
        // Reset game state for new session
        setGameState({
          grid: Array(7).fill(null).map(() => 
            Array(6).fill(null).map(() => ({ letter: '', state: 'empty' }))
          ),
          currentRow: 0,
          currentCol: 0,
          gameStatus: 'playing',
          targetWord: '', // Will come from blockchain
          guesses: [],
          score: 0,
          timeElapsed: 0
        })
        setKeyboardState({})
        setStartTime(Date.now()) // Reset timer
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🎮 [handleBuyTicket] Ready to play with gasless transactions!')
        }
        
      } else {
        throw new Error(result.error || 'Failed to buy ticket')
      }
    } catch (error: unknown) {
      const err = error as Error & { message?: string }
      console.error('❌ [handleBuyTicket] Error:', err)
      setSessionError(err.message || 'An error occurred')
      setCreatingSession(false)
      creatingSessionRef.current = false // ✅ Reset the guard on error
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
      await refetchSession()
      
      setGameState(prev => ({
        ...prev,
        gameStatus: session?.isSolved ? 'won' : 'lost',
        score: session?.score || 0
      }))
    } else {
      console.error('❌ Failed to complete game:', result.error)
    }
  }

  // 🧪 TEST: Isolated session creation handler
  const handleTestCreateSession = async () => {
    console.log('🧪 [TEST] ========================================')
    console.log('🧪 [TEST] Starting isolated session creation test...')
    console.log('🧪 [TEST] ========================================')
    
    setSessionError(null)
    setSessionSuccess(null)
    setCreatingSession(true)
    
    try {
      // ✅ First, try to revoke any existing session to avoid "already processed" errors
      if (sessionWallet?.revokeSession && hasSessionKey) {
        console.log('🧪 [TEST] Revoking existing session first...')
        try {
          await sessionWallet.revokeSession()
          console.log('🧪 [TEST] ✅ Existing session revoked')
          // Wait for revocation to complete
          await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (revokeError) {
          console.warn('🧪 [TEST] ⚠️ Could not revoke existing session:', revokeError)
        }
      }
      
      console.log('🧪 [TEST] Current session wallet state:', {
        hasSessionWallet: !!sessionWallet,
        publicKey: sessionWallet?.publicKey?.toString(),
        hasSessionToken: !!sessionWallet?.sessionToken,
        hasGetSessionTokenMethod: !!sessionWallet?.getSessionToken,
      })
      
      console.log('🧪 [TEST] Calling createSession()...')
      const startTime = Date.now()
      const result = await createSession()
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      
      console.log('🧪 [TEST] createSession() returned after', elapsed, 'seconds:', result)
      
      if (result.success) {
        console.log('🧪 [TEST] ✅ SUCCESS - Session creation returned success')
        console.log('🧪 [TEST] Now checking if token is available in IndexedDB...')
        
        // Wait a bit and check
        await new Promise(resolve => setTimeout(resolve, 3000))
        
        if (sessionWallet?.getSessionToken) {
          try {
            const token = await sessionWallet.getSessionToken()
            console.log('🧪 [TEST] Token from IndexedDB:', token)
            
            if (token) {
              setSessionSuccess(`✅ Session created successfully! Token: ${token.substring(0, 30)}...`)
              console.log('🧪 [TEST] ✅ Token confirmed in IndexedDB!')
            } else {
              setSessionSuccess('⚠️ Session created but token not in IndexedDB yet. Please refresh page.')
              console.warn('🧪 [TEST] ⚠️ Token not found in IndexedDB')
            }
          } catch (error) {
            console.error('🧪 [TEST] Error fetching token:', error)
            setSessionSuccess('⚠️ Session created but error fetching token')
          }
        }
      } else {
        setSessionError(`❌ Failed: ${result.error}`)
        console.error('🧪 [TEST] ❌ FAILED:', result.error)
      }
    } catch (error: unknown) {
      const err = error as Error & { message?: string; stack?: string }
      console.error('🧪 [TEST] ❌ EXCEPTION:', err)
      console.error('🧪 [TEST] Error details:', {
        message: err.message,
        stack: err.stack,
      })
      setSessionError(`❌ Error: ${err.message}`)
    } finally {
      setCreatingSession(false)
      console.log('🧪 [TEST] ========================================')
      console.log('🧪 [TEST] Test completed')
      console.log('🧪 [TEST] ========================================')
    }
  }

  // Log session status to console - MOVED BEFORE EARLY RETURNS
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔑 [Game Page] Session Status:', {
        hasSessionKey,
        canPlayGasless,
        statusMessage,
        statusType,
        sessionWalletAddress: sessionWallet?.publicKey?.toBase58(),
        hasSessionToken: !!sessionWallet?.sessionToken,
      })
    }
  }, [hasSessionKey, canPlayGasless, statusMessage, statusType, sessionWallet?.publicKey, sessionWallet?.sessionToken])

  // Add BEFORE the authentication check
  // Show loading while Privy is initializing
  if (!ready) {
    return (
      <div className="container mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <p className="text-muted-foreground">Initializing...</p>
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

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto py-8 max-w-4xl">
      {/* Prize Vaults Display */}
      <PrizeVaultsDisplay />

      {/* Buy Ticket Section */}
      {/* ✅ FIX: Check if session is for current period AND not used up */}
      {/* Session is "used up" if completed OR all guesses used (7 max) */}
      {(!session || session.periodId !== periodId || session.completed || session.guessesUsed >= 7) && (
        <Card className="mb-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ready to Play?</h2>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Purchase a ticket to start your daily word puzzle challenge!
              </p>
              <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                {/* Session Status Display */}
                <div className="w-full space-y-2 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Session Status:</span>
                    <span className={`font-medium ${hasSessionKey ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      {hasSessionKey ? '✅ Active' : '⚠️ No Session'}
                    </span>
                  </div>
                  {sessionWallet?.publicKey && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 break-all">
                      Session Key: {sessionWallet.publicKey.toString().substring(0, 30)}...
                    </div>
                  )}
                </div>

                {/* 🧪 TEST: Create Session Button */}
                {/* Commented out for production - only show Buy Ticket and Start Game */}
                {/* {!hasSessionKey && (
                  <Button
                    onClick={handleTestCreateSession}
                    disabled={creatingSession}
                    size="lg"
                    variant="outline"
                    className="w-full border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950"
                  >
                    {creatingSession ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                        Creating Session...
                      </>
                    ) : (
                      <>
                        🔑 Test: Create Session Only
                      </>
                    )}
                  </Button>
                )} */}

                {/* Status Messages */}
                {sessionSuccess && (
                  <div className="w-full p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-green-700 dark:text-green-300 text-sm">{sessionSuccess}</p>
                  </div>
                )}
                {sessionError && (
                  <div className="w-full p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-700 dark:text-red-300 text-sm font-medium">❌ {sessionError}</p>
                  </div>
                )}

                {/* Divider */}
                {/* Commented out for production */}
                {/* {!hasSessionKey && (
                  <div className="w-full border-t border-slate-300 dark:border-slate-600 my-2"></div>
                )} */}

                {/* Original Buy Ticket Button */}
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Ticket Price: <span className="font-bold text-blue-600 dark:text-blue-400">0.001 SOL</span>
                </p>
                <Button
                  onClick={handleBuyTicket}
                  disabled={isBuyingTicket || creatingSession}
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {(isBuyingTicket || creatingSession) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {creatingSession ? 'Creating Session...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <Ticket className="h-5 w-5 mr-2" />
                      Buy Ticket & Start Game
                    </>
                  )}
                </Button>
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

      {/* Game Header */}
      {/* ✅ FIX: Only show game for valid, active sessions with guesses remaining */}
      {session && session.periodId === periodId && !session.completed && session.guessesUsed < 7 && (
        <>
          <div className="flex justify-center items-center mb-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Voble
              </h1>
              <p className="text-slate-600 dark:text-slate-400">Guess the 6-letter word!</p>
              {hasSessionKey && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  🔑 Session Active - No popups needed!
                </p>
              )}
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
                    disabled={gameState.gameStatus !== 'playing'}
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
                <Button variant="outline">
                  View Leaderboard
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
