"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { createChart, ColorType, CrosshairMode, Time, CandlestickSeries } from "lightweight-charts"
import { SimpleChart } from "./simple-chart"

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

  // Create demo data immediately
  const demoData = React.useMemo(() => {
    const now = Math.floor(Date.now() / 1000)
    const basePrice = 0.0020121000
    const data = []
    
    for (let i = 0; i < 50; i++) {
      const time = now - (49 - i) * 3600 // Last 50 hours
      const variation = Math.sin(i * 0.2) * 0.0003
      const price = basePrice + variation
      
      data.push({
        time: time as Time,
        open: price,
        high: price + Math.abs(variation) + 0.0002,
        low: price - Math.abs(variation) - 0.0002,
        close: price + (Math.sin(i * 0.2 + 0.5) * 0.0001),
      })
    }
    
    return data
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || chartRef.current) return

    console.log('🚀 Creating chart with demo data...')

    // Set a timeout to use fallback if chart doesn't render
    const fallbackTimer = setTimeout(() => {
      if (!isChartReady) {
        console.log('⏰ Chart timeout - using fallback')
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
      })

      chartRef.current = chart
      seriesRef.current = series

      // Set demo data immediately
      series.setData(demoData)
      chart.timeScale().fitContent()

      console.log('✅ Chart created and data set:', {
        chart: !!chart,
        series: !!series,
        dataLength: demoData.length
      })

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
  }, [height, demoData])

  // Use fallback chart if lightweight-charts fails
  if (useFallback) {
    return <SimpleChart className={className} height={height} />
  }

  return (
    <Card className={`p-6 ${className}`}>
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
