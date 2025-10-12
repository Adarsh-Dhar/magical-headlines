"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrophyIcon, TrendingUpIcon, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface Trader {
  rank: number
  id: string
  address: string
  name: string
  roi: number
  volume: number
  wins: number
  badge: string
  totalTrades: number
  totalTokensOwned: number
  currentHoldingsValue: number
  storiesPublished: number
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/leaderboard?limit=50')
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data')
        }
        
        const data = await response.json()
        setTraders(data.traders || [])
      } catch (err) {
        console.error('Error fetching leaderboard:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboardData()
  }, [])

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`
    } else {
      return `$${volume.toFixed(0)}`
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Leaderboard</h1>
          <p className="text-lg text-muted-foreground">Top traders by return on investment</p>
        </div>

        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Loading leaderboard data...</span>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold mb-2">Error loading leaderboard</p>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        ) : traders.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">Data not found</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Rank</th>
                    <th className="text-left p-4 font-semibold">Trader</th>
                    <th className="text-left p-4 font-semibold">Badge</th>
                    <th className="text-right p-4 font-semibold">ROI</th>
                    <th className="text-right p-4 font-semibold">Tokens Owned</th>
                    <th className="text-right p-4 font-semibold">Stories</th>
                    <th className="text-right p-4 font-semibold">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {traders.map((trader) => (
                    <tr key={trader.id} className="border-t hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {trader.rank <= 3 && (
                            <TrophyIcon
                              className={`w-5 h-5 ${
                                trader.rank === 1
                                  ? "text-yellow-500"
                                  : trader.rank === 2
                                    ? "text-gray-400"
                                    : "text-amber-600"
                              }`}
                            />
                          )}
                          <span className="font-bold text-lg">{trader.rank}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-mono font-medium">{formatAddress(trader.address)}</div>
                          {trader.name !== "Anonymous" && (
                            <div className="text-sm text-muted-foreground">{trader.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{trader.badge}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`flex items-center justify-end gap-1 font-bold ${
                          trader.roi >= 0 ? "text-green-500" : "text-red-500"
                        }`}>
                          <TrendingUpIcon className={`w-4 h-4 ${trader.roi < 0 ? "rotate-180" : ""}`} />
                          {trader.roi > 0 ? "+" : ""}{trader.roi}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-right">
                          <div className="font-medium">{trader.totalTokensOwned.toFixed(2)}</div>
                          {trader.currentHoldingsValue > 0 && (
                            <div className="text-sm text-muted-foreground">
                              ${trader.currentHoldingsValue.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">{trader.storiesPublished}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium">{formatVolume(trader.volume)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
