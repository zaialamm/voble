import { useQuery, QueryObserverResult } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Connection } from '@solana/web3.js'
import { Program } from '@coral-xyz/anchor'
import { vobleProgram, createReadOnlyProvider } from './program'
import { getSessionPDA } from './pdas'
import IDL from '@/idl/idl.json'

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
  isCurrentPeriod: boolean
}

export interface FetchSessionResult {
  session: SessionData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<QueryObserverResult<SessionData | null, Error>>
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
      const [sessionPDA] = getSessionPDA(playerPublicKey)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useFetchSession] Session PDA:', sessionPDA.toString())
      }

      try {
        // Fetch the session account using Anchor
        const erConnection = new Connection('https://devnet.magicblock.app', 'confirmed')
        const erProvider = createReadOnlyProvider(erConnection)
        const erProgram = new Program(IDL as any, erProvider)

        let sessionAccount: any  // Declare variable
        let source: 'er' | 'base' = 'er'

        try {
          // During active gameplay, ONLY check ER (faster)
          sessionAccount = await (erProgram.account as any).sessionAccount.fetch(sessionPDA)
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ [useFetchSession] Session fetched from ER')
          }
        } catch (err: any) {
          // Only try base layer if ER fails with "Account does not exist"
          if (err.message?.includes('Account does not exist')) {
            if (process.env.NODE_ENV === 'development') {
              console.log('ℹ️ [useFetchSession] Not on ER, trying base layer...')
            }
            sessionAccount = await (vobleProgram.account as any).sessionAccount.fetch(sessionPDA)
            source = 'base'
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ [useFetchSession] Session fetched from Base Layer')
            }
          } else {
            // Re-throw other errors (network issues, etc.)
            throw err
          }
        }

        if (sessionAccount?.periodId && sessionAccount.periodId !== trimmedPeriodId) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ [useFetchSession] Session period mismatch detected', {
              source,
              sessionPeriodId: sessionAccount.periodId,
              requestedPeriodId: trimmedPeriodId,
            })
          }

          if (source === 'er') {
            try {
              const baseSession = await (vobleProgram.account as any).sessionAccount.fetch(sessionPDA)
              if (process.env.NODE_ENV === 'development') {
                console.log('✅ [useFetchSession] Session fetched from Base Layer after mismatch:', {
                  periodId: baseSession.periodId,
                })
              }
              if (baseSession.periodId === trimmedPeriodId) {
                sessionAccount = baseSession
                source = 'base'
              } else {
                if (process.env.NODE_ENV === 'development') {
                  console.log('ℹ️ [useFetchSession] Base layer still reflects previous period; reusing existing session account')
                }
              }
            } catch (baseErr: any) {
              if (baseErr.message?.includes('Account does not exist')) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('ℹ️ [useFetchSession] No session account found on base layer; keeping ER session data')
                }
              } else {
                throw baseErr
              }
            }
          }
        }

        if (!sessionAccount) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ [useFetchSession] No session account found')
          }
          return null
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useFetchSession] Session fetched:', {
            sessionId: sessionAccount.sessionId,
            guessesUsed: sessionAccount.guessesUsed,
            isSolved: sessionAccount.isSolved,
            completed: sessionAccount.completed,
            score: sessionAccount.score,
            periodId: sessionAccount.periodId,
            source,
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
          isCurrentPeriod: sessionAccount.periodId === trimmedPeriodId,
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
    staleTime: 1000,
    refetchInterval: false,
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
