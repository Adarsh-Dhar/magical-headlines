import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface DelegateMarketParams {
  market: PublicKey
  rollupAuthority: PublicKey
}

export interface DelegateMarketResult {
  transactionSignature: string
}

export function useDelegateMarket() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const delegateMarket = useCallback(async (params: DelegateMarketParams): Promise<DelegateMarketResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { market, rollupAuthority } = params

      // Check if market is already delegated
      const marketAccount = await program.account.market.fetch(market)
      if (marketAccount.isDelegated) {
        toast({
          title: 'Error',
          description: 'Market is already delegated to a rollup',
          variant: 'destructive',
        })
        return null
      }

      // Create transaction
      const transaction = await program.methods
        .delegate()
        .accounts({
          market,
          rollupAuthority,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [rollupAuthority])

      toast({
        title: 'Success',
        description: 'Market delegated to rollup successfully',
      })

      return {
        transactionSignature: signature,
      }
    } catch (error) {
      console.error('Error delegating market:', error)
      toast({
        title: 'Error',
        description: `Failed to delegate market: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    delegateMarket,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
