"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Story {
  id: string
  headline: string
  content: string
  originalUrl: string
  arweaveUrl: string
  arweaveId: string
  onchainSignature: string
  onMarket: boolean
  createdAt: string
  updatedAt: string
  submitter: {
    id: string
    name: string | null
    email: string | null
    walletAddress: string
  }
  tags: Array<{
    id: string
    name: string
  }>
  token: {
    id: string
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
  } | null
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

export default function MyStoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  })

  useEffect(() => {
    fetchAllStories()
  }, [])

  const fetchAllStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/story/marketplace/me')
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, that's okay
          setStories([])
          return
        }
        throw new Error('Failed to fetch user stories')
      }
      const data: StoriesResponse = await response.json()
      setStories(data.stories)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching user stories:', err)
      setStories([])
    } finally {
      setLoading(false)
    }
  }

  const addToMarket = async (storyId: string) => {
    try {
      const response = await fetch(`/api/story/marketplace/${storyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onMarket: true })
      })
      
      if (!response.ok) {
        throw new Error('Failed to add story to market')
      }
      
      // Refresh the stories list
      await fetchAllStories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">My Stories</h1>
            <p className="text-lg text-muted-foreground">Manage your stories that are not yet on the market</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading stories...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">My Stories</h1>
            <p className="text-lg text-muted-foreground">Manage your stories that are not yet on the market</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={fetchAllStories}>Try Again</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-3">My Stories</h1>
              <p className="text-lg text-muted-foreground">Manage your stories that are not yet on the market</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAllStories}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/">
                <Button className="flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Create Story
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {stories.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <PlusIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No stories to manage</h3>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                You don't have any stories that are not on the market yet. Create a new story first, 
                then you can manage it here before adding it to the marketplace.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button size="lg" className="flex items-center gap-2 w-full sm:w-auto">
                    <PlusIcon className="w-4 h-4" />
                    Create First Story
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={fetchAllStories} className="w-full sm:w-auto">
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {stories.length} of {pagination.totalCount} stories
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => {
                const token = story.token
                const isPriceUp = token ? token.priceChange24h > 0 : false
                const priceChange = token ? Math.abs(token.priceChange24h) : 0
                const price = token ? token.price : 0
                const volume = token ? token.volume24h : 0
                const marketCap = token ? token.marketCap : 0
                
                return (
                  <Card key={story.id} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
                            {story.headline}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {story.content}
                          </p>
                        </div>
                        <Badge variant={story.onMarket ? "default" : "secondary"} className="ml-2">
                          {story.onMarket ? "On Market" : "Draft"}
                        </Badge>
                      </div>

                      {/* Tags */}
                      {story.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {story.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag.id} variant="outline" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                          {story.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{story.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Token Info */}
                      {token && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Price</span>
                            <span className="font-bold">${price.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">24h Change</span>
                            <span
                              className={`flex items-center gap-1 font-medium ${isPriceUp ? "text-green-500" : "text-red-500"}`}
                            >
                              {isPriceUp ? (
                                <TrendingUpIcon className="w-3 h-3" />
                              ) : (
                                <TrendingDownIcon className="w-3 h-3" />
                              )}
                              {priceChange.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Volume</span>
                            <span className="text-sm text-muted-foreground">${(volume / 1000).toFixed(1)}K</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            by {story.submitter.name || story.submitter.walletAddress.slice(0, 8)}
                          </span>
                        </div>
                        <Button 
                          onClick={() => addToMarket(story.id)}
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Add to Market
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* TODO: Implement pagination */}}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* TODO: Implement pagination */}}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
