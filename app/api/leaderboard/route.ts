import { NextRequest, NextResponse } from "next/server"
import { Connection, PublicKey, Keypair } from "@solana/web3.js"
import { Program, AnchorProvider } from "@coral-xyz/anchor"
import * as anchor from "@coral-xyz/anchor"
import { prisma } from "@/lib/prisma"
import NEWS_PLATFORM_IDL from '../../../app/news_platform.json'

// Constants
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getProgramId(): PublicKey {
  const id = process.env.NEXT_PUBLIC_PROGRAM_ID || "HEqdzibcMw3Sz43ZJbgQxGzgx7mCXtz6j85E7saJhbJ3";
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

// Helper function to calculate user PnL from trades using average cost basis method
async function calculateUserPnL(userAddress: string, trades: any[], currentPrices: Map<string, number>) {
  // Group trades by token
  const tokenTrades = new Map<string, any[]>()
  
  trades.forEach(trade => {
    if (!tokenTrades.has(trade.tokenId)) {
      tokenTrades.set(trade.tokenId, [])
    }
    tokenTrades.get(trade.tokenId)!.push(trade)
  })

  let totalPnL = 0
  let totalRealizedPnL = 0
  let totalUnrealizedPnL = 0
  let totalVolume = 0
  let totalTrades = trades.length
  let wins = 0

  // Calculate PnL for each token
  for (const [tokenId, tokenTradesList] of tokenTrades) {
    const buyTrades = tokenTradesList.filter(t => t.type === 'BUY')
    const sellTrades = tokenTradesList.filter(t => t.type === 'SELL')
    
    // Calculate average buy price (weighted average)
    const totalBought = buyTrades.reduce((sum, trade) => sum + trade.amount, 0)
    const totalSold = sellTrades.reduce((sum, trade) => sum + trade.amount, 0)
    
    if (totalBought === 0) continue // No buys, skip
    
    const totalBuyValue = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0)
    const avgBuyPrice = totalBuyValue / totalBought
    
    // Calculate realized PnL from sells
    const realizedPnL = sellTrades.reduce((sum, trade) => {
      const pnl = (trade.priceAtTrade - avgBuyPrice) * trade.amount
      if (pnl > 0) wins++
      return sum + pnl
    }, 0)
    
    // Calculate unrealized PnL from current holdings
    const currentHoldings = totalBought - totalSold
    const currentPrice = currentPrices.get(tokenId) || 0
    const unrealizedPnL = currentHoldings > 0 ? (currentPrice - avgBuyPrice) * currentHoldings : 0
    
    totalPnL += realizedPnL + unrealizedPnL
    totalRealizedPnL += realizedPnL
    totalUnrealizedPnL += unrealizedPnL
    
    // Calculate volume for this token
    const tokenVolume = tokenTradesList.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0)
    totalVolume += tokenVolume
  }

  return {
    totalPnl: totalPnL,
    totalRealizedPnL,
    totalUnrealizedPnL,
    totalVolume,
    tradesCount: totalTrades,
    wins,
    trophies: Math.floor(wins / 2) // Approximate trophies based on wins
  }
}

// Calculate PnL leaderboard from real trade data
async function calculatePnLLeaderboard(limit: number) {
  // Fetch all trades with token and user data
  const trades = await prisma.trade.findMany({
    include: {
      token: {
        select: {
          id: true,
          marketAccount: true,
          price: true
        }
      },
      trader: {
        select: {
          walletAddress: true,
          name: true
        }
      }
    }
  })

  // Get current prices for all tokens
  const currentPrices = new Map<string, number>()
  const tokens = await prisma.token.findMany({
    select: {
      id: true,
      marketAccount: true,
      price: true
    }
  })

  // Fetch current market prices
  for (const token of tokens) {
    let currentPrice = token.price
    if (token.marketAccount) {
      try {
        const marketData = await fetchMarketAccount(token.marketAccount)
        if (marketData?.currentPrice) {
          currentPrice = marketData.currentPrice
        }
      } catch (error) {
        // Use token.price as fallback
      }
    }
    currentPrices.set(token.id, currentPrice)
  }

  // Group trades by user
  const userTrades = new Map<string, any[]>()
  trades.forEach(trade => {
    const userAddress = trade.trader.walletAddress
    if (!userTrades.has(userAddress)) {
      userTrades.set(userAddress, [])
    }
    userTrades.get(userAddress)!.push(trade)
  })

  // Calculate PnL for each user
  const userPnLData = []
  for (const [userAddress, userTradesList] of userTrades) {
    const pnlData = await calculateUserPnL(userAddress, userTradesList, currentPrices)
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress },
      select: { name: true }
    })
    
    userPnLData.push({
      address: userAddress,
      name: user?.name || `Wallet User ${userAddress.slice(0, 8)}`,
      ...pnlData
    })
  }

  // Sort by total PnL descending and limit
  return userPnLData
    .sort((a, b) => b.totalPnl - a.totalPnl)
    .slice(0, limit)
}

