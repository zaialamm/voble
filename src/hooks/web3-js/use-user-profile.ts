import { useQuery } from '@tanstack/react-query'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey } from '@solana/web3.js'

import { vobleProgram } from './program'
import { getUserProfilePDA } from './pdas'

export interface Achievement {
  id: string
  name: string
  description: string
  unlockedAt: number
}

export interface UserProfileData {
  player: PublicKey
  username: string
  totalGamesPlayed: number
  gamesWon: number
  currentStreak: number
  maxStreak: number
  totalScore: number
  bestScore: number
  averageGuesses: number
  guessDistribution: number[] // Array of 7 elements (1-7 guesses)
  lastPlayedPeriod: string
  hasPlayedThisPeriod: boolean
  achievements: Achievement[]
  friends: PublicKey[]
  createdAt: number
  lastPlayed: number
  profilePictureUrl: string | null
  isPremium: boolean
}

export interface UserProfileResult {
  profile: UserProfileData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  exists: boolean
}

export function useUserProfile(walletAddress?: string): UserProfileResult {
  const { wallets } = useConnectedStandardWallets()
  const selectedWallet = wallets[0]
  
  // Use provided address or connected wallet address
  const targetAddress = walletAddress || selectedWallet?.address

  const queryResult = useQuery({
    queryKey: ['userProfile', targetAddress],
    queryFn: async (): Promise<UserProfileData | null> => {
      if (!targetAddress) {
        throw new Error('No wallet address provided')
      }

      const playerPublicKey = new PublicKey(targetAddress)

      if (process.env.NODE_ENV === 'development') {
        console.log('👤 [useUserProfile] Fetching profile for:', targetAddress)
      }

      // Derive the user profile PDA
      const [userProfilePDA] = getUserProfilePDA(playerPublicKey)

      if (process.env.NODE_ENV === 'development') {
        console.log('🔑 [useUserProfile] Profile PDA:', userProfilePDA.toString())
      }

      try {
        // Fetch the user profile account using Anchor
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileAccount = await (vobleProgram.account as any).userProfile.fetch(userProfilePDA)

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [useUserProfile] Profile fetched:', {
            username: profileAccount.username,
            totalGamesPlayed: profileAccount.totalGamesPlayed,
            gamesWon: profileAccount.gamesWon,
            currentStreak: profileAccount.currentStreak,
            totalScore: profileAccount.totalScore?.toString(),
          })
        }

        // Transform the raw account data to our interface
        const profileData: UserProfileData = {
          player: profileAccount.player,
          username: profileAccount.username,
          totalGamesPlayed: profileAccount.totalGamesPlayed,
          gamesWon: profileAccount.gamesWon,
          currentStreak: profileAccount.currentStreak,
          maxStreak: profileAccount.maxStreak,
          totalScore: Number(profileAccount.totalScore?.toString() || '0'),
          bestScore: profileAccount.bestScore,
          averageGuesses: profileAccount.averageGuesses,
          guessDistribution: Array.from(profileAccount.guessDistribution),
          lastPlayedPeriod: profileAccount.lastPlayedPeriod,
          hasPlayedThisPeriod: profileAccount.hasPlayedThisPeriod,
          achievements: profileAccount.achievements.map((achievement: {
            id: string
            name: string
            description: string
            unlockedAt: number | bigint
          }) => ({
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            unlockedAt: Number(achievement.unlockedAt?.toString() || '0'),
          })),
          friends: profileAccount.friends,
          createdAt: Number(profileAccount.createdAt?.toString() || '0'),
          lastPlayed: Number(profileAccount.lastPlayed?.toString() || '0'),
          profilePictureUrl: profileAccount.profilePictureUrl || null,
          isPremium: profileAccount.isPremium,
        }

        return profileData
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        if (error.message?.includes('Account does not exist')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ℹ️ [useUserProfile] No profile found for this wallet')
          }
          return null
        }
        
        console.error('❌ [useUserProfile] Error fetching profile:', err)
        throw new Error(`Failed to fetch user profile: ${error.message}`)
      }
    },
    enabled: !!targetAddress,
    staleTime: 5 * 60 * 1000, 
    refetchOnWindowFocus: false, 
    retry: (failureCount, error) => {
      // Don't retry if account doesn't exist
      if (error.message?.includes('Account does not exist')) {
        return false
      }
      return failureCount < 3
    },
  })

  return {
    profile: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    refetch: queryResult.refetch,
    exists: queryResult.data !== null,
  }
}

/**
 * Hook to get the current user's profile (connected wallet)
 */
export function useCurrentUserProfile(): UserProfileResult {
  const { wallets } = useConnectedStandardWallets()
  const selectedWallet = wallets[0]
  
  return useUserProfile(selectedWallet?.address)
}

/**
 * Hook to check if a user profile exists without fetching full data
 */
export function useProfileExists(walletAddress: string): {
  exists: boolean
  isLoading: boolean
  error: string | null
} {
  const queryResult = useQuery({
    queryKey: ['profileExists', walletAddress],
    queryFn: async (): Promise<boolean> => {
      if (!walletAddress) {
        return false
      }

      const playerPublicKey = new PublicKey(walletAddress)
      const [userProfilePDA] = getUserProfilePDA(playerPublicKey)

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (vobleProgram.account as any).userProfile.fetch(userProfilePDA)
        return true
      } catch (err: unknown) {
        const error = err as Error & { message?: string }
        if (error.message?.includes('Account does not exist')) {
          return false
        }
        throw err
      }
    },
    enabled: !!walletAddress,
    staleTime: 60000, // Cache for 1 minute
    retry: false, // Don't retry for existence checks
  })

  return {
    exists: queryResult.data || false,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
  }
}
