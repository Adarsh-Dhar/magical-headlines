import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")

    // Get all users with their trades and holdings
    const users = await prisma.user.findMany({
      include: {
        trades: {
          include: {
            token: {
              include: {
                story: true
              }
            }
          }
        },
        holdings: {
          include: {
            token: {
              include: {
                story: true
              }
            }
          }
        },
        storiesSubmitted: {
          include: {
            token: true
          }
        }
      }
    })

    // Calculate statistics for each user
    const traderStats = users.map(user => {
      const trades = user.trades
      const holdings = user.holdings
      const storiesSubmitted = user.storiesSubmitted
      
      // Calculate total volume (sum of all trade amounts * price)
      const totalVolume = trades.reduce((sum, trade) => {
        return sum + (trade.amount * trade.priceAtTrade)
      }, 0)

      // Calculate current token holdings value
      const currentHoldingsValue = holdings.reduce((sum, holding) => {
        // Use current token price if available, otherwise use 0
        const currentPrice = holding.token.price || 0
        return sum + (holding.amount * currentPrice)
      }, 0)

      // Calculate total tokens owned (including from story submissions)
      const totalTokensOwned = holdings.reduce((sum, holding) => sum + holding.amount, 0)
      
      // Calculate stories published
      const storiesPublished = storiesSubmitted.length

      // Calculate winning trades (trades where user made profit)
      const buyTrades = trades.filter(trade => trade.type === 'BUY')
      const sellTrades = trades.filter(trade => trade.type === 'SELL')
      
      // Simple win calculation: if user has more sell trades than buy trades, they're winning
      const wins = Math.max(0, sellTrades.length - buyTrades.length)

      // Calculate ROI (Return on Investment)
      let roi = 0
      if (buyTrades.length > 0) {
        const totalInvested = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0)
        const totalReturned = sellTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0)
        if (totalInvested > 0) {
          roi = ((totalReturned - totalInvested) / totalInvested) * 100
        }
      } else if (storiesPublished > 0) {
        // For story authors who haven't traded, give them a base ROI based on story performance
        // This is a simplified approach - in reality, you'd track actual token value appreciation
        roi = storiesPublished * 10 // 10% per story published
      }

      // Assign badge based on performance and activity
      let badge = "Rising Star"
      if (roi >= 200 || storiesPublished >= 5) badge = "Diamond Trader"
      else if (roi >= 150 || storiesPublished >= 3) badge = "Gold Trader"
      else if (roi >= 100 || storiesPublished >= 2) badge = "Silver Trader"
      else if (roi >= 50 || storiesPublished >= 1) badge = "Bronze Trader"

      return {
        id: user.id,
        address: user.walletAddress,
        name: user.name || "Anonymous",
        roi: Math.round(roi * 10) / 10, // Round to 1 decimal place
        volume: Math.round(totalVolume),
        wins: wins,
        badge: badge,
        totalTrades: trades.length,
        totalTokensOwned: Math.round(totalTokensOwned * 100) / 100, // Round to 2 decimal places
        currentHoldingsValue: Math.round(currentHoldingsValue * 100) / 100,
        storiesPublished: storiesPublished
      }
    })

    // Filter out users with no token ownership and sort by ROI
    const activeTraders = traderStats
      .filter(trader => trader.totalTrades > 0 || trader.totalTokensOwned > 0 || trader.storiesPublished > 0)
      .sort((a, b) => {
        // Primary sort: ROI
        if (b.roi !== a.roi) return b.roi - a.roi
        // Secondary sort: Total tokens owned
        if (b.totalTokensOwned !== a.totalTokensOwned) return b.totalTokensOwned - a.totalTokensOwned
        // Tertiary sort: Stories published
        return b.storiesPublished - a.storiesPublished
      })
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
