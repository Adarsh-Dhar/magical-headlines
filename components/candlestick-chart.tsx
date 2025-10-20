"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  UTCTimestamp,
  CandlestickSeriesOptions,
  CrosshairMode,
  LineStyle,
  PriceScaleMode
} from "lightweight-charts"
import { useLivePrice } from "@/lib/hooks/use-live-price"

interface OHLCData {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

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
}

export function CandlestickChart({
  tokenId,
  className = "",
  height = 400,
  live = true,
  interval = '1m',
  theme = 'auto',
  initialPrice
  ,marketAddress
  ,newsAccountAddress
  ,mintAddress
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const [data, setData] = useState<OHLCData[]>([])
  const [volumes, setVolumes] = useState<Array<{ time: UTCTimestamp, value: number; color?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simPoints, setSimPoints] = useState<Array<{ time: UTCTimestamp, value: number }>>([])

  // Live polling from contract every 5s when addresses present
  const { data: liveTick } = useLivePrice({
    marketAddress: marketAddress || "",
    newsAccountAddress: newsAccountAddress || "",
    mintAddress: mintAddress || "",
    enabled: !!(live && marketAddress),
    refreshInterval: 5000,
  })

  // Determine theme
  const getTheme = useCallback(() => {
    if (theme === 'auto') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return theme
  }, [theme])

  // Format price for display
  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`
    } else if (price < 1) {
      return `$${price.toFixed(4)}`
    } else {
      return `$${price.toFixed(2)}`
    }
  }

  // Fetch OHLC data
  const fetchOHLCData = useCallback(async () => {
    if (!tokenId) return

    try {
      setLoading(true)
      setError(null)

      // Always fetch price history from same-origin and synthesize OHLC
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const response = await fetch(`${base}/api/tokens/${tokenId}/price-history?timeframe=24h&limit=1000`, { cache: 'no-store' })
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const priceData = await response.json()
      if (!priceData.priceHistory || priceData.priceHistory.length === 0) {
        // No historical trades; if we have an initialPrice, start simulation
        if (typeof initialPrice === 'number' && initialPrice > 0) {
          setSimulating(true)
          setError(null)
          setData([])
          setLastUpdate(new Date())
          return
        } else {
          throw new Error('No trading data available')
        }
      }

      // Synthesize OHLC from price history
      const ohlcData = synthesizeOHLC(priceData.priceHistory, interval)
      setData(ohlcData)
      setLastUpdate(new Date())
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch data'
      // If API failed but we can simulate, enable simulation
      if ((errorMsg || '').length > 0 && typeof initialPrice === 'number' && initialPrice > 0) {
        setSimulating(true)
        setError(null)
      } else {
        setError(errorMsg)
        setData([])
      }
    } finally {
      setLoading(false)
    }
  }, [tokenId, interval, initialPrice])

  // Synthesize OHLC from price history
  const synthesizeOHLC = (priceHistory: any[], interval: string): OHLCData[] => {
    const intervalMs = getIntervalMs(interval)
    const buckets = new Map<number, { open: number, high: number, low: number, close: number, volume: number }>()
    
    priceHistory.forEach((point: any) => {
      const timestamp = new Date(point.timestamp).getTime()
      const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          open: point.price || 0,
          high: point.price || 0,
          low: point.price || 0,
          close: point.price || 0,
          volume: point.volume || 0
        })
      } else {
        const bucket = buckets.get(bucketTime)!
        bucket.high = Math.max(bucket.high, point.price || 0)
        bucket.low = Math.min(bucket.low, point.price || 0)
        bucket.close = point.price || 0
        bucket.volume += point.volume || 0
      }
    })

    return Array.from(buckets.entries())
      .map(([time, data]) => ({
        time: (time / 1000) as UTCTimestamp,
        ...data
      }))
      .sort((a, b) => a.time - b.time)
  }

  const getIntervalMs = (interval: string): number => {
    switch (interval) {
      case '1m': return 60 * 1000
      case '5m': return 5 * 60 * 1000
      case '15m': return 15 * 60 * 1000
      case '1h': return 60 * 60 * 1000
      case '4h': return 4 * 60 * 60 * 1000
      case '1d': return 24 * 60 * 60 * 1000
      default: return 60 * 1000
    }
  }

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const currentTheme = getTheme()
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: currentTheme === 'dark' ? '#ffffff' : '#000000',
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      grid: {
        vertLines: { color: currentTheme === 'dark' ? '#2a2a2a' : '#e0e0e0' },
        horzLines: { color: currentTheme === 'dark' ? '#2a2a2a' : '#e0e0e0' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        mode: PriceScaleMode.Normal,
        borderColor: currentTheme === 'dark' ? '#2a2a2a' : '#e0e0e0',
        scaleMargins: { top: 0.2, bottom: 0.2 },
      },
      timeScale: {
        borderColor: currentTheme === 'dark' ? '#2a2a2a' : '#e0e0e0',
        timeVisible: true,
        secondsVisible: true,
      },
    })

    // Use any to avoid potential typing mismatches across lightweight-charts versions
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
    })

    const histogramSeries = (chart as any).addHistogramSeries({
      priceScaleId: '',
      color: '#60a5fa',
      priceFormat: { type: 'volume' },
      base: 0,
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries
    volumeSeriesRef.current = histogramSeries

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return
      const newRect = entries[0].contentRect
      chart.applyOptions({ width: newRect.width, height: newRect.height })
    })

    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
        simIntervalRef.current = null
      }
      chart.remove()
    }
  }, [height, getTheme])

  // Update chart data
  useEffect(() => {
    if (!chartRef.current) return
    if (data.length === 0) return

    // If we have very few candles, draw a line instead so it's visible
    if (data.length <= 2) {
      const themeNow = getTheme()
      const lineColor = themeNow === 'dark' ? '#34d399' : '#16a34a'
      const topColor = themeNow === 'dark' ? 'rgba(52,211,153,0.45)' : 'rgba(22,163,74,0.35)'
      const bottomColor = themeNow === 'dark' ? 'rgba(52,211,153,0.08)' : 'rgba(22,163,74,0.06)'
      if (!areaSeriesRef.current) {
        areaSeriesRef.current = (chartRef.current as any).addAreaSeries({
          lineColor,
          topColor,
          bottomColor,
          lineWidth: 3,
          priceFormat: { type: 'price', precision: 8, minMove: 0.00000001 },
        })
      } else {
        areaSeriesRef.current.applyOptions({ lineColor, topColor, bottomColor, lineWidth: 3 })
      }
      // Ensure there is a visible vertical range even if values are identical
      const closes = data.map(d => d.close)
      const min = Math.min(...closes)
      const max = Math.max(...closes)
      const epsilon = Math.max(min * 0.0001, 0.00000001)
      const adjusted = (min === max)
        ? data.map((d, i) => ({ time: d.time, value: i === 0 ? d.close - epsilon : d.close + epsilon }))
        : data.map(d => ({ time: d.time, value: d.close }))

      const areaData = adjusted
      if (areaSeriesRef.current) {
        areaSeriesRef.current.setData(areaData)
      }
      if (seriesRef.current) {
        // Clear candle data to avoid overlapping visuals
        seriesRef.current.setData([] as any)
      }
      // Clear line series if existed from simulation
      if (lineSeriesRef.current) {
        lineSeriesRef.current.setData([] as any)
      }
      // Ensure we fit to content so the flat line is centered
      chartRef.current.timeScale().fitContent()
    } else {
      if (seriesRef.current) {
        seriesRef.current.setData(data)
      }
      if (lineSeriesRef.current) {
        lineSeriesRef.current.setData([] as any)
      }
      if (areaSeriesRef.current) {
        areaSeriesRef.current.setData([] as any)
      }
    }
    
    chartRef.current.timeScale().fitContent()
  }, [data])

  // Update volume histogram
  useEffect(() => {
    if (!volumeSeriesRef.current || volumes.length === 0) return
    volumeSeriesRef.current.setData(volumes as any)
  }, [volumes])

  // Initial data fetch
  useEffect(() => {
    fetchOHLCData()
  }, [fetchOHLCData])

  // Removed periodic polling to avoid frequent requests; updates happen on mount
  // and via optimistic updates from buy/sell actions.

  // Update last candle with new price (for optimistic updates)
  const updateLastCandle = useCallback((newPrice: number) => {
    if (simulating) {
      // In simulation mode, update the line series instead
      if (!lineSeriesRef.current || simPoints.length === 0 || newPrice <= 0) return
      const now = Math.floor(Date.now() / 1000) as UTCTimestamp
      const last = simPoints[simPoints.length - 1]
      if (now - last.time > 1) {
        const next = { time: now, value: newPrice }
        const nextArr = [...simPoints, next].slice(-600)
        setSimPoints(nextArr)
        lineSeriesRef.current.setData(nextArr)
      } else {
        const updated = [...simPoints.slice(0, -1), { time: last.time, value: newPrice }]
        setSimPoints(updated)
        lineSeriesRef.current.setData(updated)
      }
      return
    }
    if (!seriesRef.current || data.length === 0 || newPrice <= 0) return

    const lastCandle = data[data.length - 1]
    const now = Date.now() / 1000
    
    // If the last candle is more than 1 minute old, create a new one
    if (now - lastCandle.time > 60) {
      const newCandle = {
        time: now as UTCTimestamp,
        open: lastCandle.close,
        high: newPrice,
        low: newPrice,
        close: newPrice,
        volume: 0
      }
      const updatedData = [...data, newCandle].slice(-300) // Keep only last 300 candles
      setData(updatedData)
    } else {
      // Update existing candle
      const updatedCandle = {
        ...lastCandle,
        close: newPrice,
        high: Math.max(lastCandle.high, newPrice),
        low: Math.min(lastCandle.low, newPrice),
      }

      const updatedData = [...data.slice(0, -1), updatedCandle]
      setData(updatedData)
    }
  }, [data])

  // Expose updateLastCandle for parent components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).updateCandlestickChart = updateLastCandle
      
      return () => {
        delete (window as any).updateCandlestickChart
      }
    }
  }, [updateLastCandle])

  // Simulation bootstrap and ticking
  useEffect(() => {
    if (!chartRef.current) return
    if (!simulating) return

    // Create line series once for simulation
    if (!lineSeriesRef.current) {
      lineSeriesRef.current = (chartRef.current as any).addLineSeries({
        color: '#22c55e',
        lineWidth: 2,
      })
    }

    // Initialize with initialPrice and a couple of back points
    const base = typeof initialPrice === 'number' && initialPrice > 0 ? initialPrice : 1
    const t0 = Math.floor(Date.now() / 1000) as UTCTimestamp
    const seed: Array<{ time: UTCTimestamp, value: number }> = [
      { time: (t0 - 60 * 3) as UTCTimestamp, value: base * 0.99 },
      { time: (t0 - 60 * 2) as UTCTimestamp, value: base * 1.01 },
      { time: (t0 - 60 * 1) as UTCTimestamp, value: base * 1.0 },
      { time: t0, value: base },
    ]
    setSimPoints(seed)
    if (lineSeriesRef.current) {
      lineSeriesRef.current.setData(seed)
    }
    chartRef.current.timeScale().fitContent()

    // Random walk every second
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current)
    }
    simIntervalRef.current = setInterval(() => {
      setSimPoints(prev => {
        const last = prev[prev.length - 1]
        const drift = 0 // no bias
        const volatility = Math.max(base * 0.001, 0.0000001)
        const shock = (Math.random() - 0.5) * 2 * volatility
        const nextValue = Math.max(0.00000001, last.value + drift + shock)
        const nextTime = (Math.floor(Date.now() / 1000)) as UTCTimestamp
        const nextArr = [...prev, { time: nextTime, value: nextValue }].slice(-600)
        if (lineSeriesRef.current) {
          lineSeriesRef.current.setData(nextArr)
        }
        return nextArr
      })
    }, 1000)

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current)
        simIntervalRef.current = null
      }
    }
  }, [simulating, initialPrice])

  // Aggregate live ticks into 1m candles and volume bars
  useEffect(() => {
    if (!liveTick || !liveTick.currentPrice || liveTick.currentPrice <= 0) return

    const timeSec = Math.floor(liveTick.timestamp / 1000)
    const bucket = Math.floor(timeSec / 60) * 60 as UTCTimestamp

    setData(prev => {
      if (prev.length === 0) {
        const first = { time: bucket, open: liveTick.currentPrice, high: liveTick.currentPrice, low: liveTick.currentPrice, close: liveTick.currentPrice, volume: 0 }
        return [first]
      }
      const last = prev[prev.length - 1]
      if (last.time === bucket) {
        const updated = { ...last, close: liveTick.currentPrice, high: Math.max(last.high, liveTick.currentPrice), low: Math.min(last.low, liveTick.currentPrice) }
        return [...prev.slice(0, -1), updated]
      } else {
        const newCandle = { time: bucket, open: prev[prev.length - 1].close, high: liveTick.currentPrice, low: liveTick.currentPrice, close: liveTick.currentPrice, volume: 0 }
        return [...prev, newCandle]
      }
    })

    setVolumes(prev => {
      const deltaVolume = 0 // placeholder until per-interval volume available
      if (prev.length === 0) return [{ time: bucket, value: deltaVolume }]
      const last = prev[prev.length - 1]
      if (last.time === bucket) {
        const updated = { ...last, value: (last.value || 0) + deltaVolume }
        return [...prev.slice(0, -1), updated]
      }
      return [...prev, { time: bucket, value: deltaVolume }]
    })
  }, [liveTick])

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chart...</p>
          </div>
        </div>
      </Card>
    )
  }

  // If we are simulating, render the chart container regardless of data
  if (!simulating && (error || data.length === 0)) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <p className="text-red-500 font-medium mb-2">
              {error || 'No trading data available'}
            </p>
            <p className="text-sm text-muted-foreground">
              Ensure the oracle service is running to capture trading events
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0
  const priceChange = data.length > 1 ? 
    ((currentPrice - data[data.length - 2].close) / data[data.length - 2].close) * 100 : 0

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Price Chart</h3>
              {live && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">LIVE</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {interval} candlesticks
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {data.length} candles
            </Badge>
            <Badge 
              variant={priceChange >= 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </Badge>
          </div>
        </div>

        {/* Chart */}
        <div ref={chartContainerRef} style={{ height }} />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="font-semibold">{formatPrice(simulating ? (simPoints[simPoints.length - 1]?.value || 0) : currentPrice)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">24h High</p>
            <p className="font-semibold text-green-500">
              {formatPrice(Math.max(...data.map(d => d.high)))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">24h Low</p>
            <p className="font-semibold text-red-500">
              {formatPrice(Math.min(...data.map(d => d.low)))}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
