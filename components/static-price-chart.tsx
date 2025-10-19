"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartConfig 
} from "@/components/ui/chart"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid
} from "recharts"
import { TrendingUpIcon, TrendingDownIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const chartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
}

interface StaticPriceChartProps {
  className?: string
  height?: number
  showVolume?: boolean
  tokenId?: string
  marketAddress?: string
}

interface PriceDataPoint {
  timestamp: string
  price: number
  volume: number
  type?: string
}

interface PriceHistoryResponse {
  tokenId: string
  storyId: string
  storyHeadline: string
  currentPrice: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  timeframe: string
  priceHistory: PriceDataPoint[]
  tradeCount: number
}

export function StaticPriceChart({ 
  className,
  height = 300,
  showVolume = false,
  tokenId,
  marketAddress
}: StaticPriceChartProps) {
  const [data, setData] = useState<PriceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priceData, setPriceData] = useState<PriceHistoryResponse | null>(null)

  useEffect(() => {
    const fetchPriceData = async () => {
      if (!tokenId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=24h&limit=100`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch price history')
        }
        
        const result: PriceHistoryResponse = await response.json()
        setPriceData(result)
        setData(result.priceHistory)
      } catch (err) {
        console.error('Error fetching price data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load price data')
      } finally {
        setLoading(false)
      }
    }

    fetchPriceData()
  }, [tokenId])

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`
    } else if (price < 1) {
      return `$${price.toFixed(4)}`
    } else {
      return `$${price.toFixed(2)}`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const currentPrice = priceData?.currentPrice || 0
  const priceChange = priceData?.priceChange24h || 0
  const volume24h = priceData?.volume24h || 0
  const isPriceUp = priceChange >= 0
  const tradeCount = priceData?.tradeCount || 0

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Price Chart</h3>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              {priceData?.storyHeadline || 'Loading...'}
            </p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-1 border border-border text-muted-foreground text-xs rounded-md">
                {data.length} data points
              </span>
              <span className={`inline-flex items-center px-2 py-1 text-xs rounded-md ${
                isPriceUp 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-destructive text-destructive-foreground"
              }`}>
                {isPriceUp ? (
                  <TrendingUpIcon className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDownIcon className="w-3 h-3 mr-1" />
                )}
                {priceChange.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ height }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading price data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Failed to load price data</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No price data available</p>
                <p className="text-xs text-muted-foreground">Start trading to see price history</p>
              </div>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [formatPrice(Number(value)), "Price"]}
                      labelFormatter={(label) => formatTimestamp(label)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="var(--color-price)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--color-price)" }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="font-semibold">
                {formatPrice(currentPrice)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">24h Change</p>
              <p className={cn(
                "font-semibold",
                isPriceUp ? "text-green-500" : "text-red-500"
              )}>
                {isPriceUp ? "+" : ""}{priceChange.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Volume (24h)</p>
              <p className="font-semibold">
                {volume24h >= 1000 ? `$${(volume24h / 1000).toFixed(1)}K` : `$${volume24h.toFixed(2)}`}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
