import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

export interface PublishNewsParams {
  headline: string
  arweaveLink: string
  initialSupply: number
}

export interface PublishNewsResult {
  newsAccount: PublicKey
  mint: PublicKey
  metadata: PublicKey
  transactionSignature: string
}

export function usePublishNews() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const publishNews = useCallback(async (params: PublishNewsParams): Promise<PublishNewsResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { headline, arweaveLink, initialSupply } = params

      // Validate inputs
      if (headline.length > 200) {
        toast({
          title: 'Error',
          description: 'Headline exceeds maximum length of 200 characters',
          variant: 'destructive',
        })
        return null
      }

      if (arweaveLink.length > 200) {
        toast({
          title: 'Error',
          description: 'Arweave link exceeds maximum length of 200 characters',
          variant: 'destructive',
        })
        return null
      }

      // Find PDAs
      const [newsAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('news'), publicKey.toBuffer()],
        PROGRAM_ID
      )

      const [mint] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint'), newsAccount.toBuffer()],
        PROGRAM_ID
      )

      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )

      const [authorTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Create transaction
      const transaction = await program.methods
        .publishNews(headline, arweaveLink, new anchor.BN(initialSupply))
        .accounts({
          newsAccount,
          mint,
          metadata,
          author: publicKey,
          authorTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          metadataProgram: METADATA_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: 'News story published successfully!',
      })

      return {
        newsAccount,
        mint,
        metadata,
        transactionSignature: signature,
      }
    } catch (error) {
      console.error('Error publishing news:', error)
      toast({
        title: 'Error',
        description: `Failed to publish news: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    publishNews,
    isLoading: false, // You can add loading state management here
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  // This is a simplified version - you might want to use a more robust implementation
  return await connection.sendTransaction(transaction, signers)
}
