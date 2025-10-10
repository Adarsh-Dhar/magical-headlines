import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'
import { PROGRAM_ID } from './program-id'

export interface InitializeOracleResult {
  oracle: PublicKey
  transactionSignature: string
}

export function useInitializeOracle() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const initializeOracle = useCallback(async (): Promise<InitializeOracleResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      // Find oracle PDA
      const [oracle] = PublicKey.findProgramAddressSync(
        [Buffer.from('oracle')],
        PROGRAM_ID
      )

      // Check if oracle already exists
      try {
        await program.account.oracle.fetch(oracle)
        toast({
          title: 'Error',
          description: 'Oracle already initialized',
          variant: 'destructive',
        })
        return null
      } catch (error) {
        // Oracle doesn't exist, which is what we want
      }

      // Create transaction
      const transaction = await program.methods
        .initializeOracle()
        .accounts({
          oracle,
          admin: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: 'Oracle initialized successfully',
      })

      return {
        oracle,
        transactionSignature: signature,
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: `Failed to initialize oracle: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    initializeOracle,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
