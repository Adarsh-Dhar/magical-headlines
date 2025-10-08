import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface AddAuthorityParams {
  oracle: PublicKey
  authority: PublicKey
}

export interface AddAuthorityResult {
  whitelist: PublicKey
  transactionSignature: string
}

export function useAddAuthority() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const addAuthority = useCallback(async (params: AddAuthorityParams): Promise<AddAuthorityResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { oracle, authority } = params

      // Find whitelist PDA
      const [whitelist] = PublicKey.findProgramAddressSync(
        [Buffer.from('whitelist'), authority.toBuffer()],
        PROGRAM_ID
      )

      // Check if oracle exists and user is admin
      const oracleAccount = await program.account.oracle.fetch(oracle)
      if (oracleAccount.admin.toString() !== publicKey.toString()) {
        toast({
          title: 'Error',
          description: 'Only oracle admin can add authorities',
          variant: 'destructive',
        })
        return null
      }

      // Check if authority is already whitelisted
      try {
        const existingWhitelist = await program.account.whitelistedAuthority.fetch(whitelist)
        if (existingWhitelist.isActive) {
          toast({
            title: 'Error',
            description: 'Authority is already whitelisted',
            variant: 'destructive',
          })
          return null
        }
      } catch (error) {
        // Authority not whitelisted, which is what we want
      }

      // Create transaction
      const transaction = await program.methods
        .addAuthority(authority)
        .accounts({
          whitelist,
          oracle,
          admin: publicKey,
          authority,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: 'Authority added to whitelist successfully',
      })

      return {
        whitelist,
        transactionSignature: signature,
      }
    } catch (error) {
      console.error('Error adding authority:', error)
      toast({
        title: 'Error',
        description: `Failed to add authority: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    addAuthority,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
