import { useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useAnchorProgram } from './use-anchor-program'
import { useToast } from './use-toast'

const PROGRAM_ID = new PublicKey('EmdcHGkyoK3ctqJchHbw3fBdTLiP6yXZQeNBWBhcfXzD')

export interface SellTokensParams {
  market: PublicKey
  mint: PublicKey
  amount: number
}

export interface SellTokensResult {
  transactionSignature: string
  refund: number
  newSupply: number
}

export function useSellTokens() {
  const wallet = useWallet()
  const { publicKey, signTransaction } = wallet || {}
  const { connection } = useConnection()
  const program = useAnchorProgram()
  const { toast } = useToast()

  const sellTokens = useCallback(async (params: SellTokensParams): Promise<SellTokensResult | null> => {
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

      // Find seller token account PDA
      const [sellerTokenAccount] = PublicKey.findProgramAddressSync(
        [publicKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
      )

      // Get market account to calculate refund
      const marketAccount = await program.account.market.fetch(market)
      
      // Check if market has enough supply
      if (marketAccount.currentSupply.toNumber() < amount) {
        toast({
          title: 'Error',
          description: 'Insufficient token supply in market',
          variant: 'destructive',
        })
        return null
      }

      // Calculate refund using the bonding curve
      const refund = calculateSellRefund(
        marketAccount.currentSupply.toNumber(),
        amount,
        marketAccount.curveType
      )

      // Check if market has enough SOL reserves
      if (marketAccount.solReserves.toNumber() < refund) {
        toast({
          title: 'Error',
          description: 'Insufficient SOL reserves in market',
          variant: 'destructive',
        })
        return null
      }

      // Create transaction
      const transaction = await program.methods
        .sell(new anchor.BN(amount))
        .accounts({
          market,
          mint,
          buyer: publicKey, // Note: using 'buyer' field for seller in the contract
          buyerTokenAccount: sellerTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .transaction()

      // Sign and send transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [publicKey])

      toast({
        title: 'Success',
        description: `Successfully sold ${amount} tokens for ${refund / 1e9} SOL`,
      })

      return {
        transactionSignature: signature,
        refund,
        newSupply: marketAccount.currentSupply.toNumber() - amount,
      }
    } catch (error) {
      console.error('Error selling tokens:', error)
      toast({
        title: 'Error',
        description: `Failed to sell tokens: ${error.message}`,
        variant: 'destructive',
      })
      return null
    }
  }, [publicKey, signTransaction, program, connection, toast])

  return {
    sellTokens,
    isLoading: false,
  }
}

// Helper function to calculate sell refund based on bonding curve
function calculateSellRefund(currentSupply: number, amount: number, curveType: any): number {
  // Selling is the reverse of buying, so we calculate the cost of the tokens being sold
  const newSupply = currentSupply - amount
  return calculateBuyCost(newSupply, amount, curveType)
}

// Helper function to calculate buy cost (reused from buy-tokens hook)
function calculateBuyCost(currentSupply: number, amount: number, curveType: any): number {
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
      let totalCost = 0
      for (let i = 0; i < amount; i++) {
        const supply = currentSupply + i
        const price = basePrice * (10000 + supply) / 10000
        totalCost += price
      }
      return totalCost
    }
    case 'logarithmic': {
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
