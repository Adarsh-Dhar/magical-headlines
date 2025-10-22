import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const currentSeason = await prisma.season.findFirst({
      where: { isActive: true },
      include: {
        seasonStats: {
          include: { profile: { include: { user: true } } },
          orderBy: { pnl: 'desc' },
          take: 50
        }
      }
    })
    
    // Count total profiles as participants
    const totalParticipants = await prisma.profile.count()
    
    const pastSeasons = await prisma.season.findMany({
      where: { isActive: false },
      include: {
        seasonStats: {
          where: { trophyTier: { not: null } },
          include: { profile: { include: { user: true } } },
          orderBy: { rank: 'asc' }
        }
      },
      orderBy: { seasonId: 'desc' },
      take: 10
    })
    
    // Update current season with actual participant count
    if (currentSeason) {
      currentSeason.totalParticipants = totalParticipants
    }
    
    return NextResponse.json({ currentSeason, pastSeasons })
  } catch (error) {
    console.error("Error fetching seasons:", error)
    return NextResponse.json({ error: "Failed to fetch seasons" }, { status: 500 })
  }
}