// Calculate current season leaderboard from real trade data
async function calculateSeasonLeaderboard(limit: number) {
  // Get current active season
  const currentSeason = await prisma.season.findFirst({
    where: { isActive: true },
    orderBy: { seasonId: 'desc' }
  })

  if (!currentSeason) {
    return []
  }

  // Fetch trades within current season
  const seasonTrades = await prisma.trade.findMany({
    where: {
      timestamp: {
        gte: currentSeason.startTimestamp,
        lte: currentSeason.endTimestamp
      }
    },
    include: {
      token: {
        select: {
          id: true,
          marketAccount: true,
          price: true
        }
      },
      trader: {
        select: {
          walletAddress: true,
          name: true
        }
      }
    }
  })

  // Get current prices for all tokens
  const currentPrices = new Map<string, number>()
  const tokens = await prisma.token.findMany({
    select: {
      id: true,
      marketAccount: true,
      price: true
    }
  })

  // Fetch current market prices
  for (const token of tokens) {
    let currentPrice = token.price
    if (token.marketAccount) {
      try {
        const marketData = await fetchMarketAccount(token.marketAccount)
        if (marketData?.currentPrice) {
          currentPrice = marketData.currentPrice
        }
      } catch (error) {
        // Use token.price as fallback
      }
    }
    currentPrices.set(token.id, currentPrice)
  }

  // Group trades by user
  const userTrades = new Map<string, any[]>()
  seasonTrades.forEach(trade => {
    const userAddress = trade.trader.walletAddress
    if (!userTrades.has(userAddress)) {
      userTrades.set(userAddress, [])
    }
    userTrades.get(userAddress)!.push(trade)
  })

  // Calculate season PnL for each user
  const seasonPnLData = []
  for (const [userAddress, userTradesList] of userTrades) {
    const pnlData = await calculateUserPnL(userAddress, userTradesList, currentPrices)
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress },
      select: { name: true }
    })
    
    seasonPnLData.push({
      address: userAddress,
      name: user?.name || `Wallet User ${userAddress.slice(0, 8)}`,
      seasonPnl: pnlData.totalPnl,
      seasonVolume: pnlData.totalVolume,
      seasonTrades: pnlData.tradesCount,
      seasonWins: pnlData.wins
    })
  }

  // Sort by season PnL descending and limit
  return seasonPnLData
    .sort((a, b) => b.seasonPnl - a.seasonPnl)
    .slice(0, limit)
}

