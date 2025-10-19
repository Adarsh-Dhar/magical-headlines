import { NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
import { prisma } from "@/lib/prisma"
import NEWS_PLATFORM_IDL from '../../../contract/target/idl/news_platform.json'

// Constants
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID || "9pRU9UFJctN6H1b1hY3GCkVwK5b3ESC7ZqBDZ8thooN4";
  return new PublicKey(id);
}

// PDA helpers
const findNewsPda = (author: PublicKey, nonce: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("news"), author.toBuffer(), new anchor.BN(nonce).toArrayLike(Buffer, "le", 8)],
    getProgramId()
  )[0];

const findMintPda = (newsAccount: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), newsAccount.toBuffer()],
    getProgramId()
  )[0];

const findMarketPda = (newsAccount: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("market"), newsAccount.toBuffer()],
    getProgramId()
  )[0];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // Create connection to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    // Create program instance
    const programId = getProgramId()
    const program = new Program(NEWS_PLATFORM_IDL as any, new AnchorProvider(
      connection,
      {} as any, // We don't need a wallet for read-only operations
      { commitment: "confirmed" }
    ))

    // Get all news accounts
    const newsAccounts = await program.account.newsAccount.all()
    
    // Get all market accounts
    const marketAccounts = await program.account.market.all()

    // Create a map of news account to market data
    const marketMap = new Map()
    marketAccounts.forEach(market => {
      marketMap.set(market.account.newsAccount.toString(), market)
    })

    // Fetch all users from database to get their names
    const users = await prisma.user.findMany({
      select: {
        walletAddress: true,
        name: true
      }
    })
    
    // Create a map of wallet addresses to user names
    const userMap = new Map<string, string>()
    users.forEach(user => {
      userMap.set(user.walletAddress, user.name || `Wallet User ${user.walletAddress.slice(0, 8)}`)
    })

    // Fetch all trades to calculate real volume
    const trades = await prisma.trade.findMany({
          include: {
            token: {
              include: {
                story: true
              }
            }
          }
    })

    // Create a map of token IDs to their corresponding news account addresses
    const tokenToNewsAccountMap = new Map<string, string>()
    for (const newsAccount of newsAccounts) {
      // Find the corresponding token for this news account
      const token = trades.find(t => t.token.story.id === newsAccount.publicKey.toString())
      if (token) {
        tokenToNewsAccountMap.set(token.tokenId, newsAccount.publicKey.toString())
      }
    }

    // Group by author and calculate statistics
    const authorStats = new Map()

    for (const newsAccount of newsAccounts) {
      const author = newsAccount.account.authority.toString()
      const marketData = marketMap.get(newsAccount.publicKey.toString())
      
      if (!authorStats.has(author)) {
        authorStats.set(author, {
          address: author,
          totalValue: 0,
          totalTokens: 0,
          storiesCount: 0,
          totalVolume: 0,
          tokens: []
        })
      }

      const stats = authorStats.get(author)
      
      // Calculate current price and value
      let currentPrice = 0.001 // Default price
      let totalValue = 0
      
      if (marketData) {
        const solReserves = Number(marketData.account.solReserves) / 1e9 // Convert lamports to SOL
        const currentSupply = Number(marketData.account.currentSupply)
        
        if (currentSupply > 0) {
          // Use the same pricing formula as the contract
          const basePrice = 0.001 // 0.001 SOL base price
          const multiplier = Math.min(10000 + currentSupply, 20000) / 10000
          currentPrice = basePrice * multiplier
        }
        
        totalValue = currentPrice * currentSupply
        
        // Calculate volume from database trades first, then fallback to blockchain data
        let marketVolume = 0
        
        // Find trades for this news account
        const newsAccountAddress = newsAccount.publicKey.toString()
        const relatedTrades = trades.filter(trade => {
          // Check if this trade's token corresponds to this news account
          return tokenToNewsAccountMap.get(trade.tokenId) === newsAccountAddress
        })
        
        if (relatedTrades.length > 0) {
          // Use real trade data from database
          marketVolume = relatedTrades.reduce((sum, trade) => {
            return sum + (trade.amount * trade.priceAtTrade)
          }, 0)
        } else if (marketData.account.totalVolume && Number(marketData.account.totalVolume) > 0) {
          // Fallback to blockchain total_volume
          marketVolume = Number(marketData.account.totalVolume) / 1e9
        } else if (Number(marketData.account.solReserves) > 0) {
          // Fallback to sol_reserves
          marketVolume = Number(marketData.account.solReserves) / 1e9
        }
        
        stats.totalVolume += marketVolume
      }

      stats.tokens.push({
        newsAccount: newsAccount.publicKey.toString(),
        headline: newsAccount.account.headline,
        currentPrice,
        totalValue,
        supply: marketData ? Number(marketData.account.currentSupply) : 0
      })
      
      stats.totalValue += totalValue
      stats.totalTokens += marketData ? Number(marketData.account.currentSupply) : 0
      stats.storiesCount += 1
    }

    // Convert to trader format
    const tradersData = Array.from(authorStats.values()).map((stats, index) => {
      // Calculate ROI based on current value vs initial investment
      const avgPrice = stats.totalTokens > 0 ? stats.totalValue / stats.totalTokens : 0
      const roi = avgPrice > 0.001 ? ((avgPrice - 0.001) / 0.001) * 100 : 0
      

      return {
        id: stats.address,
        address: stats.address,
        name: userMap.get(stats.address) || `Wallet User ${stats.address.slice(0, 8)}`,
        roi: Math.round(roi * 10) / 10,
        volume: Math.round(stats.totalVolume * 100) / 100,
        wins: Math.floor(stats.storiesCount / 2),
        totalTrades: stats.tokens.length,
        totalTokensOwned: Math.round(stats.totalTokens * 100) / 100,
        currentHoldingsValue: Math.round(stats.totalValue * 100) / 100,
        storiesPublished: stats.storiesCount
      }
    })

    // Sort by ROI, then by total value
    tradersData.sort((a, b) => {
        if (b.roi !== a.roi) return b.roi - a.roi
      return b.currentHoldingsValue - a.currentHoldingsValue
      })

    // Update ranks and limit results
    const activeTraders = tradersData
      .slice(0, limit)
      .map((trader, index) => ({
        ...trader,
        rank: index + 1
      }))

    return NextResponse.json({
      traders: activeTraders,
      total: activeTraders.length
    })

  } catch (error) {
    console.error("Error fetching leaderboard data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
