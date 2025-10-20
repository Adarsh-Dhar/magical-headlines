import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/stats - aggregate app-wide stats
export async function GET() {
  try {
    // Active stories: total stories in DB
    const activeStoriesPromise = prisma.story.count()
    // Total 24h volume: sum of token.volume24h across all tokens
    const totalVolume24hPromise = prisma.token.aggregate({
      _sum: { volume24h: true },
    })

    // Total traders: distinct users who have traded OR hold tokens OR submitted stories
    // Use three queries and union in JS to keep it sqlite-compatible
    const traderIdsFromTradesPromise = prisma.trade.findMany({
      select: { traderId: true },
      distinct: ["traderId"],
    })

    const userIdsFromHoldingsPromise = prisma.holding.findMany({
      select: { userId: true },
      distinct: ["userId"],
    })

    const userIdsFromSubmittedStoriesPromise = prisma.story.findMany({
      select: { submitterId: true },
      distinct: ["submitterId"],
    })

    const [activeStories, totalVolumeAgg, traderIdsFromTrades, userIdsFromHoldings, userIdsFromSubmittedStories] = await Promise.all([
      activeStoriesPromise,
      totalVolume24hPromise,
      traderIdsFromTradesPromise,
      userIdsFromHoldingsPromise,
      userIdsFromSubmittedStoriesPromise,
    ])

    const distinctUserIds = new Set<string>()
    traderIdsFromTrades.forEach((t) => distinctUserIds.add(t.traderId))
    userIdsFromHoldings.forEach((h) => distinctUserIds.add(h.userId))
    userIdsFromSubmittedStories.forEach((s) => distinctUserIds.add(s.submitterId))

    const totalTraders = distinctUserIds.size
    const totalVolume24h = totalVolumeAgg._sum.volume24h || 0

    return NextResponse.json({ activeStories, totalTraders, totalVolume24h })
  } catch (error) {
    // console.error("Error computing stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


