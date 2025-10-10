import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'
import { PROGRAM_ID } from './program-id'

export interface CommitRollupParams {
  market: PublicKey
  rollupAuthority: PublicKey
  newSupply: number
  newReserves: number
}

export interface CommitRollupResult {
  transactionSignature: string
}

export function useCommitRollup() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const commitRollup = useCallback(async (params: CommitRollupParams): Promise<CommitRollupResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { market, rollupAuthority, newSupply, newReserves } = params

      // Check if market is delegated
      const marketAccount = await program.account.market.fetch(market)
      if (!marketAccount.isDelegated) {
        toast({
          title: 'Error',
          description: 'Market is not currently delegated',
          variant: 'destructive',
        })
        return null
      }

      // Check if the rollup authority is authorized
      if (marketAccount.rollupAuthority?.toString() !== rollupAuthority.toString()) {
        toast({
          title: 'Error',
          description: 'Unauthorized rollup authority',
          variant: 'destructive',
        })
        return null
      }

      // Create transaction
      const transaction = await program.methods
        .commit(new anchor.BN(newSupply), new anchor.BN(newReserves))
        .accounts({
          market,
          rollupAuthority,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [rollupAuthority])

      toast({
        title: 'Success',
        description: 'Rollup state committed successfully',
      })

      return {
        transactionSignature: signature,
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: `Failed to commit rollup: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    commitRollup,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
