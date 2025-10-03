import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlameIcon, TrendingUpIcon } from "lucide-react"

const trendingData = [
  { rank: 1, headline: "AI Startup Raises $500M", change: 156.3, volume: 89000 },
  { rank: 2, headline: "New Energy Policy Announced", change: 98.7, volume: 67000 },
  { rank: 3, headline: "Tech Giant Acquires Competitor", change: 87.2, volume: 54000 },
  { rank: 4, headline: "Breakthrough in Quantum Computing", change: 76.5, volume: 43000 },
  { rank: 5, headline: "Major Sports Trade Shakes League", change: 65.1, volume: 38000 },
]

export function TrendingStories() {
  return (
    <Card className="p-6 sticky top-4">
      <div className="flex items-center gap-2 mb-6">
        <FlameIcon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Trending Now</h2>
      </div>

      <div className="space-y-4">
        {trendingData.map((item) => (
          <div
            key={item.rank}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{item.rank}</span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight mb-2 text-balance">{item.headline}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-500 font-medium">
                  <TrendingUpIcon className="w-3 h-3" />
                  {item.change}%
                </span>
                <span className="text-muted-foreground">Vol: ${(item.volume / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Badge variant="outline" className="w-full mt-4 justify-center py-2">
        View All Trending
      </Badge>
    </Card>
  )
}
