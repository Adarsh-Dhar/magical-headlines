"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrophyIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"

interface Profile {
  id: string
  userAddress: string
  totalPnl: number
  totalVolume: number
  tradesCount: number
  wins: number
  trophies: number
  currentSeasonPnl: number
  lastTradeTimestamp?: string
  seasonStats: Array<{
    id: string
    pnl: number
    volume: number
    tradesCount: number
    wins: number
    rank?: number
    trophyTier?: string
    season: {
      seasonId: number
      startTimestamp: string
      endTimestamp: string
    }
  }>
}

export function UserProfile() {
  const { publicKey } = useWallet()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicKey) {
      setLoading(false)
      return
    }
    
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile?userAddress=${publicKey.toString()}`)
        const data = await response.json()
        
        if (data.profile) {
          setProfile(data.profile)
        } else {
          // Profile doesn't exist, create one
          // Profile not found, creating new profile
          const createResponse = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAddress: publicKey.toString() })
          })
          
          if (createResponse.ok) {
            const newProfile = await createResponse.json()
            setProfile(newProfile.profile)
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [publicKey])

  if (loading) {
    return null
  }

  if (!profile) {
    return (
      <Card className="p-6">
        {publicKey ? (
          <div className="text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Welcome to the competition! Your profile is being created...
            </p>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Connect your wallet to view your trading stats
          </p>
        )}
      </Card>
    )
  }

  // Removed the entire stats block. Just don't render anything if profile exists (can be replaced with other content if you wish or left blank).
  return null
}
