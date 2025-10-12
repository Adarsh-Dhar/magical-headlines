"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  CartesianGrid, 
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts"
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriceDataPoint {
  timestamp: string
  price: number
  volume: number
  type: string
  tradeId?: string
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
  priceChange: number
  firstPrice: number
  lastPrice: number
}

interface PriceChartProps {
  tokenId: string
  className?: string
  showVolume?: boolean
  height?: number
}

const chartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
  volume: {
    label: "Volume",
    color: "hsl(var(--chart-2))",
  },
}

const timeframes = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
]

export function PriceChart({ 
  tokenId, 
  className,
  showVolume = false,
  height = 300
}: PriceChartProps) {
  const [data, setData] = useState<PriceHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h")

  const fetchPriceHistory = async (timeframe: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=${timeframe}&limit=100`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.statusText}`)
      }
      
      const priceData = await response.json()
      setData(priceData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch price data")
      console.error("Error fetching price history:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokenId) {
      fetchPriceHistory(selectedTimeframe)
    }
  }, [tokenId, selectedTimeframe])

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

  const isPriceUp = data ? data.priceChange >= 0 : false
  const priceChange = data ? Math.abs(data.priceChange) : 0

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading price data...</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <ActivityIcon className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              {error || "No price data available"}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchPriceHistory(selectedTimeframe)}
            >
              Retry
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Price Chart</h3>
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              {data.storyHeadline}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.tradeCount} trades
            </Badge>
            <Badge 
              variant={isPriceUp ? "default" : "destructive"}
              className="text-xs"
            >
              {isPriceUp ? (
                <TrendingUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDownIcon className="w-3 h-3 mr-1" />
              )}
              {priceChange.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-1">
          {timeframes.map((timeframe) => (
            <Button
              key={timeframe.value}
              variant={selectedTimeframe === timeframe.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe.value)}
              className="text-xs px-3"
            >
              {timeframe.label}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div style={{ height }}>
          {data.priceHistory && data.priceHistory.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full">
              {showVolume ? (
                <AreaChart data={data.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tickFormatter={formatPrice}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => [
                          name === "price" ? formatPrice(Number(value)) : value,
                          name === "price" ? "Price" : "Volume"
                        ]}
                        labelFormatter={(label) => formatTimestamp(label)}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="var(--color-price)"
                    fill="var(--color-price)"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <LineChart data={data.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTimestamp}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
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
              )}
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ActivityIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No price data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="font-semibold">{formatPrice(data.currentPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">24h Change</p>
            <p className={cn(
              "font-semibold",
              data.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {data.priceChange24h >= 0 ? "+" : ""}{data.priceChange24h.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Volume (24h)</p>
            <p className="font-semibold">${(data.volume24h / 1000).toFixed(1)}K</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
