import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
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

  // Debug wallet state
  console.log('🔍 usePublishNews wallet state:', {
    wallet: !!wallet,
    publicKey: publicKey?.toString(),
    signTransaction: !!signTransaction,
    connected: wallet?.connected,
    connecting: wallet?.connecting
  })

  const publishNews = useCallback(async (params: PublishNewsParams): Promise<PublishNewsResult | null> => {
    console.log('🚀 Starting publishNews with params:', params)
    console.log('🔍 Wallet state:', { 
      publicKey: publicKey?.toString(), 
      hasSignTransaction: !!signTransaction, 
      hasProgram: !!program 
    })

    if (!publicKey || !signTransaction || !program) {
      console.error('❌ Missing required dependencies:', {
        publicKey: !!publicKey,
        signTransaction: !!signTransaction,
        program: !!program
      })
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { headline, arweaveLink, initialSupply } = params
      console.log('📝 Input validation:', { headline, arweaveLink, initialSupply })

      // Validate inputs
      if (headline.length > 200) {
        console.error('❌ Headline too long:', headline.length)
        toast({
          title: 'Error',
          description: 'Headline exceeds maximum length of 200 characters',
          variant: 'destructive',
        })
        return null
      }

      if (arweaveLink.length > 200) {
        console.error('❌ Arweave link too long:', arweaveLink.length)
        toast({
          title: 'Error',
          description: 'Arweave link exceeds maximum length of 200 characters',
          variant: 'destructive',
        })
        return null
      }

      // Find PDAs
      console.log('🔍 Finding PDAs...')
      const [newsAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('news'), publicKey.toBuffer()],
        PROGRAM_ID
      )
      console.log('📰 NewsAccount:', newsAccount.toString())

      const [mint] = PublicKey.findProgramAddressSync(
        [Buffer.from('mint'), newsAccount.toBuffer()],
        PROGRAM_ID
      )
      console.log('🪙 Mint:', mint.toString())

      const [metadata] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        METADATA_PROGRAM_ID
      )
      console.log('📄 Metadata:', metadata.toString())

      const [authorTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
      console.log('👤 AuthorTokenAccount:', authorTokenAccount.toString())

      // Create transaction
      console.log('🔨 Creating transaction...')
      // Note: PDAs are auto-resolved in Anchor 0.31.1, only pass non-PDA accounts
      const transaction = await program.methods
        .publishNews(headline, arweaveLink, new BN(initialSupply))
        .accounts({
          metadata,
          author: publicKey,
          metadataProgram: METADATA_PROGRAM_ID,
        })
        .transaction()
      
      console.log('✅ Transaction created successfully')

      // Sign and send transaction
      console.log('✍️ Signing and sending transaction...')
      console.log('🔍 Using wallet signTransaction method')
      console.log('🆕 NEW CODE VERSION - Using signTransaction instead of partialSign')
      const signature = await sendAndConfirmTransaction(connection, transaction, signTransaction, publicKey)
      console.log('✅ Transaction confirmed with signature:', signature)

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
      console.error('❌ Error publishing news:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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

// Helper function to send and confirm transaction - VERSION 2.0 WITH BLOCKHASH FIX
async function sendAndConfirmTransaction(connection: any, transaction: any, signTransaction: any, feePayer: any) {
  console.log('🔧 sendAndConfirmTransaction called with:', {
    connection: !!connection,
    transaction: !!transaction,
    signTransaction: !!signTransaction,
    feePayer: feePayer?.toString()
  })
  console.log('🆕 NEW VERSION - Using wallet signTransaction method, NOT partialSign')
  console.log('🚨 VERSION 2.0 - WITH RECENT BLOCKHASH AND FEE PAYER FIX')

  // Validate signTransaction function
  if (!signTransaction || typeof signTransaction !== 'function') {
    throw new Error('signTransaction function is required')
  }

  // Validate fee payer
  if (!feePayer) {
    throw new Error('Fee payer is required')
  }

  try {
    // Get recent blockhash and set it on the transaction
    console.log('🔗 Getting recent blockhash...')
    const { blockhash } = await connection.getLatestBlockhash('processed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = feePayer
    console.log('✅ Recent blockhash set:', blockhash)
    console.log('✅ Fee payer set:', feePayer.toString())
    
    // Sign the transaction using the wallet's signTransaction method
    console.log('✍️ Signing transaction with wallet...')
    const signedTransaction = await signTransaction(transaction)
    console.log('✅ Transaction signed successfully')
    
    // Send and confirm the transaction
    console.log('📤 Sending transaction...')
    const signature = await connection.sendTransaction(signedTransaction, {
      skipPreflight: false,
      preflightCommitment: 'processed',
    })
    console.log('📤 Transaction sent with signature:', signature)
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...')
    await connection.confirmTransaction(signature, 'processed')
    console.log('✅ Transaction confirmed!')
    
    return signature
  } catch (error) {
    console.error('❌ Error in sendAndConfirmTransaction:', error)
    throw error
  }
}
