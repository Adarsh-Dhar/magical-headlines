import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, BarChart3Icon } from "lucide-react"

interface NewsCardProps {
  story: {
    id: string
    headline: string
    summary: string
    tags: string[]
    attentionScore: number
    tokenPrice: number
    priceChange: number
    volume24h: number
    timestamp: string
  }
}

export function NewsCard({ story }: NewsCardProps) {
  const isPriceUp = story.priceChange > 0

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold leading-tight text-balance">{story.headline}</h3>
            <p className="text-sm text-muted-foreground text-pretty">{story.summary}</p>
          </div>

          {/* Attention Score Badge */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-center gap-1 px-3 py-2 bg-primary/10 rounded-lg">
              <span className="text-xs font-medium text-muted-foreground">Score</span>
              <span className="text-2xl font-bold text-primary">{story.attentionScore}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {story.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Trading Info */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Token Price</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">${story.tokenPrice}</span>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${isPriceUp ? "text-green-500" : "text-red-500"}`}
                >
                  {isPriceUp ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                  {Math.abs(story.priceChange)}%
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
              <p className="text-lg font-bold">${(story.volume24h / 1000).toFixed(1)}K</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <BarChart3Icon className="w-4 h-4" />
              Chart
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              Trade
            </Button>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">{story.timestamp}</p>
      </div>
    </Card>
  )
}
