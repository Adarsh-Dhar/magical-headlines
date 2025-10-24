"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { createChart, ColorType, CrosshairMode, Time, CandlestickSeries } from "lightweight-charts"
import { SimpleChart } from "./simple-chart"
import { useLivePrice } from "@/lib/hooks/use-live-price"
import { useMinuteCandles } from "@/lib/hooks/use-price-chart-data"

interface CandlestickChartProps {
  tokenId: string
  className?: string
  height?: number
  live?: boolean
  interval?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  theme?: 'light' | 'dark' | 'auto'
  initialPrice?: number
  marketAddress?: string
  newsAccountAddress?: string
  mintAddress?: string
  useTestData?: boolean
}

export function CandlestickChart({
  tokenId,
  className = "",
  height = 400,
  live = true,
  marketAddress,
  newsAccountAddress,
  mintAddress,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<any | null>(null)
  const seriesRef = useRef<any | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [candleData, setCandleData] = useState<any[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0)

  // Get live price (for indicator)
  const { data: livePriceData } = useLivePrice({
    marketAddress: marketAddress || "",
    newsAccountAddress: newsAccountAddress || "",
    mintAddress: mintAddress || "",
    enabled: live && !!marketAddress && !!newsAccountAddress && !!mintAddress,
    refreshInterval: 5000, // Update every 5 seconds
  })

  // Get 24h/1m candles derived from price-history + merged live price
  const { candles, loading, error } = useMinuteCandles({
    tokenId,
    marketAddress,
    newsAccountAddress,
    mintAddress,
    refreshInterval: 5000,
  })

  // Reflect hook candles into local state for chart draw; avoid redundant sets
  useEffect(() => {
    if (!candles || candles.length === 0) return
    const lastClose = candleData[candleData.length - 1]?.close
    const nextLastClose = candles[candles.length - 1]?.close
    if (candleData.length !== candles.length || lastClose !== nextLastClose) {
      setCandleData(candles as any[])
      setLastUpdateTime(Date.now())
    }
  }, [candles, candleData])

  // Update chart when candle data changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || candleData.length === 0) return

    // Updating chart with new data

    seriesRef.current.setData(candleData)
    chartRef.current.timeScale().fitContent()
  }, [candleData])

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return

    // Creating chart with real 24h/1m data

    // Set a timeout to use fallback if chart doesn't render
    const fallbackTimer = setTimeout(() => {
      if (!isChartReady) {
        // Chart timeout - using fallback
        setUseFallback(true)
      }
    }, 3000)

    try {
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth || 600,
        height: height || 400,
        layout: { 
          background: { type: ColorType.Solid, color: '#ffffff' }, 
          textColor: '#374151' 
        },
        rightPriceScale: { 
          borderColor: '#e5e7eb',
          textColor: '#374151',
          scaleMargins: { top: 0.1, bottom: 0.1 }
        },
        timeScale: { 
          borderColor: '#e5e7eb',
          timeVisible: true,
          secondsVisible: false
        },
        grid: {
          vertLines: { color: '#f3f4f6', visible: true },
          horzLines: { color: '#f3f4f6', visible: true },
        },
        crosshair: { mode: CrosshairMode.Normal },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      })
      
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        priceFormat: {
          type: 'price',
          precision: 9,
          minMove: 0.00000001,
        },
      })

      chartRef.current = chart
      seriesRef.current = series

      // Set initial data
      if (candleData.length > 0) {
        series.setData(candleData)
        chart.timeScale().fitContent()
      }

      // Chart created and data set

      setIsChartReady(true)
      clearTimeout(fallbackTimer)

      // Handle resize
      const handleResize = () => {
        if (!containerRef.current || !chartRef.current) return
        const width = containerRef.current.clientWidth
        const heightPx = height
        chartRef.current.resize(width, heightPx)
      }
      
      const ro = new ResizeObserver(handleResize)
      ro.observe(containerRef.current)

      return () => {
        clearTimeout(fallbackTimer)
        ro.disconnect()
        chart.remove()
        chartRef.current = null
        seriesRef.current = null
        setIsChartReady(false)
      }
    } catch (error) {
      console.error('❌ Chart creation failed:', error)
      setUseFallback(true)
    }
  }, [height, candleData])

  // Use fallback chart if lightweight-charts fails
  if (useFallback) {
    return (
      <SimpleChart 
        className={className} 
        height={height}
        marketAddress={marketAddress}
        newsAccountAddress={newsAccountAddress}
        mintAddress={mintAddress}
        live={live}
      />
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Price Chart</h3>
        {live && livePriceData && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
            <span className="text-sm text-gray-500">
              ${livePriceData.currentPrice.toFixed(8)}
            </span>
          </div>
        )}
      </div>
      <div 
        ref={containerRef} 
        className="w-full" 
        style={{ 
          height: height || 400, 
          minHeight: height || 400,
          backgroundColor: isChartReady ? 'transparent' : '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px'
        }} 
      />
    </Card>
  )
}
