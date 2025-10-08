import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface UpdateSummaryLinkParams {
  newsAccount: PublicKey
  oracleAuthority: PublicKey
  summaryLink: string
}

export interface UpdateSummaryLinkResult {
  transactionSignature: string
}

export function useUpdateSummaryLink() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const updateSummaryLink = useCallback(async (params: UpdateSummaryLinkParams): Promise<UpdateSummaryLinkResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { newsAccount, oracleAuthority, summaryLink } = params

      // Validate summary link length
      if (summaryLink.length > 200) {
        toast({
          title: 'Error',
          description: 'Summary link exceeds maximum length of 200 characters',
          variant: 'destructive',
        })
        return null
      }

      // Find whitelist PDA
      const [whitelist] = PublicKey.findProgramAddressSync(
        [Buffer.from('whitelist'), oracleAuthority.toBuffer()],
        PROGRAM_ID
      )

      // Check if oracle authority is whitelisted
      try {
        const whitelistAccount = await program.account.whitelistedAuthority.fetch(whitelist)
        if (!whitelistAccount.isActive) {
          toast({
            title: 'Error',
            description: 'Oracle authority is not whitelisted or inactive',
            variant: 'destructive',
          })
          return null
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Oracle authority not found in whitelist',
          variant: 'destructive',
        })
        return null
      }

      // Create transaction
      const transaction = await program.methods
        .updateSummaryLink(summaryLink)
        .accounts({
          newsAccount,
          whitelist,
          oracleAuthority,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [oracleAuthority])

      toast({
        title: 'Success',
        description: 'Summary link updated successfully',
      })

      return {
        transactionSignature: signature,
      }
    } catch (error) {
      console.error('Error updating summary link:', error)
      toast({
        title: 'Error',
        description: `Failed to update summary link: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    updateSummaryLink,
    isLoading: false,
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
