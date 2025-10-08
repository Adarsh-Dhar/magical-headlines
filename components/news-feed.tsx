"use client"

import { NewsCard } from "./news-card"
import { CreateStoryDialog } from "./create-story-dialog"
import { useEffect, useState } from "react"

interface Story {
  id: string
  headline: string
  originalUrl: string
  submitter: {
    id: string
    name: string
    email: string
    walletAddress: string
  }
  tags: Array<{ name: string }>
  token: {
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
  }
  createdAt: string
}

interface StoriesResponse {
  stories: Story[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export function NewsFeed() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/story')
      if (!response.ok) {
        throw new Error('Failed to fetch stories')
      }
      const data: StoriesResponse = await response.json()
      setStories(data.stories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  const transformStoryForCard = (story: Story) => ({
    id: story.id,
    headline: story.headline,
    summary: "Click to read the full story", // Placeholder since we don't have aiSummary
    tags: story.tags.map(tag => tag.name),
    attentionScore: Math.floor(Math.random() * 20) + 80, // Placeholder until we implement real scoring
    tokenPrice: story.token.price,
    priceChange: story.token.priceChange24h,
    volume24h: story.token.volume24h,
    timestamp: formatTimestamp(story.createdAt)
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Stories</h2>
          <CreateStoryDialog onStoryCreated={fetchStories} />
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading stories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Stories</h2>
          <CreateStoryDialog onStoryCreated={fetchStories} />
        </div>
        <div className="text-center py-8">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Latest Stories</h2>
        <CreateStoryDialog onStoryCreated={fetchStories} />
      </div>

      <div className="space-y-4">
        {stories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No stories available yet.</p>
          </div>
        ) : (
          stories.map((story) => (
            <NewsCard key={story.id} story={transformStoryForCard(story)} />
          ))
        )}
      </div>
    </div>
  )
}
