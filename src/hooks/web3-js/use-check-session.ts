import { useQuery } from '@tanstack/react-query'
import { PublicKey } from '@solana/web3.js'
import { vocabeeProgram } from './program'
import { getSessionPDA } from './pdas'

export function useCheckSession(walletAddress?: string) {
  return useQuery({
    queryKey: ['session-exists', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return false

      try {
        const [sessionPDA] = getSessionPDA(new PublicKey(walletAddress))
        const session = await vocabeeProgram.account.sessionAccount.fetch(sessionPDA)
        
        // Session exists if player is set (not default pubkey)
        return session.player.toString() !== PublicKey.default.toString()
      } catch (error) {
        // Account doesn't exist
        return false
      }
    },
    enabled: !!walletAddress,
    refetchOnWindowFocus: false,
  })
}