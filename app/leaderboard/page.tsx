import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrophyIcon, TrendingUpIcon } from "lucide-react"

const leaderboardData = [
  { rank: 1, address: "0x742d...3f4a", roi: 234.5, volume: 125000, wins: 45, badge: "Diamond Trader" },
  { rank: 2, address: "0x8a3c...9b2e", roi: 189.3, volume: 98000, wins: 38, badge: "Gold Trader" },
  { rank: 3, address: "0x5f1d...7c8b", roi: 156.7, volume: 87000, wins: 34, badge: "Gold Trader" },
  { rank: 4, address: "0x2e9a...4d6f", roi: 142.1, volume: 76000, wins: 31, badge: "Silver Trader" },
  { rank: 5, address: "0x9c4b...1a5e", roi: 128.9, volume: 65000, wins: 28, badge: "Silver Trader" },
  { rank: 6, address: "0x6d7f...8e3c", roi: 115.4, volume: 54000, wins: 25, badge: "Bronze Trader" },
  { rank: 7, address: "0x3a8e...2f9d", roi: 98.7, volume: 48000, wins: 22, badge: "Bronze Trader" },
  { rank: 8, address: "0x1b5c...6a4f", roi: 87.2, volume: 42000, wins: 19, badge: "Rising Star" },
]

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Leaderboard</h1>
          <p className="text-lg text-muted-foreground">Top traders by return on investment</p>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Rank</th>
                  <th className="text-left p-4 font-semibold">Trader</th>
                  <th className="text-left p-4 font-semibold">Badge</th>
                  <th className="text-right p-4 font-semibold">ROI</th>
                  <th className="text-right p-4 font-semibold">Total Volume</th>
                  <th className="text-right p-4 font-semibold">Winning Trades</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardData.map((trader) => (
                  <tr key={trader.rank} className="border-t hover:bg-accent/50 transition-colors">
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
                      <span className="font-mono font-medium">{trader.address}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">{trader.badge}</Badge>
                    </td>
                    <td className="p-4 text-right">
                      <span className="flex items-center justify-end gap-1 text-green-500 font-bold">
                        <TrendingUpIcon className="w-4 h-4" />
                        {trader.roi}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">${(trader.volume / 1000).toFixed(0)}K</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-muted-foreground">{trader.wins}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
