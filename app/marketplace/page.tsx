import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"

const marketplaceTokens = [
  {
    symbol: "NEWS-001",
    headline: "AI Breakthrough Announcement",
    price: 12.45,
    change: 23.5,
    volume: 45600,
    holders: 234,
  },
  { symbol: "NEWS-002", headline: "Global Markets Rally", price: 8.92, change: -5.2, volume: 32100, holders: 189 },
  { symbol: "NEWS-003", headline: "Climate Summit Agreement", price: 15.67, change: 18.3, volume: 28900, holders: 312 },
  { symbol: "NEWS-004", headline: "Tech Merger Announced", price: 6.34, change: 45.7, volume: 56700, holders: 445 },
  { symbol: "NEWS-005", headline: "Sports Championship Win", price: 4.21, change: -12.3, volume: 19800, holders: 156 },
  { symbol: "NEWS-006", headline: "New Policy Reform", price: 9.87, change: 8.9, volume: 23400, holders: 267 },
]

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Marketplace</h1>
          <p className="text-lg text-muted-foreground">Browse and trade all headline tokens</p>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Token</th>
                  <th className="text-left p-4 font-semibold">Headline</th>
                  <th className="text-right p-4 font-semibold">Price</th>
                  <th className="text-right p-4 font-semibold">24h Change</th>
                  <th className="text-right p-4 font-semibold">Volume</th>
                  <th className="text-right p-4 font-semibold">Holders</th>
                  <th className="text-right p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {marketplaceTokens.map((token) => {
                  const isPriceUp = token.change > 0
                  return (
                    <tr key={token.symbol} className="border-t hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono">
                          {token.symbol}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-balance max-w-md">{token.headline}</p>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold">${token.price}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`flex items-center justify-end gap-1 font-medium ${isPriceUp ? "text-green-500" : "text-red-500"}`}
                        >
                          {isPriceUp ? (
                            <TrendingUpIcon className="w-4 h-4" />
                          ) : (
                            <TrendingDownIcon className="w-4 h-4" />
                          )}
                          {Math.abs(token.change)}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-muted-foreground">${(token.volume / 1000).toFixed(1)}K</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-muted-foreground">{token.holders}</span>
                      </td>
                      <td className="p-4 text-right">
                        <Button size="sm">Trade</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
