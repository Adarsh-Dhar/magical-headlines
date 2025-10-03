import { NewsFeed } from "@/components/news-feed"
import { TrendingStories } from "@/components/trending-stories"
import { MarketStats } from "@/components/market-stats"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Trade the News</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Where breaking news becomes tradable assets. Speculate on attention, profit from trends.
          </p>
        </div>

        <MarketStats />

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <NewsFeed />
          </div>
          <div>
            <TrendingStories />
          </div>
        </div>
      </div>
    </div>
  )
}
