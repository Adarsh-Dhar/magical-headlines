"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, PlusIcon, RefreshCwIcon, MinusIcon } from "lucide-react"
import { MiniPriceChart } from "@/components/mini-price-chart"
import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
// Removed NextAuth import - using wallet address directly
import { useContract } from "@/lib/use-contract"
import { PublicKey } from "@solana/web3.js"

interface Story {
  id: string
  headline: string
  content: string
  originalUrl: string
  arweaveUrl: string
  arweaveId: string
  onchainSignature: string
  authorAddress?: string
  nonce?: string
  onMarket: boolean
  createdAt: string
  updatedAt: string
  submitter: {
    id: string
    name: string | null
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
    newsAccount?: string
    mint?: string
    market?: string
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
  const contract = useContract()
  const { estimateBuyCost, pdas } = contract || {}
  const [stories, setStories] = useState<Story[]>([])
  const [userStories, setUserStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [userStoriesLoading, setUserStoriesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'marketplace' | 'my-stories'>('marketplace')
  const [realTimePrices, setRealTimePrices] = useState<Record<string, number>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const isCalculatingPricesRef = useRef(false)

  useEffect(() => {
    fetchMarketplaceStories()
    fetchUserStories()
  }, [])

  // Remove automatic price calculation - prices will only update on manual refresh

  const calculateRealTimePrices = useCallback(async () => {
    if (!estimateBuyCost || !pdas || isCalculatingPricesRef.current) return
    
    // Prevent multiple simultaneous calculations
    isCalculatingPricesRef.current = true
    setPricesLoading(true)
    const prices: Record<string, number> = {}
    
    try {
      // Process stories in batches to avoid overwhelming the RPC
      const batchSize = 3
      const storiesToProcess = stories.filter(story => story.authorAddress && story.nonce)
      
      for (let i = 0; i < storiesToProcess.length; i += batchSize) {
        const batch = storiesToProcess.slice(i, i + batchSize)
        
        // Process batch in parallel but with rate limiting
        await Promise.all(batch.map(async (story) => {
          try {
            const authorAddress = new PublicKey(story.authorAddress!)
            const nonce = parseInt(story.nonce!)
            const newsAccountPubkey = pdas.findNewsPda(authorAddress, nonce)
            const marketPda = pdas.findMarketPda(newsAccountPubkey)
            
            // Calculate price for 1 token
            const price = await estimateBuyCost(marketPda, 1)
            if (price !== null) {
              prices[story.id] = price
            }
          } catch (error) {
            console.warn(`Failed to calculate price for story ${story.id}:`, error)
          }
        }))
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < storiesToProcess.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      setRealTimePrices(prices)
    } catch (error) {
      console.error('Error calculating real-time prices:', error)
    } finally {
      setPricesLoading(false)
      isCalculatingPricesRef.current = false
    }
  }, [stories, estimateBuyCost, pdas])

  const fetchMarketplaceStories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/story')
      if (!response.ok) {
        throw new Error('Failed to fetch stories')
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
      // For now, show all stories in "My Stories" tab since we don't have wallet context
      // In a real implementation, you'd pass the wallet address to filter stories
      const response = await fetch('/api/story')
      if (!response.ok) {
        throw new Error('Failed to fetch stories')
      }
      const data: MarketplaceResponse = await response.json()
      
      // For now, show all stories - in a real implementation you'd filter by wallet address
      setUserStories(data.stories)
    } catch (err) {
      setUserStories([])
    } finally {
      setUserStoriesLoading(false)
    }
  }

  const addToMarket = async (storyId: string) => {
    try {
      // For now, just refresh the data since we don't have an update endpoint
      // TODO: Implement API endpoint for updating onMarket status
      await Promise.all([fetchMarketplaceStories(), fetchUserStories()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const removeFromMarket = async (storyId: string) => {
    try {
      // For now, just refresh the data since we don't have an update endpoint
      // TODO: Implement API endpoint for updating onMarket status
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
            <p className="text-lg text-muted-foreground">Browse and trade headline tokens from all stories</p>
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
            <p className="text-lg text-muted-foreground">Browse and trade headline tokens from all stories</p>
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
              <p className="text-lg text-muted-foreground">Browse and trade headline tokens from all stories</p>
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
              {activeTab === 'marketplace' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={calculateRealTimePrices}
                  disabled={pricesLoading || !contract}
                  className="flex items-center gap-2"
                >
                  <RefreshCwIcon className={`w-4 h-4 ${pricesLoading ? 'animate-spin' : ''}`} />
                  {pricesLoading ? 'Updating Prices...' : 'Update Prices'}
                </Button>
              )}
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
                <h3 className="text-xl font-semibold mb-3">No stories available yet</h3>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  Be the first to create a story and start trading headline tokens. 
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
                Showing {stories.length} story{stories.length !== 1 ? 'ies' : ''} available
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
                      <th className="text-center p-4 font-semibold">Chart</th>
                      <th className="text-right p-4 font-semibold">24h Change</th>
                      <th className="text-right p-4 font-semibold">Volume</th>
                      <th className="text-right p-4 font-semibold">Market Cap</th>
                      <th className="text-right p-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                  {stories.map((story) => {
                    const token = story.token
                    // Use real-time price if available, otherwise fallback to token data
                    const realTimePrice = realTimePrices[story.id]
                    const price = realTimePrice !== undefined ? realTimePrice : (token ? token.price : 0)
                    const isPriceUp = token ? token.priceChange24h > 0 : false
                    const priceChange = token ? Math.abs(token.priceChange24h) : 0
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
                          <div className="flex flex-col items-end">
                            <span className="font-bold">
                              {pricesLoading ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                                  <span className="text-sm">Loading...</span>
                                </div>
                              ) : realTimePrice !== undefined ? (
                                `${price.toFixed(6)} SOL`
                              ) : (
                                `$${price.toFixed(2)}`
                              )}
                            </span>
                            {realTimePrice !== undefined && !pricesLoading ? (
                              <span className="text-xs text-muted-foreground">Real-time</span>
                            ) : !pricesLoading && realTimePrice === undefined ? (
                              <span className="text-xs text-muted-foreground">Click "Update Prices" for real-time data</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {token && (
                            <MiniPriceChart 
                              tokenId={token.id} 
                              height={40}
                              width={120}
                            />
                          )}
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
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/marketplace/${story.id}`}>
                              <Button size="sm">Trade</Button>
                            </Link>
                          </div>
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
                <h3 className="text-xl font-semibold mb-3">No stories created yet</h3>
                <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                  You haven't created any stories yet. Create a new story to get started with trading headline tokens.
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
                  {userStories.length} story{userStories.length !== 1 ? 'ies' : ''} created by you
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
                          disabled
                        >
                          <PlusIcon className="w-4 h-4" />
                          View Details
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
