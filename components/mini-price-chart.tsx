"use client"

import { useState, useEffect } from "react"
import { 
  ChartContainer, 
  ChartConfig 
} from "@/components/ui/chart"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  ResponsiveContainer
} from "recharts"

interface PriceDataPoint {
  timestamp: string
  price: number
  volume: number
  type: string
  tradeId?: string
}

interface MiniPriceChartProps {
  tokenId: string
  className?: string
  height?: number
  width?: number
}

const chartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
}

export function MiniPriceChart({ 
  tokenId, 
  className,
  height = 40,
  width = 120
}: MiniPriceChartProps) {
  const [data, setData] = useState<PriceDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=24h&limit=20`)
        
        if (response.ok) {
          const priceData = await response.json()
          setData(priceData.priceHistory || [])
        }
      } catch (error) {
        console.error("Error fetching mini price data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (tokenId) {
      fetchPriceHistory()
    }
  }, [tokenId])

  if (loading || data.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center bg-muted/30 rounded ${className}`}
        style={{ height, width }}
      >
        <div className="text-xs text-muted-foreground">
          {loading ? "..." : "No data"}
        </div>
      </div>
    )
  }

  const isPriceUp = data.length > 1 ? data[data.length - 1].price >= data[0].price : true

  return (
    <div className={`mini-chart ${className}`} style={{ height, width }}>
      <ChartContainer config={chartConfig} className="h-full w-full">
        <LineChart data={data}>
          <XAxis 
            dataKey="timestamp" 
            hide
          />
          <YAxis 
            hide
            domain={['dataMin', 'dataMax']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={isPriceUp ? "hsl(var(--chart-1))" : "hsl(var(--destructive))"}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  )
}
