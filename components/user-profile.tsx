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
          console.log('Profile not found, creating new profile...')
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
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
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

  const winRate = profile.tradesCount > 0 ? (profile.wins / profile.tradesCount) * 100 : 0
  const recentSeason = profile.seasonStats[0]

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Your Stats</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total PnL</span>
          <div className="flex items-center gap-1">
            {profile.totalPnl >= 0 ? (
              <TrendingUpIcon className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDownIcon className="w-4 h-4 text-red-600" />
            )}
            <span className={`font-semibold ${profile.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profile.totalPnl?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Season PnL</span>
          <div className="flex items-center gap-1">
            {profile.currentSeasonPnl >= 0 ? (
              <TrendingUpIcon className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDownIcon className="w-4 h-4 text-red-600" />
            )}
            <span className={`font-semibold ${profile.currentSeasonPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${profile.currentSeasonPnl?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Win Rate</span>
          <span className="font-semibold">
            {winRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Trades</span>
          <span className="font-semibold">{profile.tradesCount || 0}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trophies</span>
          <div className="flex items-center gap-1">
            <TrophyIcon className="w-4 h-4 text-yellow-500" />
            <span className="font-semibold">{profile.trophies || 0}</span>
          </div>
        </div>

        {recentSeason && (
          <div className="pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Season Rank</span>
              <span className="font-semibold">
                {recentSeason.rank ? `#${recentSeason.rank}` : 'N/A'}
              </span>
            </div>
            {recentSeason.trophyTier && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Trophy</span>
                <Badge variant="outline" className="text-xs">
                  {recentSeason.trophyTier}
                </Badge>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
