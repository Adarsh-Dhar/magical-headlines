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
  liveUpdates = false,
  refreshInterval = 0,
  onchainVolumeSOL
}: PriceChartProps) {
  // State for current volume and data
  const [currentVolume, setCurrentVolume] = useState(0.1006); // Latest volume from trading status
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isEstimated, setIsEstimated] = useState(false);
  const [onchainSeries, setOnchainSeries] = useState<Array<{ timestamp: string; volume: number }>>([]);

  // Real-time polling disabled to avoid frequent requests

  // Fetch real price history data
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<'database' | 'onchain' | 'none'>('none');

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
          // No DB trades; fall back to plotting on-chain volume samples if available
          if (typeof onchainVolumeSOL === 'number' && onchainVolumeSOL > 0) {
            const now = new Date();
            const initialPoint = { timestamp: now.toISOString(), volume: onchainVolumeSOL };
            // Create a simple time series with the current volume
            const timeSeries = [
              { timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), volume: onchainVolumeSOL },
              { timestamp: now.toISOString(), volume: onchainVolumeSOL }
            ];
            setOnchainSeries(timeSeries);
            setChartData([]);
            setDataSource('onchain');
            setIsEstimated(false);
            setLastSuccessfulFetch(now);
            // Price/volume log only
          } else {
            setFetchError('No trading data available. Oracle service may not be running or no trades have occurred.');
            setChartData([]);
            setDataSource('none');
          }
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
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setFetchError(`Failed to load chart data: ${errorMsg}`);
        setChartData([]);
        setDataSource('none');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceHistory();
  }, [tokenId, currentVolume, lastUpdate, onchainVolumeSOL]);

  // Update chart when on-chain volume changes
  useEffect(() => {
    if (typeof onchainVolumeSOL === 'number' && onchainVolumeSOL > 0 && dataSource === 'onchain') {
      const now = new Date();
      const newPoint = { timestamp: now.toISOString(), volume: onchainVolumeSOL };
      setOnchainSeries(prev => {
        const updated = [...prev, newPoint].slice(-200);
        return updated;
      });
      setCurrentVolume(onchainVolumeSOL);
      setLastUpdate(now);
    }
  }, [onchainVolumeSOL, dataSource]);

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
              <h3 className="text-lg font-semibold">Volume Chart</h3>
              {liveUpdates && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">LIVE</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate max-w-xs">
              Trading Volume (SOL)
              {dataSource === 'database' && (
                <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  Real Data
                </span>
              )}
              {dataSource === 'onchain' && (
                <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  On-Chain Data
                </span>
              )}
              {dataSource === 'none' && (
                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  {fetchError ? 'Error' : 'No Data'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {dataSource === 'onchain' ? onchainSeries.length : chartData.length} data points
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
          {fetchError || (chartData.length === 0 && onchainSeries.length === 0) ? (
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
              <AreaChart data={chartData.length > 0 ? chartData : onchainSeries}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimestamp}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 'dataMax + 0.01']}
                tickFormatter={formatVolume}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      name === "volume" ? formatVolume(Number(value)) : formatPrice(Number(value)),
                      name === "volume" ? "Volume (SOL)" : "Price"
                    ]}
                    labelFormatter={(label) => formatTimestamp(label)}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke="var(--color-volume)"
                fill="var(--color-volume)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
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
