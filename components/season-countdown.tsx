"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrophyIcon, ClockIcon } from "lucide-react"

interface Season {
  seasonId: number
  startTimestamp: string
  endTimestamp: string
  isActive: boolean
  totalParticipants: number
}

export function SeasonCountdown() {
  const [season, setSeason] = useState<Season | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSeason = async () => {
      try {
        const response = await fetch('/api/seasons')
        const data = await response.json()
        setSeason(data.currentSeason)
      } catch (error) {
        console.error('Error fetching season:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSeason()
    
    // Refresh season data every 30 seconds to update participant count
    const interval = setInterval(fetchSeason, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!season?.isActive) return

    const updateCountdown = () => {
      const now = new Date().getTime()
      const endTime = new Date(season.endTimestamp).getTime()
      const diff = endTime - now

      if (diff > 0) {
        const h = Math.floor(diff / (1000 * 60 * 60))
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const s = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
      } else {
        setTimeLeft("00:00:00")
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [season])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </Card>
    )
  }

  if (!season) return null

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Season {season.seasonId}</h3>
        </div>
        <Badge variant={season.isActive ? "default" : "secondary"}>
          {season.isActive ? "Active" : "Ended"}
        </Badge>
      </div>
      
      {season.isActive ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ClockIcon className="w-4 h-4" />
            <span className="text-sm text-muted-foreground">Time Remaining</span>
          </div>
          <div className="text-3xl font-mono font-bold text-primary">
            {timeLeft}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {season.totalParticipants} participants
          </p>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Season Ended</p>
          <p className="font-semibold">Check back for results!</p>
        </div>
      )}
    </Card>
  )
}
