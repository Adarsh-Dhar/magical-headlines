import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { 
  initializeSeasonOnChain, 
  awardTrophiesOnChain, 
  resetSeasonPnlForUsersOnChain 
} from "@/lib/admin-contract-service"

/**
 * Check if the request is from an authorized admin
 */
function isAuthorizedAdmin(request: NextRequest): boolean {
  const adminAddress = process.env.ORACLE_ADMIN_ADDRESS;
  if (!adminAddress) {
    console.warn('ORACLE_ADMIN_ADDRESS not configured');
    return false;
  }
  
  // For now, we'll allow all requests since this is called by cron jobs
  // In production, you might want to add additional authentication
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { action, userAddress } = await request.json()
    
    // Check admin authorization for manual actions
    if (action === 'award_trophy_manual' || action === 'reset_season_pnl_manual') {
      if (!isAuthorizedAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    
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
      const top10Users = currentSeason.seasonStats.slice(0, Math.min(10, currentSeason.seasonStats.length))
      
      // Update database with trophy awards
      for (let i = 0; i < top10Users.length; i++) {
        const stat = top10Users[i]
        const tier = trophyTiers[i]
        
        await prisma.seasonStats.update({
          where: { id: stat.id },
          data: {
            rank: i + 1,
            trophyTier: tier
          }
        })
        
        // Award trophy in database
        await prisma.profile.update({
          where: { id: stat.profileId },
          data: { trophies: { increment: 1 } }
        })
      }
      
      // Award trophies on-chain for top 10 users
      try {
        const userAddresses = top10Users.map(stat => stat.profile.userAddress)
        console.log(`Awarding trophies on-chain to ${userAddresses.length} users...`)
        const onChainSignatures = await awardTrophiesOnChain(userAddresses)
        console.log(`On-chain trophy awards completed. Signatures: ${onChainSignatures.length}`)
      } catch (error) {
        console.error('Error awarding trophies on-chain:', error)
        // Continue even if on-chain awards fail
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
      const endTime = new Date(now.getTime() + 60 * 60 * 1000)
      
      // Create season in database
      await prisma.season.create({
        data: {
          seasonId: newSeasonId,
          startTimestamp: now,
          endTimestamp: endTime,
          isActive: true
        }
      })
      
      // Initialize season on-chain
      try {
        console.log(`Initializing season ${newSeasonId} on-chain...`)
        const onChainSignature = await initializeSeasonOnChain(newSeasonId)
        console.log(`Season ${newSeasonId} initialized on-chain: ${onChainSignature}`)
      } catch (error) {
        console.error('Error initializing season on-chain:', error)
        // Continue even if on-chain initialization fails
      }
      
      // Reset all profiles' current season PnL in database
      await prisma.profile.updateMany({
        data: { currentSeasonPnl: 0 }
      })
      
      // Reset season PnL on-chain for active profiles
      try {
        const activeProfiles = await prisma.profile.findMany({
          where: { userAddress: { not: null } },
          select: { userAddress: true }
        })
        
        if (activeProfiles.length > 0) {
          const userAddresses = activeProfiles
            .map(profile => profile.userAddress)
            .filter((address): address is string => address !== null)
          
          console.log(`Resetting season PnL on-chain for ${userAddresses.length} users...`)
          const onChainSignatures = await resetSeasonPnlForUsersOnChain(userAddresses)
          console.log(`On-chain PnL resets completed. Signatures: ${onChainSignatures.length}`)
        }
      } catch (error) {
        console.error('Error resetting season PnL on-chain:', error)
        // Continue even if on-chain resets fail
      }
      
      return NextResponse.json({ success: true, seasonId: newSeasonId })
    }
    
    if (action === 'award_trophy_manual') {
      if (!userAddress) {
        return NextResponse.json({ error: "User address required" }, { status: 400 })
      }
      
      try {
        // Award trophy on-chain
        const signature = await awardTrophiesOnChain([userAddress])
        
        // Update database
        const profile = await prisma.profile.findFirst({
          where: { userAddress }
        })
        
        if (profile) {
          await prisma.profile.update({
            where: { id: profile.id },
            data: { trophies: { increment: 1 } }
          })
        }
        
        return NextResponse.json({ 
          success: true, 
          signature: signature[0],
          message: `Trophy awarded to ${userAddress}`
        })
      } catch (error) {
        console.error('Error awarding manual trophy:', error)
        return NextResponse.json({ 
          error: `Failed to award trophy: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 })
      }
    }
    
    if (action === 'reset_season_pnl_manual') {
      if (!userAddress) {
        return NextResponse.json({ error: "User address required" }, { status: 400 })
      }
      
      try {
        // Reset PnL on-chain
        const signature = await resetSeasonPnlForUsersOnChain([userAddress])
        
        // Update database
        await prisma.profile.updateMany({
          where: { userAddress },
          data: { currentSeasonPnl: 0 }
        })
        
        return NextResponse.json({ 
          success: true, 
          signature: signature[0],
          message: `Season PnL reset for ${userAddress}`
        })
      } catch (error) {
        console.error('Error resetting manual season PnL:', error)
        return NextResponse.json({ 
          error: `Failed to reset season PnL: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error managing season:", error)
    return NextResponse.json({ error: "Failed to manage season" }, { status: 500 })
  }
}
