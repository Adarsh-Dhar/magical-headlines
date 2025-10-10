import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'
import { PROGRAM_ID } from './program-id'

export interface BuyTokensParams {
  market: PublicKey
  mint: PublicKey
  amount: number
}

export interface BuyTokensResult {
  transactionSignature: string
  cost: number
  newSupply: number
}

export function useBuyTokens() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const buyTokens = useCallback(async (params: BuyTokensParams): Promise<BuyTokensResult | null> => {
    if (!publicKey || !signTransaction || !program) {
      toast({
        title: 'Error',
        description: 'Wallet not connected or program not loaded',
        variant: 'destructive',
      })
      return null
    }

    try {
      const { market, mint, amount } = params

      // Find buyer token account PDA
      const [buyerTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Get market account to calculate cost
      const marketAccount = await program.account.market.fetch(market)
      
      // Calculate cost using the bonding curve
      const cost = calculateBuyCost(
        marketAccount.currentSupply.toNumber(),
        amount,
        marketAccount.curveType
      )

      // Check if user has enough SOL
      const balance = await connection.getBalance(publicKey)
      if (balance < cost) {
        toast({
          title: 'Error',
          description: 'Insufficient SOL balance for purchase',
          variant: 'destructive',
        })
        return null
      }

      // Create transaction
      const transaction = await program.methods
        .buy(new anchor.BN(amount))
        .accounts({
          market,
          mint,
          buyer: publicKey,
          buyerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: `Successfully bought ${amount} tokens for ${cost / 1e9} SOL`,
      })

      return {
        transactionSignature: signature,
        cost,
        newSupply: marketAccount.currentSupply.toNumber() + amount,
      }
    } catch (error) {
      
      toast({
        title: 'Error',
        description: `Failed to buy tokens: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    buyTokens,
    isLoading: false,
  }
}

// Helper function to calculate buy cost based on bonding curve
function calculateBuyCost(currentSupply: number, amount: number, curveType: any): number {
  // This is a simplified calculation - you might want to implement the exact curve logic
  const basePrice = 1000000 // 0.001 SOL in lamports
  const slope = 100 // Price increase per token
  
  switch (curveType) {
    case 'linear': {
      const startPrice = basePrice + (currentSupply * slope)
      const endPrice = basePrice + ((currentSupply + amount) * slope)
      const averagePrice = (startPrice + endPrice) / 2
      return averagePrice * amount
    }
    case 'exponential': {
      // Simplified exponential calculation
      let totalCost = 0
      for (let i = 0; i < amount; i++) {
        const supply = currentSupply + i
        const price = basePrice * (10000 + supply) / 10000
        totalCost += price
      }
      return totalCost
    }
    case 'logarithmic': {
      // Simplified logarithmic calculation
      let totalCost = 0
      for (let i = 0; i < amount; i++) {
        const supply = currentSupply + i + 1
        const price = basePrice + (1000 * Math.log2(supply))
        totalCost += price
      }
      return totalCost
    }
    default:
      return basePrice * amount
  }
}

// Helper function to send and confirm transaction
async function sendAndConfirmTransaction(connection: any, transaction: any, signers: any[]) {
  return await connection.sendTransaction(transaction, signers)
}
