import { NextRequest, NextResponse } from 'next/server'

interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const interval = searchParams.get('interval') || '1m'
    const limit = Math.min(parseInt(searchParams.get('limit') || '300'), 300)
    
    const tokenId = params.id
    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID required' }, { status: 400 })
    }

    // Get price history data
    const priceHistoryResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/tokens/${tokenId}/price-history?timeframe=24h&limit=1000`,
      { cache: 'no-store' }
    )

    if (!priceHistoryResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 })
    }

    const { priceHistory } = await priceHistoryResponse.json()
    
    if (!priceHistory || priceHistory.length === 0) {
      return NextResponse.json({ error: 'No price data available' }, { status: 404 })
    }

    // Convert interval to milliseconds
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

    const intervalMs = getIntervalMs(interval)
    
    // Group data into OHLC buckets
    const buckets = new Map<number, {
      open: number
      high: number
      low: number
      close: number
      volume: number
      count: number
    }>()

    priceHistory.forEach((point: any) => {
      const timestamp = new Date(point.timestamp).getTime()
      const bucketTime = Math.floor(timestamp / intervalMs) * intervalMs
      const price = point.price || 0
      const volume = point.volume || 0

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          open: price,
          high: price,
          low: price,
          close: price,
          volume: volume,
          count: 1
        })
      } else {
        const bucket = buckets.get(bucketTime)!
        bucket.high = Math.max(bucket.high, price)
        bucket.low = Math.min(bucket.low, price)
        bucket.close = price // Last price in the bucket
        bucket.volume += volume
        bucket.count += 1
      }
    })

    // Convert to OHLC format and sort by time
    const ohlcData: OHLCData[] = Array.from(buckets.entries())
      .map(([time, data]) => ({
        time: Math.floor(time / 1000), // Convert to seconds for lightweight-charts
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume
      }))
      .sort((a, b) => a.time - b.time)
      .slice(-limit) // Limit to requested number of candles

    return NextResponse.json(ohlcData)
  } catch (error) {
    console.error('OHLC API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
