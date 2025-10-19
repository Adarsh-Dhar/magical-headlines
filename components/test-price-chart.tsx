"use client"

import { PriceChart } from "@/components/price-chart"
import { SimplePriceChart } from "@/components/simple-price-chart"
import { StaticPriceChart } from "@/components/static-price-chart"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface TokenData {
  id: string
  marketAddress: string
  newsAccountAddress: string
  mintAddress: string
  storyHeadline: string
}

// Test component to verify the price chart works
export function TestPriceChart() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch a real token from the database
        const response = await fetch('/api/tokens')
        if (!response.ok) {
          throw new Error('Failed to fetch tokens')
        }
        
        const tokens = await response.json()
        if (tokens.length === 0) {
          throw new Error('No tokens available')
        }
        
        // Use the first available token
        const token = tokens[0]
        setTokenData({
          id: token.id,
          marketAddress: token.marketAddress,
          newsAccountAddress: token.story.id,
          mintAddress: token.mintAddress,
          storyHeadline: token.story.headline
        })
      } catch (err) {
        console.error('Error fetching token data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load token data')
      } finally {
        setLoading(false)
      }
    }

    fetchTokenData()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Price Chart Test</h1>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading token data...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Price Chart Test</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Failed to load token data</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Price Chart Test</h1>
      
      <div className="space-y-6">
        {/* Static chart with real data */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Static Chart with Real Data</h2>
          <StaticPriceChart 
            tokenId={tokenData?.id}
            marketAddress={tokenData?.marketAddress}
          />
        </div>
        
        {/* Simple chart that always works */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Simple Chart (Always Works)</h2>
          <SimplePriceChart />
        </div>
        
        {/* Test with real token data */}
        {tokenData && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Test Chart with Real Data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Story: {tokenData.storyHeadline}
            </p>
            <PriceChart 
              tokenId={tokenData.id}
              marketAddress={tokenData.marketAddress}
              newsAccountAddress={tokenData.newsAccountAddress}
              mintAddress={tokenData.mintAddress}
              height={300}
              showVolume={false}
              liveUpdates={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
