import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'
import { PROGRAM_ID } from './program-id'

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

  // Debug wallet state

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
      
      // Note: PDAs are auto-resolved in Anchor 0.31.1, only pass non-PDA accounts
      const transaction = await program.methods
        .publishNews(headline, arweaveLink, new BN(initialSupply), new BN(0))
        .accounts({
          metadata,
          author: publicKey,
          metadataProgram: METADATA_PROGRAM_ID,
        })
        .transaction()
      
      

      // Sign and send transaction
      
      
      // Get recent blockhash and set it on the transaction
      
      const { blockhash } = await connection.getLatestBlockhash('processed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey
      
      
      // Sign the transaction using the wallet's signTransaction method
      
      const signedTransaction = await signTransaction(transaction)
      
      
      // Send and confirm the transaction
      
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'processed',
      })
      
      
      // Wait for confirmation
      
      await connection.confirmTransaction(signature, 'processed')
      

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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: 'Error',
        description: `Failed to publish news: ${errorMessage}`,
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

// Note: Using Solana's built-in sendAndConfirmTransaction instead of custom function
