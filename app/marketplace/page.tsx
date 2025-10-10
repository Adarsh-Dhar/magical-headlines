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

interface MarketplaceResponse {
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

export default function MarketplacePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [userStories, setUserStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [userStoriesLoading, setUserStoriesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-stories'>('marketplace')

  useEffect(() => {
    fetchMarketplaceStories()
    fetchUserStories()
  }, [])

  const fetchMarketplaceStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/story/marketplace')
      if (!response.ok) {
        throw new Error('Failed to fetch marketplace stories')
      }
      const data: MarketplaceResponse = await response.json()
      setStories(data.stories)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStories = async () => {
    try {
      setUserStoriesLoading(true)
      const response = await fetch('/api/story/marketplace/me')
      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, that's okay
          setUserStories([])
          return
        }
        throw new Error('Failed to fetch user stories')
      }
      const data: MarketplaceResponse = await response.json()
      setUserStories(data.stories)
    } catch (err) {
      console.error('Error fetching user stories:', err)
      setUserStories([])
    } finally {
      setUserStoriesLoading(false)
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
      
      // Refresh both lists
      await Promise.all([fetchMarketplaceStories(), fetchUserStories()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Marketplace</h1>
            <p className="text-lg text-muted-foreground">Browse and trade all headline tokens</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading marketplace...</p>
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
            <h1 className="text-4xl font-bold mb-3">Marketplace</h1>
            <p className="text-lg text-muted-foreground">Browse and trade all headline tokens</p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={fetchMarketplaceStories}>Try Again</Button>
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
              <h1 className="text-4xl font-bold mb-3">Marketplace</h1>
              <p className="text-lg text-muted-foreground">Browse and trade all headline tokens</p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={activeTab === 'marketplace' ? fetchMarketplaceStories : fetchUserStories}
                disabled={loading || userStoriesLoading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${(loading || userStoriesLoading) ? 'animate-spin' : ''}`} />
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
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit mt-6">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Marketplace
            </button>
            <button
              onClick={() => setActiveTab('my-stories')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'my-stories'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Stories
            </button>
          </div>
        </div>

        {activeTab === 'marketplace' ? (
          // Marketplace Tab Content
          stories.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlusIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No stories on the marketplace yet</h3>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  Be the first to add a story to the marketplace and start trading headline tokens. 
                  Create compelling news stories that others can invest in.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/">
                    <Button size="lg" className="flex items-center gap-2 w-full sm:w-auto">
                      <PlusIcon className="w-4 h-4" />
                      Create Story
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" onClick={fetchMarketplaceStories} className="w-full sm:w-auto">
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {stories.length} story{stories.length !== 1 ? 'ies' : ''} on the marketplace
              </p>
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
                      <th className="text-right p-4 font-semibold">Market Cap</th>
                      <th className="text-right p-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                  {stories.map((story) => {
                    const token = story.token
                    const isPriceUp = token ? token.priceChange24h > 0 : false
                    const priceChange = token ? Math.abs(token.priceChange24h) : 0
                    const price = token ? token.price : 0
                    const volume = token ? token.volume24h : 0
                    const marketCap = token ? token.marketCap : 0
                    
                    return (
                      <tr key={story.id} className="border-t hover:bg-accent/50 transition-colors">
                        <td className="p-4">
                          <Badge variant="outline" className="font-mono">
                            {story.id.slice(0, 8).toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-balance max-w-md">{story.headline}</p>
                          {story.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {story.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag.id} variant="secondary" className="text-xs">
                                  {tag.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-bold">${price.toFixed(2)}</span>
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
                            {priceChange.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-muted-foreground">${(volume / 1000).toFixed(1)}K</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-muted-foreground">${(marketCap / 1000).toFixed(1)}K</span>
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
          )
        ) : (
          // My Stories Tab Content
          userStoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your stories...</p>
              </div>
            </div>
          ) : userStories.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <PlusIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">No stories to add to market</h3>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  You don't have any stories that are not on the market yet. Create a new story first, 
                  then you can add it to the marketplace for others to trade.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/">
                    <Button size="lg" className="flex items-center gap-2 w-full sm:w-auto">
                      <PlusIcon className="w-4 h-4" />
                      Create Story
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" onClick={fetchUserStories} className="w-full sm:w-auto">
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {userStories.length} story{userStories.length !== 1 ? 'ies' : ''} ready to add to market
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userStories.map((story) => (
                  <Card key={story.id} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{story.headline}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">{story.content}</p>
                      </div>
                      
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
                      
                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                        <Button 
                          onClick={() => addToMarket(story.id)}
                          className="flex items-center gap-2"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Add to Market
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
