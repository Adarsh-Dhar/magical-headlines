import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function initializeFirstSeasonInDB() {
  try {
    // Check if there's already an active season
    const existingSeason = await prisma.season.findFirst({
      where: { isActive: true }
    })
    
    if (existingSeason) {
      console.log("Active season already exists:", existingSeason.seasonId)
      return
    }
    
    // Create the first season
    const now = new Date()
    const endTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    
    const season = await prisma.season.create({
      data: {
        seasonId: 1,
        startTimestamp: now,
        endTimestamp: endTime,
        isActive: true,
        totalParticipants: 0,
        totalVolume: 0
      }
    })
    
    console.log("Season 1 created in database:", season.id)
    console.log("Start time:", season.startTimestamp)
    console.log("End time:", season.endTimestamp)
    console.log("Active:", season.isActive)
    
  } catch (error) {
    console.error("Error creating season in database:", error)
  } finally {
    await prisma.$disconnect()
  }
}

initializeFirstSeasonInDB().then(() => {
  console.log("Season initialization complete")
  process.exit(0)
})
