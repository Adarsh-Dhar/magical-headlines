"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

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
}

export function StaticPriceChart({ 
  className,
  height = 300,
  showVolume = false
}: StaticPriceChartProps) {
  // Generate static sample data that never changes
  const data = [
    {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      price: 0.001,
      volume: 0,
    },
    {
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      price: 0.002,
      volume: 0,
    },
    {
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      price: 0.003,
      volume: 0,
    },
    {
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      price: 0.0025,
      volume: 0,
    },
    {
      timestamp: new Date().toISOString(),
      price: 0.0035,
      volume: 0,
    }
  ]

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

  const currentPrice = 0.0035
  const priceChange = 2.5
  const isPriceUp = priceChange >= 0

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Price Chart</h3>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              Static Price Data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              5 data points
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

        {/* Chart */}
        <div style={{ height }}>
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
                domain={[0, 0.05]}
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
        </div>

        {/* Stats */}
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
            <p className="font-semibold">$1.2K</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
