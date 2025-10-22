"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { useLivePrice } from "@/lib/hooks/use-live-price"

interface SimpleChartProps {
  className?: string
  height?: number
  marketAddress?: string
  newsAccountAddress?: string
  mintAddress?: string
  live?: boolean
}

export function SimpleChart({ 
  className = "", 
  height = 400, 
  marketAddress,
  newsAccountAddress,
  mintAddress,
  live = true
}: SimpleChartProps) {
  const { data: livePriceData } = useLivePrice({
    marketAddress: marketAddress || "",
    newsAccountAddress: newsAccountAddress || "",
    mintAddress: mintAddress || "",
    enabled: live && !!marketAddress && !!newsAccountAddress && !!mintAddress,
    refreshInterval: 5000,
  })
  // Create demo data for a simple line chart with live price
  const data = React.useMemo(() => {
    const points = []
    const basePrice = livePriceData?.currentPrice || 0.0020121000
    const now = Date.now()
    
    for (let i = 0; i < 50; i++) {
      const x = (i / 49) * 100 // 0 to 100%
      const variation = Math.sin(i * 0.2) * 0.0003
      const y = basePrice + variation
      points.push({ x, y })
    }
    
    return points
  }, [livePriceData?.currentPrice])

  const minY = Math.min(...data.map(d => d.y))
  const maxY = Math.max(...data.map(d => d.y))
  const range = maxY - minY || 0.001

  // Create SVG path
  const pathData = data.map((point, index) => {
    const x = (point.x / 100) * 100
    const y = 100 - ((point.y - minY) / range) * 100
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <Card className={`p-6 ${className}`}>
      <div 
        className="w-full relative"
        style={{ 
          height: height || 400,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px'
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Chart line */}
          <path
            d={pathData}
            fill="none"
            stroke="#10b981"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {data.map((point, index) => (
            <circle
              key={index}
              cx={(point.x / 100) * 100}
              cy={100 - ((point.y - minY) / range) * 100}
              r="0.3"
              fill="#10b981"
            />
          ))}
        </svg>
        
        {/* Price labels */}
        <div className="absolute top-2 right-2 text-xs text-gray-600">
          ${maxY.toFixed(6)}
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-600">
          ${minY.toFixed(6)}
        </div>
        
        {/* Time labels */}
        <div className="absolute bottom-2 left-2 text-xs text-gray-600">
          24h ago
        </div>
        <div className="absolute bottom-2 right-1/2 text-xs text-gray-600">
          Now
        </div>
      </div>
    </Card>
  )
}
