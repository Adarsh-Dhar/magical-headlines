import { NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
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
        
        // Calculate volume - use total_volume if available, otherwise use sol_reserves
        // total_volume tracks actual trading volume, sol_reserves tracks SOL collected
        let marketVolume = 0
        
        if (marketData.account.totalVolume && Number(marketData.account.totalVolume) > 0) {
          // Use total_volume if it has been set by trading activity
          marketVolume = Number(marketData.account.totalVolume) / 1e9
        } else if (Number(marketData.account.solReserves) > 0) {
          // Fallback to sol_reserves if no trading volume recorded yet
          marketVolume = Number(marketData.account.solReserves) / 1e9
        } else {
          // If no trading activity, estimate volume based on current supply and price
          // This gives a rough estimate of potential volume
          const estimatedTradingVolume = currentPrice * (100 - currentSupply) // Assume 100 initial supply
          marketVolume = Math.max(0, estimatedTradingVolume * 0.1) // 10% of estimated volume
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
        name: `Wallet User ${stats.address.slice(0, 8)}`,
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