// Helper function to fetch market account data
async function fetchMarketAccount(marketAccount: string) {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )
    
    const programId = getProgramId()
    const readOnlyWallet = {
      publicKey: Keypair.generate().publicKey,
      signAllTransactions: async (txs: any[]) => txs,
      signTransaction: async (tx: any) => tx,
    } as any
    const provider = new AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" })
    const program = new Program(NEWS_PLATFORM_IDL as any, provider)
    
    const marketData = await (program.account as any).market.fetch(new PublicKey(marketAccount))
    
    const solReserves = Number(marketData.solReserves) / 1e9
    const currentSupply = Number(marketData.currentSupply)
    
    let currentPrice = 0.001 // Default price
    if (currentSupply > 0) {
      const basePrice = 0.001 // 0.001 SOL base price
      const multiplier = Math.min(10000 + currentSupply, 20000) / 10000
      currentPrice = basePrice * multiplier
    }
    
    return {
      currentPrice,
      solReserves,
      currentSupply
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const seasonIdParam = searchParams.get("seasonId")
    const minimal = searchParams.get("minimal") === "true"

    // Create connection to Solana
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    )

    // Create program instance with a minimal read-only wallet to satisfy Anchor
    const programId = getProgramId()
    const readOnlyWallet = {
      publicKey: Keypair.generate().publicKey,
      signAllTransactions: async (txs: any[]) => txs,
      signTransaction: async (tx: any) => tx,
    } as any
    const provider = new AnchorProvider(connection, readOnlyWallet, { commitment: "confirmed" })
    const program = new Program(NEWS_PLATFORM_IDL as any, provider)

    // Safely fetch on-chain accounts; fall back to empty on failure
    let newsAccounts: any[] = []
    let marketAccounts: any[] = []
    try {
      newsAccounts = await (program.account as any).newsAccount.all()
    } catch {}
    try {
      marketAccounts = await (program.account as any).market.all()
    } catch {}

    // Create a map of news account to market data
    const marketMap = new Map()
    marketAccounts.forEach(market => {
      marketMap.set(market.account.newsAccount.toString(), market)
    })

    // Fetch all users from database to get their names (tolerate empty DB)
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

    // Fetch all trades to calculate real volume (unfiltered, for ROI tab legacy section)
    const trades = await prisma.trade.findMany({
      include: {
        token: {
          include: { story: true }
        },
        trader: {
          select: { walletAddress: true, name: true }
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

    // If minimal season-aware leaderboard is requested, compute and return compact payload
    if (minimal) {
      // If a specific seasonId is provided, filter trades by that season's time window
      let filteredTrades = trades
      if (seasonIdParam) {
        const targetSeason = await prisma.season.findFirst({
          where: { seasonId: Number(seasonIdParam) }
        })
        if (targetSeason) {
          filteredTrades = await prisma.trade.findMany({
            where: {
              timestamp: {
                gte: targetSeason.startTimestamp,
                lte: targetSeason.endTimestamp
              }
            },
            include: {
              token: { select: { id: true, marketAccount: true, price: true } },
              trader: { select: { walletAddress: true, name: true } }
            }
          })
        } else {
          filteredTrades = []
        }
      }

      // Build current prices map for ROI/PnL calc
      const currentPrices = new Map<string, number>()
      const tokens = await prisma.token.findMany({
        select: { id: true, marketAccount: true, price: true }
      })
      for (const token of tokens) {
        let currentPrice = token.price
        if (token.marketAccount) {
          try {
            const marketData = await fetchMarketAccount(token.marketAccount)
            if (marketData?.currentPrice) currentPrice = marketData.currentPrice
          } catch {}
        }
        currentPrices.set(token.id, currentPrice)
      }

      // Group trades by user
      const userTrades = new Map<string, any[]>()
      filteredTrades.forEach(trade => {
        const userAddress = (trade as any).trader.walletAddress
        if (!userTrades.has(userAddress)) userTrades.set(userAddress, [])
        userTrades.get(userAddress)!.push(trade)
      })

      // Calculate PnL for each user
      const userPnLData: { address: string; name: string; totalPnl: number; totalVolume: number }[] = []
      for (const [userAddress, userTradesList] of userTrades) {
        const pnlData = await calculateUserPnL(userAddress, userTradesList as any[], currentPrices)
        const user = await prisma.user.findUnique({ where: { walletAddress: userAddress }, select: { name: true } })
        userPnLData.push({
          address: userAddress,
          name: user?.name || `Wallet User ${userAddress.slice(0, 8)}`,
          totalPnl: pnlData.totalPnl,
          totalVolume: pnlData.totalVolume
        })
      }

      const rows = userPnLData
        .sort((a, b) => b.totalPnl - a.totalPnl)
        .slice(0, limit)
        .map((u, idx) => ({
          rank: idx + 1,
          address: u.address,
          name: u.name,
          totalPnl: Math.round(u.totalPnl * 100) / 100,
          roi: u.totalVolume > 0 ? Math.round(((u.totalPnl) / (u.totalVolume)) * 1000) / 10 : 0
        }))

      return NextResponse.json({ rows })
    }

    // Calculate PnL leaderboard from real trade data
    const pnlLeaderboard = await calculatePnLLeaderboard(limit)

    // Calculate current season leaderboard from real trade data
    const seasonLeaderboard = await calculateSeasonLeaderboard(limit)

    return NextResponse.json({
      traders: activeTraders,
      pnlLeaderboard: pnlLeaderboard.map((trader, index) => ({
        rank: index + 1,
        address: trader.address,
        name: trader.name,
        totalPnl: trader.totalPnl,
        totalVolume: trader.totalVolume,
        tradesCount: trader.tradesCount,
        wins: trader.wins,
        trophies: trader.trophies,
        currentSeasonPnl: trader.totalPnl
      })),
      seasonLeaderboard: seasonLeaderboard.map((trader, index) => ({
        rank: index + 1,
        address: trader.address,
        name: trader.name,
        seasonPnl: trader.seasonPnl,
        seasonVolume: trader.seasonVolume,
        seasonTrades: trader.seasonTrades,
        seasonWins: trader.seasonWins
      })),
      total: activeTraders.length
    })

  } catch (error) {
    // console.error("Error fetching leaderboard data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
