import { useState } from 'react'
import { useConnectedStandardWallets } from '@privy-io/react-auth/solana'
import { PublicKey, Connection, Transaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { vobleProgram, SYSTEM_PROGRAM_ID } from './program'
import {
  getWinnerEntitlementPDA,
  getDailyPrizeVaultPDA,
  getWeeklyPrizeVaultPDA,
  getMonthlyPrizeVaultPDA,
} from './pdas'
import { createConnection, handleTransactionError } from './utils'

export type PrizePeriodType = 'daily' | 'weekly' | 'monthly'

export interface PrizeEntitlementInfo {
  exists: boolean
  claimed: boolean
  amount: number
}

export interface ClaimPrizeResult {
  success: boolean
  signature?: string
  error?: string
}

export function useClaimPrize() {
  const { wallets } = useConnectedStandardWallets()
  const selectedWallet = wallets[0]

  const [isChecking, setIsChecking] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkEntitlement = async (
    periodType: PrizePeriodType,
    periodId: string,
  ): Promise<PrizeEntitlementInfo> => {
    setIsChecking(true)
    setError(null)

    console.log('[useClaimPrize] checkEntitlement:start', {
      periodType,
      periodId,
      walletAddress: selectedWallet?.address,
    })

    try {
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }
      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      const playerPublicKey = new PublicKey(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()
      const [entitlementPda] = getWinnerEntitlementPDA(
        playerPublicKey,
        periodType,
        trimmedPeriodId,
      )

      console.log('[useClaimPrize] checkEntitlement:PDAs', {
        entitlementPda: entitlementPda.toBase58(),
      })

      const account: any = await (vobleProgram.account as any).winnerEntitlement.fetch(
        entitlementPda,
      )

      console.log('[useClaimPrize] checkEntitlement:account', {
        amountRaw: account.amount,
        claimed: account.claimed,
      })

      const amount = Number(account.amount?.toString() || '0')
      const claimed = Boolean(account.claimed)

      setIsChecking(false)
      const result: PrizeEntitlementInfo = {
        exists: true,
        claimed,
        amount,
      }

      console.log('[useClaimPrize] checkEntitlement:result', result)
      return result
    } catch (err: any) {
      console.error('[useClaimPrize] checkEntitlement:error', err)
      const message = err?.message || ''
      if (message.includes('Account does not exist')) {
        setIsChecking(false)
        return {
          exists: false,
          claimed: false,
          amount: 0,
        }
      }

      const friendly = handleTransactionError(err)
      setError(friendly)
      setIsChecking(false)
      return {
        exists: false,
        claimed: false,
        amount: 0,
      }
    }
  }

  const claimPrize = async (
    periodType: PrizePeriodType,
    periodId: string,
  ): Promise<ClaimPrizeResult> => {
    setIsClaiming(true)
    setError(null)

    console.log('[useClaimPrize] claimPrize:start', {
      periodType,
      periodId,
      walletAddress: selectedWallet?.address,
    })

    try {
      if (!selectedWallet?.address) {
        throw new Error('No wallet connected')
      }
      if (!periodId || periodId.trim().length === 0) {
        throw new Error('Period ID is required')
      }

      const playerPublicKey = new PublicKey(selectedWallet.address)
      const trimmedPeriodId = periodId.trim()

      const entitlementInfo = await checkEntitlement(periodType, trimmedPeriodId)

      console.log('[useClaimPrize] claimPrize:entitlementInfo', entitlementInfo)
      if (!entitlementInfo.exists) {
        throw new Error('No prize available to claim for this period')
      }
      if (entitlementInfo.claimed) {
        throw new Error('Prize already claimed')
      }
      if (entitlementInfo.amount <= 0) {
        throw new Error('Invalid prize amount')
      }

      const [entitlementPda] = getWinnerEntitlementPDA(
        playerPublicKey,
        periodType,
        trimmedPeriodId,
      )

      let vaultPda: PublicKey
      if (periodType === 'daily') {
        ;[vaultPda] = getDailyPrizeVaultPDA()
      } else if (periodType === 'weekly') {
        ;[vaultPda] = getWeeklyPrizeVaultPDA()
      } else {
        ;[vaultPda] = getMonthlyPrizeVaultPDA()
      }

      console.log('[useClaimPrize] claimPrize:PDAs', {
        entitlementPda: entitlementPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
      })

      let ix
      if (periodType === 'daily') {
        ix = await (vobleProgram.methods as any)
          .claimDaily()
          .accounts({
            winnerEntitlement: entitlementPda,
            dailyPrizeVault: vaultPda,
            winner: playerPublicKey,
            winnerTokenAccount: getAssociatedTokenAddressSync(new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), playerPublicKey),
            usdcMint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .instruction()
      } else if (periodType === 'weekly') {
        ix = await (vobleProgram.methods as any)
          .claimWeekly()
          .accounts({
            winnerEntitlement: entitlementPda,
            weeklyPrizeVault: vaultPda,
            winner: playerPublicKey,
            winnerTokenAccount: getAssociatedTokenAddressSync(new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), playerPublicKey),
            usdcMint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .instruction()
      } else {
        ix = await (vobleProgram.methods as any)
          .claimMonthly()
          .accounts({
            winnerEntitlement: entitlementPda,
            monthlyPrizeVault: vaultPda,
            winner: playerPublicKey,
            winnerTokenAccount: getAssociatedTokenAddressSync(new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"), playerPublicKey),
            usdcMint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
            systemProgram: SYSTEM_PROGRAM_ID,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .instruction()
      }

      console.log('[useClaimPrize] claimPrize:instructionBuilt', {
        periodType,
      })

      const connection = createConnection('confirmed')

      // Log vault balance before attempting claim
      try {
        const vaultBalance = await connection.getBalance(vaultPda)
        console.log('[useClaimPrize] claimPrize:vaultBalance', {
          vaultPda: vaultPda.toBase58(),
          vaultBalance,
        })
      } catch (balanceErr) {
        console.error('[useClaimPrize] claimPrize:getBalanceError', balanceErr)
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()

      const tx = new Transaction({
        blockhash,
        lastValidBlockHeight,
        feePayer: playerPublicKey,
      }).add(ix)

      console.log('[useClaimPrize] claimPrize:txBuilt', {
        blockhash,
        lastValidBlockHeight,
        feePayer: playerPublicKey.toBase58(),
      })

      // Simulate transaction to capture on-chain logs before sending via wallet
      try {
        const simulation = await connection.simulateTransaction(tx)
        console.log('[useClaimPrize] claimPrize:simulation', simulation)
      } catch (simErr) {
        console.error('[useClaimPrize] claimPrize:simulationError', simErr)
      }

      const result = await selectedWallet.signAndSendTransaction!({
        chain: 'solana:devnet',
        transaction: new Uint8Array(
          tx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          }),
        ),
      })

      const signature = bs58.encode(result.signature)

      console.log('[useClaimPrize] claimPrize:success', {
        signature,
        rawResult: result,
      })

      setIsClaiming(false)
      return {
        success: true,
        signature,
      }
    } catch (err: any) {
      console.error('[useClaimPrize] claimPrize:error', err)
      const friendly = handleTransactionError(err)
      console.error('[useClaimPrize] claimPrize:friendlyError', friendly)
      setError(friendly)
      setIsClaiming(false)
      return {
        success: false,
        error: friendly,
      }
    }
  }

  return {
    checkEntitlement,
    claimPrize,
    isChecking,
    isClaiming,
    error,
  }
}
