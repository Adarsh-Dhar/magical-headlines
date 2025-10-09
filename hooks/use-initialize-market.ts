import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export type CurveType = 'linear' | 'exponential' | 'logarithmic'

export interface InitializeMarketParams {
  newsAccount: PublicKey
  mint: PublicKey
  curveType: CurveType
}

export interface InitializeMarketResult {
  market: PublicKey
  transactionSignature: string
}

export function useInitializeMarket() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const initializeMarket = useCallback(async (params: InitializeMarketParams): Promise<InitializeMarketResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { newsAccount, mint, curveType } = params

      // Find market PDA
      const [market] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), newsAccount.toBuffer()],
        PROGRAM_ID
      )

      // Convert curve type to the format expected by the contract
      const curveTypeEnum = {
        linear: { linear: {} },
        exponential: { exponential: {} },
        logarithmic: { logarithmic: {} },
      }[curveType]

      // Create transaction
      const transaction = await program.methods
        .initializeMarket(curveTypeEnum)
        .accounts({
          market,
          newsAccount,
          mint,
          payer: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: `Market initialized with ${curveType} bonding curve`,
      })

      return {
        market,
        transactionSignature: signature,
      }
    } catch (error) {
      console.error('Error initializing market:', error)
      toast({
        title: 'Error',
        description: `Failed to initialize market: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    initializeMarket,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
