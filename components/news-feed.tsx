import { NewsCard } from "./news-card"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

const mockNews = [
  {
    id: "1",
    headline: "Major Tech Company Announces Revolutionary AI Breakthrough",
    summary:
      "Leading technology firm unveils groundbreaking artificial intelligence system that could reshape the industry landscape.",
    tags: ["Technology", "AI", "Innovation"],
    attentionScore: 94,
    tokenPrice: 12.45,
    priceChange: 23.5,
    volume24h: 45600,
    timestamp: "2 hours ago",
  },
  {
    id: "2",
    headline: "Global Markets Rally on Positive Economic Data",
    summary:
      "Stock markets worldwide surge as new economic indicators exceed expectations, boosting investor confidence.",
    tags: ["Finance", "Markets", "Economy"],
    attentionScore: 87,
    tokenPrice: 8.92,
    priceChange: -5.2,
    volume24h: 32100,
    timestamp: "4 hours ago",
  },
  {
    id: "3",
    headline: "Climate Summit Reaches Historic Agreement",
    summary:
      "World leaders commit to ambitious new targets in landmark climate accord, marking a turning point in environmental policy.",
    tags: ["Climate", "Politics", "Environment"],
    attentionScore: 91,
    tokenPrice: 15.67,
    priceChange: 18.3,
    volume24h: 28900,
    timestamp: "6 hours ago",
  },
]

export function NewsFeed() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Latest Stories</h2>
        <Button className="gap-2">
          <PlusIcon className="w-4 h-4" />
          Post Story
        </Button>
      </div>

      <div className="space-y-4">
        {mockNews.map((story) => (
          <NewsCard key={story.id} story={story} />
        ))}
      </div>
    </div>
  )
}
