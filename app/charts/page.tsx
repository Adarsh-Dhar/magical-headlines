"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PriceChart } from "@/components/price-chart"
import { MiniPriceChart } from "@/components/mini-price-chart"
import { TrendingUpIcon, TrendingDownIcon, RefreshCwIcon } from "lucide-react"
import Link from "next/link"

interface Story {
  id: string
  headline: string
  content: string
  createdAt: string
  token: {
    id: string
    price: number
    priceChange24h: number
    volume24h: number
    marketCap: number
  } | null
}

export default function ChartsPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/tokens?limit=20')
      if (!response.ok) {
        throw new Error('Failed to fetch stories')
      }
      
      const data = await response.json()
      setStories(data.stories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stories')
      console.error('Error fetching stories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStories()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading charts...</p>
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-500 mb-4">Error: {error}</p>
              <Button onClick={fetchStories}>Try Again</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const storiesWithTokens = stories.filter(story => story.token)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-3">Price Charts</h1>
              <p className="text-lg text-muted-foreground">
                Real-time price charts for all story tokens
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStories}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/marketplace">
                <Button variant="outline" size="sm">
                  Back to Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {storiesWithTokens.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUpIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No tokens available</h3>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                There are no story tokens available to display charts for. 
                Create some stories first to see price charts.
              </p>
              <Link href="/">
                <Button size="lg" className="flex items-center gap-2">
                  Create Story
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Mini Charts Grid */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Quick Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {storiesWithTokens.slice(0, 8).map((story) => {
                  const token = story.token!
                  const isPriceUp = token.priceChange24h > 0
                  const priceChange = Math.abs(token.priceChange24h)
                  
                  return (
                    <Card key={story.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                            {story.headline}
                          </h3>
                          <Badge 
                            variant={isPriceUp ? "default" : "destructive"}
                            className="text-xs ml-2 flex-shrink-0"
                          >
                            {isPriceUp ? (
                              <TrendingUpIcon className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDownIcon className="w-3 h-3 mr-1" />
                            )}
                            {priceChange.toFixed(1)}%
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">${token.price.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Volume:</span>
                            <span className="font-medium">${(token.volume24h / 1000).toFixed(1)}K</span>
                          </div>
                        </div>
                        
                        <div className="h-12">
                          <MiniPriceChart 
                            tokenId={token.id} 
                            height={48}
                            width="100%"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Link href={`/marketplace/${story.id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Full Charts */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Detailed Charts</h2>
              <div className="space-y-6">
                {storiesWithTokens.map((story) => {
                  const token = story.token!
                  
                  return (
                    <div key={story.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{story.headline}</h3>
                          <p className="text-sm text-muted-foreground">
                            Created {new Date(story.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/marketplace/${story.id}`}>
                          <Button variant="outline" size="sm">
                            View Full Page
                          </Button>
                        </Link>
                      </div>
                      
                      <PriceChart 
                        tokenId={token.id} 
                        height={300}
                        showVolume={true}
                        enableRealTime={true}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
