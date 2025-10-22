import { prisma } from "../lib/prisma"

async function checkAndManageSeasons() {
  try {
    const currentSeason = await prisma.season.findFirst({
      where: { isActive: true }
    })
    
    if (!currentSeason) {
      console.log("No active season, starting new one")
      await startNewSeason()
      return
    }
    
    const now = new Date()
    const endTime = new Date(currentSeason.endTimestamp)
    
    if (now >= endTime) {
      console.log(`Season ${currentSeason.seasonId} has ended, processing...`)
      await endSeason()
      await startNewSeason()
    } else {
      const timeLeft = endTime.getTime() - now.getTime()
      console.log(`Season ${currentSeason.seasonId} has ${Math.floor(timeLeft / 1000 / 60)} minutes remaining`)
    }
  } catch (error) {
    console.error("Error managing seasons:", error)
  }
}

async function endSeason() {
  const response = await fetch('http://localhost:3000/api/seasons/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'end_season' })
  })
  
  if (!response.ok) {
    throw new Error('Failed to end season')
  }
  
  console.log("Season ended successfully")
}

async function startNewSeason() {
  const response = await fetch('http://localhost:3000/api/seasons/manage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start_season' })
  })
  
  if (!response.ok) {
    throw new Error('Failed to start season')
  }
  
  console.log("New season started successfully")
}

// Run immediately
checkAndManageSeasons().then(() => {
  console.log("Season management check complete")
  process.exit(0)
})
