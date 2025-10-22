import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'end_season') {
      const currentSeason = await prisma.season.findFirst({
        where: { isActive: true },
        include: {
          seasonStats: {
            include: { profile: true },
            orderBy: { pnl: 'desc' }
          }
        }
      })
      
      if (!currentSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 404 })
      }
      
      // Award trophies to top 10
      const trophyTiers = ['gold', 'silver', 'bronze', ...Array(7).fill('top10')]
      
      for (let i = 0; i < Math.min(10, currentSeason.seasonStats.length); i++) {
        const stat = currentSeason.seasonStats[i]
        const tier = trophyTiers[i]
        
        await prisma.seasonStats.update({
          where: { id: stat.id },
          data: {
            rank: i + 1,
            trophyTier: tier
          }
        })
        
        // Award trophy on-chain (top 10 only)
        await prisma.profile.update({
          where: { id: stat.profileId },
          data: { trophies: { increment: 1 } }
        })
      }
      
      await prisma.season.update({
        where: { id: currentSeason.id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ success: true, winner: currentSeason.seasonStats[0] })
    }
    
    if (action === 'start_season') {
      const lastSeason = await prisma.season.findFirst({
        orderBy: { seasonId: 'desc' }
      })
      
      const newSeasonId = (lastSeason?.seasonId || 0) + 1
      const now = new Date()
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      
      await prisma.season.create({
        data: {
          seasonId: newSeasonId,
          startTimestamp: now,
          endTimestamp: endTime,
          isActive: true
        }
      })
      
      // Reset all profiles' current season PnL
      await prisma.profile.updateMany({
        data: { currentSeasonPnl: 0 }
      })
      
      return NextResponse.json({ success: true, seasonId: newSeasonId })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing season:", error)
    return NextResponse.json({ error: "Failed to manage season" }, { status: 500 })
  }
}
