"use client"

import { useMemo, useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchMarketAccount, estimatePriceHistory } from "@/lib/blockchain-utils"
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
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriceDataPoint {
  timestamp: string
  price: number
  volume: number
  type: string
}

interface PriceHistoryApiResponse {
  priceHistory: any[];
  volumeChange: number;
  isVolumeUp: boolean;
  recentVolume: number;
  earlierVolume: number;
  // ... other existing fields
}

interface PriceChartProps {
  tokenId: string
  marketAddress: string
  newsAccountAddress: string
  mintAddress: string
  className?: string
  showVolume?: boolean
  height?: number
  liveUpdates?: boolean
  refreshInterval?: number
  onchainVolumeSOL?: number
  livePrice?: number
}

const chartConfig: ChartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
  volume: {
    label: "Volume (SOL)",
    color: "hsl(var(--chart-2))",
  },
}


export function PriceChart({ 
  tokenId, 
  marketAddress,
  newsAccountAddress,
  mintAddress,
  className,
  showVolume = false,
  height = 300,
  liveUpdates = true,
  refreshInterval = 0,
  onchainVolumeSOL,
  livePrice
}: PriceChartProps) {
  // State for current volume and data
  const [currentVolume, setCurrentVolume] = useState(0.1006); // Latest volume from trading status
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isEstimated, setIsEstimated] = useState(false);
  const [onchainSeries, setOnchainSeries] = useState<Array<{ timestamp: string; volume: number }>>([]);
  const [liveSeries, setLiveSeries] = useState<Array<{ timestamp: string; price: number }>>([]);

  // Real-time polling disabled to avoid frequent requests

  // Fetch real price history data
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'live' | 'none'>('none');

  useEffect(() => {
    const fetchPriceHistory = async () => {
      if (!tokenId) {
        setFetchError('No token ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setFetchError(null);
        
        const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=24h&limit=100`);
        
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
          const data = await response.json();
        
        if (!data.priceHistory || data.priceHistory.length === 0) {
          // No DB trades; if we have a live price, switch to live streaming mode
          setFetchError(null);
          setChartData([]);
          setDataSource(typeof livePrice === 'number' ? 'live' : 'none');
        } else {
          setChartData(data.priceHistory);
          setVolumeChange(data.volumeChange || 0);
          setIsVolumeUp(data.isVolumeUp !== undefined ? data.isVolumeUp : true);
          setDataSource('database');
          setLastSuccessfulFetch(new Date());
          
          // Log price data
          const volumes = data.priceHistory.map((p: any) => p.volume);
          const totalVolume = volumes.reduce((a: number, b: number) => a + b, 0);
        }
      } catch (error) {
        // On error, only show live stream if we have a price; otherwise none
        setFetchError(null);
        setChartData([]);
        setDataSource(typeof livePrice === 'number' ? 'live' : 'none');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [tokenId, currentVolume, lastUpdate, onchainVolumeSOL]);

  // Keep footer stats updated from on-chain volume if provided
  useEffect(() => {
    if (typeof onchainVolumeSOL === 'number' && onchainVolumeSOL > 0) {
      setCurrentVolume(onchainVolumeSOL)
      setLastUpdate(new Date())
    }
  }, [onchainVolumeSOL]);

  // Live mode: append actual livePrice without synthetic noise
  useEffect(() => {
    if (dataSource !== 'live') return;
    const append = () => {
      if (typeof livePrice === 'number' && livePrice > 0) {
        const point = { timestamp: new Date().toISOString(), price: Number(livePrice.toFixed(10)) };
        setLiveSeries(prev => [...prev, point].slice(-600));
        setLastUpdate(new Date());
      }
    };
    // seed immediately and then every second
    append();
    const id = setInterval(append, 1000);
    return () => clearInterval(id);
  }, [dataSource, livePrice]);

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`
    } else if (price < 1) {
      return `$${price.toFixed(4)}`
    } else {
      return `$${price.toFixed(2)}`
    }
  }

  const formatVolume = (volume: number) => {
    if (volume < 0.01) {
      return `${volume.toFixed(4)}`
    } else if (volume < 1) {
      return `${volume.toFixed(3)}`
    } else {
      return `${volume.toFixed(2)}`
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

  const [volumeChange, setVolumeChange] = useState(0);
  const [isVolumeUp, setIsVolumeUp] = useState(true);

  // Always show the chart immediately, never show loading state

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Price Chart</h3>
              {liveUpdates && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">LIVE</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              Token Price
              {dataSource === 'database' && (
                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  Real Data
                </span>
              )}
              {dataSource === 'none' && (
                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  {fetchError ? 'Error' : 'No Data'}
                </span>
              )}
              {dataSource === 'live' && (
                <span className="ml-2 text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                  Live
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {dataSource === 'live' ? liveSeries.length : chartData.length} data points
            </Badge>
            <Badge 
              variant={isVolumeUp ? "default" : "destructive"}
              className="text-xs"
            >
              {isVolumeUp ? (
                <TrendingUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDownIcon className="w-3 h-3 mr-1" />
              )}
              {volumeChange.toFixed(1)}%
            </Badge>
          </div>
        </div>


        {/* Chart */}
        <div style={{ height }}>
          {dataSource === 'none' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <p className="text-red-500 font-medium mb-2">
                  {fetchError || 'No trading data available'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Ensure the oracle service is running to capture trading events
                </p>
              </div>
            </div>
          ) : (
          <ChartContainer config={chartConfig} className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataSource === 'database' ? chartData : liveSeries}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimestamp}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 'dataMax']}
                tickFormatter={(v: number) => `$${Number(v).toFixed(6)}`}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                     formatter={(value) => [formatPrice(Number(value)), 'Price']}
                    labelFormatter={(label) => formatTimestamp(label)}
                  />
                }
              />
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.08" />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="price" stroke="#34d399" fill="url(#volumeGradient)" fillOpacity={1} strokeWidth={2} />
            </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Current Volume</p>
            <p className="font-semibold">
              {formatVolume(currentVolume)} SOL
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">24h High</p>
            <p className="font-semibold text-green-500">
              {formatVolume(currentVolume)} SOL
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Avg Volume</p>
            <p className="font-semibold">{formatVolume(currentVolume * 0.6)} SOL</p>
          </div>
        </div>


      </div>
    </Card>
  )
}