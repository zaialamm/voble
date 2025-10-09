import { useQuery } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'

export type LetterResult = 'Correct' | 'Present' | 'Absent'

export interface GuessData {
  guess: string
  result: LetterResult[]
  timestamp: number
}

export interface SessionData {
  player: PublicKey
  sessionId: string
  targetWordHash: number[]
  wordIndex: number
  targetWord: string
  guesses: (GuessData | null)[]
  isSolved: boolean
  guessesUsed: number
  timeMs: number
  score: number
  completed: boolean
  periodId: string
  vrfRequestTimestamp: number
}

export interface FetchSessionResult {
  session: SessionData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useFetchSession(periodId: string): FetchSessionResult {
  const { wallets } = useConnectedStandardWallets()
  const selectedWallet = wallets[0]

  const queryResult = useQuery({
    queryKey: ['gameSession', selectedWallet?.address, periodId],
    queryFn: async (): Promise<SessionData | null> => {
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }

      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      const playerPublicKey = new PublicKey(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 [useFetchSession] Fetching session for:', {
          wallet: selectedWallet.address,
          periodId: trimmedPeriodId,
        })
      }

      // Derive the session PDA
      const [sessionPDA] = getSessionPDA(playerPublicKey, trimmedPeriodId)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useFetchSession] Session PDA:', sessionPDA.toString())
      }

      try {
        // Fetch the session account using Anchor
        const sessionAccount = await vocabeeProgram.account.sessionAccount.fetch(sessionPDA)

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useFetchSession] Session fetched:', {
            sessionId: sessionAccount.sessionId,
            guessesUsed: sessionAccount.guessesUsed,
            isSolved: sessionAccount.isSolved,
            completed: sessionAccount.completed,
            score: sessionAccount.score,
          })
        }

        // Transform the raw account data to our interface
        const sessionData: SessionData = {
          player: sessionAccount.player,
          sessionId: sessionAccount.sessionId,
          targetWordHash: Array.from(sessionAccount.targetWordHash),
          wordIndex: sessionAccount.wordIndex,
          targetWord: sessionAccount.targetWord,
          guesses: sessionAccount.guesses.map((guess: any) => {
            if (!guess) return null
            return {
              guess: guess.guess,
              result: guess.result.map((r: any) => {
                // Convert enum variants to string
                if (r.correct !== undefined) return 'Correct'
                if (r.present !== undefined) return 'Present'
                if (r.absent !== undefined) return 'Absent'
                return 'Absent' // fallback
              }),
              timestamp: guess.timestamp?.toNumber() || 0,
            }
          }),
          isSolved: sessionAccount.isSolved,
          guessesUsed: sessionAccount.guessesUsed,
          timeMs: sessionAccount.timeMs?.toNumber() || 0,
          score: sessionAccount.score,
          completed: sessionAccount.completed,
          periodId: sessionAccount.periodId,
          vrfRequestTimestamp: sessionAccount.vrfRequestTimestamp?.toNumber() || 0,
        }

        return sessionData
      } catch (err: any) {
        if (err.message?.includes('Account does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ [useFetchSession] No session found for this period')
          }
          return null
        }
        
        console.error('❌ [useFetchSession] Error fetching session:', err)
        throw new Error(`Failed to fetch session: ${err.message}`)
      }
    },
    enabled: !!selectedWallet?.address && !!periodId,
    staleTime: 5000, // Consider data stale after 5 seconds
    refetchInterval: false, // Refetch every 10 seconds during active gameplay
    retry: (failureCount, error) => {
      // Don't retry if account doesn't exist
      if (error.message?.includes('Account does not exist')) {
        return false
      }
      return failureCount < 3
    },
  })

  return {
    session: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
  }
}
