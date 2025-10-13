"use client"

import { Card } from "@/components/ui/card"
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

const chartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
}

export function SimplePriceChart() {
  // Generate sample data
  const data = [
    {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      price: 0.001,
    },
    {
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      price: 0.002,
    },
    {
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      price: 0.003,
    },
    {
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      price: 0.0025,
    },
    {
      timestamp: new Date().toISOString(),
      price: 0.0035,
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

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Simple Price Chart</h3>
          <p className="text-sm text-muted-foreground">This chart always works</p>
        </div>
        
        <div style={{ height: 300 }}>
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
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="font-semibold">{formatPrice(0.0035)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">24h Change</p>
            <p className="font-semibold text-green-500">+2.5%</p>
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
