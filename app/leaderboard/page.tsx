"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TrophyIcon, TrendingUpIcon, Loader2, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface Trader {
  rank: number
  id: string
  address: string
  name: string
  roi: number
  volume: number
  wins: number
  totalTrades: number
  totalTokensOwned: number
  currentHoldingsValue: number
  storiesPublished: number
}

interface PnLTrader {
  rank: number
  address: string
  name: string
  totalPnl: number
  totalVolume: number
  tradesCount: number
  wins: number
  trophies: number
  currentSeasonPnl: number
}

interface SeasonTrader {
  rank: number
  address: string
  name: string
  seasonPnl: number
  seasonVolume: number
  seasonTrades: number
  seasonWins: number
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [pnlLeaderboard, setPnlLeaderboard] = useState<PnLTrader[]>([])
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonTrader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [activeTab, setActiveTab] = useState<'roi' | 'pnl' | 'season'>('roi')
  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/leaderboard?limit=50')
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data')
        }
        
        const data = await response.json()
        setTraders(data.traders || [])
        setPnlLeaderboard(data.pnlLeaderboard || [])
        setSeasonLeaderboard(data.seasonLeaderboard || [])
      } catch (err) {
        // console.error('Error fetching leaderboard data:', err)
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

  const getCurrentData = () => {
    switch (activeTab) {
      case 'pnl':
        return pnlLeaderboard
      case 'season':
        return seasonLeaderboard
      default:
        return traders
    }
  }

  const filteredTraders = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase()
    const currentData = getCurrentData()
    if (!query) return currentData
    return currentData.filter((t) => {
      const name = (t.name || "").toLowerCase()
      const address = (t.address || "").toLowerCase()
      return name.includes(query) || address.includes(query)
    })
  }, [traders, pnlLeaderboard, seasonLeaderboard, appliedSearch, activeTab])

  const handleApplySearch = () => {
    setAppliedSearch(searchInput)
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      handleApplySearch()
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Leaderboard</h1>
          <p className="text-lg text-muted-foreground">
            {activeTab === 'roi' && 'Top traders by return on investment'}
            {activeTab === 'pnl' && 'Top traders by total profit and loss'}
            {activeTab === 'season' && 'Current season leaderboard'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'roi' ? 'default' : 'outline'}
            onClick={() => setActiveTab('roi')}
          >
            ROI
          </Button>
          <Button 
            variant={activeTab === 'pnl' ? 'default' : 'outline'}
            onClick={() => setActiveTab('pnl')}
          >
            All-Time PnL
          </Button>
          <Button 
            variant={activeTab === 'season' ? 'default' : 'outline'}
            onClick={() => setActiveTab('season')}
          >
            Season
          </Button>
        </div>

        {/* Search - only render after loading completes to avoid hydration mismatches */}
        {!loading && !error && traders.length > 0 && (
          <div className="mb-6">
            <div className="flex w-full items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search author by name or address"
                  className="pl-9"
                />
              </div>
              <Button variant="secondary" onClick={handleApplySearch}>
                Search
              </Button>
            </div>
            {appliedSearch && (
              <div className="mt-2 text-sm text-muted-foreground">
                Showing results for <span className="font-medium">{appliedSearch}</span>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <Card className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin mr-2" />
              <span>Loading leaderboard data from blockchain...</span>
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center text-red-500">
              <p className="text-lg font-semibold mb-2">Error loading leaderboard</p>
              <p className="text-sm">{error}</p>
              {error.includes('wallet') && (
                <p className="text-xs mt-2 text-muted-foreground">
                  Please connect your wallet to view the leaderboard
                </p>
              )}
            </div>
          </Card>
        ) : traders.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-semibold mb-2">No trading data found</p>
              <p className="text-sm">Connect your wallet and start trading to see leaderboard data</p>
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
                    {activeTab === 'roi' && (
                      <>
                        <th className="text-right p-4 font-semibold">ROI</th>
                        <th className="text-right p-4 font-semibold">Tokens Owned</th>
                        <th className="text-right p-4 font-semibold">Stories</th>
                        <th className="text-right p-4 font-semibold">Volume</th>
                      </>
                    )}
                    {activeTab === 'pnl' && (
                      <>
                        <th className="text-right p-4 font-semibold">Total PnL</th>
                        <th className="text-right p-4 font-semibold">Season PnL</th>
                        <th className="text-right p-4 font-semibold">Trades</th>
                        <th className="text-right p-4 font-semibold">Trophies</th>
                      </>
                    )}
                    {activeTab === 'season' && (
                      <>
                        <th className="text-right p-4 font-semibold">Season PnL</th>
                        <th className="text-right p-4 font-semibold">Trades</th>
                        <th className="text-right p-4 font-semibold">Wins</th>
                        <th className="text-right p-4 font-semibold">Volume</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTraders.map((trader, index) => (
                    <tr key={trader.address || `trader-${index}`} className="border-t hover:bg-accent/50 transition-colors">
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
                      
                      {activeTab === 'roi' && 'roi' in trader && (
                        <>
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
                        </>
                      )}
                      
                      {activeTab === 'pnl' && 'totalPnl' in trader && (
                        <>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${
                              trader.totalPnl >= 0 ? "text-green-500" : "text-red-500"
                            }`}>
                              ${trader.totalPnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${
                              trader.currentSeasonPnl >= 0 ? "text-green-500" : "text-red-500"
                            }`}>
                              ${trader.currentSeasonPnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{trader.tradesCount}</span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TrophyIcon className="w-4 h-4 text-yellow-500" />
                              <span className="font-medium">{trader.trophies}</span>
                            </div>
                          </td>
                        </>
                      )}
                      
                      {activeTab === 'season' && 'seasonPnl' in trader && (
                        <>
                          <td className="p-4 text-right">
                            <span className={`font-bold ${
                              trader.seasonPnl >= 0 ? "text-green-500" : "text-red-500"
                            }`}>
                              ${trader.seasonPnl.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{trader.seasonTrades}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{trader.seasonWins}</span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-medium">{formatVolume(trader.seasonVolume)}</span>
                          </td>
                        </>
                      )}
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
