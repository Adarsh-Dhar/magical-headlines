"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLivePrice } from "./use-live-price";

interface PriceDataPoint {
  timestamp: string;
  price: number;
  volume: number;
  type: string;
  tradeId?: string;
}

interface PriceHistoryResponse {
  tokenId: string;
  storyId: string;
  storyHeadline: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  timeframe: string;
  priceHistory: PriceDataPoint[];
  tradeCount: number;
  priceChange: number;
  firstPrice: number;
  lastPrice: number;
}

interface UsePriceChartDataProps {
  tokenId: string;
  marketAddress: string;
  newsAccountAddress: string;
  mintAddress: string;
  timeframe?: string;
  limit?: number;
  liveUpdates?: boolean;
  refreshInterval?: number;
}

export function usePriceChartData({
  tokenId,
  marketAddress,
  newsAccountAddress,
  mintAddress,
  timeframe = "24h",
  limit = 100,
  liveUpdates = true,
  refreshInterval = 0,
}: UsePriceChartDataProps) {
  const [historicalData, setHistoricalData] = useState<PriceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [combinedData, setCombinedData] = useState<PriceDataPoint[]>([]);
  
  const { data: livePriceData, loading: liveLoading, error: liveError } = useLivePrice({
    marketAddress,
    newsAccountAddress,
    mintAddress,
    enabled: liveUpdates,
    refreshInterval,
  });

  const fetchHistoricalData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=${timeframe}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHistoricalData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch price data";
      setError(errorMessage);
      // console.error("Error fetching price history:", err);
    } finally {
      setLoading(false);
    }
  }, [tokenId, timeframe, limit]);

  // Combine historical and live data
  useEffect(() => {
    if (!historicalData) return;

    let combined: PriceDataPoint[] = [...historicalData.priceHistory];

    // If no historical data but we have live data, create a simple price history
    if (combined.length === 0 && livePriceData && livePriceData.currentPrice > 0) {
      const now = new Date();
      const currentPrice = livePriceData.currentPrice;
      
      // Create a simple price history with some variation
      combined = [
        {
          timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          price: currentPrice * 0.95,
          volume: 0,
          type: "generated"
        },
        {
          timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
          price: currentPrice * 0.98,
          volume: 0,
          type: "generated"
        },
        {
          timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
          price: currentPrice * 1.01,
          volume: 0,
          type: "generated"
        },
        {
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          price: currentPrice * 0.99,
          volume: 0,
          type: "generated"
        },
        {
          timestamp: now.toISOString(),
          price: currentPrice,
          volume: 0,
          type: "live"
        }
      ];
    } else if (livePriceData && livePriceData.currentPrice > 0) {
      // Add live price data if available and different from last historical point
      const lastHistoricalPrice = combined[combined.length - 1]?.price || 0;
      const priceDifference = Math.abs(livePriceData.currentPrice - lastHistoricalPrice);
      
      // Only add live data if price has changed significantly (more than 0.1% difference)
      if (priceDifference > lastHistoricalPrice * 0.001) {
        const liveDataPoint: PriceDataPoint = {
          timestamp: new Date(livePriceData.timestamp).toISOString(),
          price: livePriceData.currentPrice,
          volume: 0,
          type: "live",
          tradeId: "live"
        };

        // Remove any existing live data points and add the new one
        combined = combined.filter(point => point.type !== "live");
        combined.push(liveDataPoint);
      }
    }

    setCombinedData(combined);
  }, [historicalData, livePriceData]);

  // Initial fetch
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Disable periodic updates to avoid frequent requests; caller can refetch manually

  const refetch = useCallback(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return {
    data: historicalData ? {
      ...historicalData,
      priceHistory: combinedData,
      currentPrice: livePriceData?.currentPrice || historicalData.currentPrice,
    } : null,
    loading: loading || (liveUpdates && liveLoading),
    error: error || liveError,
    refetch,
    liveData: livePriceData,
  };
}

// New: OHLC candles for 7d/1h
export interface OhlcCandle {
  time: number; // seconds since epoch UTC
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useCandlesData({
  tokenId,
  marketAddress,
  newsAccountAddress,
  mintAddress,
  liveUpdates = true,
  refreshInterval = 10000,
}: {
  tokenId: string;
  marketAddress?: string;
  newsAccountAddress?: string;
  mintAddress?: string;
  liveUpdates?: boolean;
  refreshInterval?: number;
}) {
  const [candles, setCandles] = useState<OhlcCandle[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: live } = useLivePrice({
    marketAddress: marketAddress || "",
    newsAccountAddress: newsAccountAddress || "",
    mintAddress: mintAddress || "",
    enabled: liveUpdates && !!marketAddress && !!newsAccountAddress && !!mintAddress,
    refreshInterval,
  });

  const fetchCandles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/tokens/${tokenId}/ohlc?range=7d&interval=1h`);
      if (!res.ok) throw new Error(`Failed to fetch candles: ${res.statusText}`);
      const data: OhlcCandle[] = await res.json();
      setCandles(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch candles";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  // seed
  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  // live update last candle and roll hourly
  useEffect(() => {
    if (!candles || !live || !live.currentPrice) return;
    const last = candles[candles.length - 1];
    const nowMs = live.timestamp;
    const hourStartSec = Math.floor(nowMs / 1000 / 3600) * 3600;

    let next = candles.slice();
    if (!last || last.time < hourStartSec) {
      const seed = last ? last.close : live.currentPrice;
      next.push({ time: hourStartSec, open: seed, high: seed, low: seed, close: seed });
    }

    const idx = next.length - 1;
    const c = next[idx];
    const price = live.currentPrice;
    const updated: OhlcCandle = {
      time: c.time,
      open: c.open,
      high: Math.max(c.high, price),
      low: Math.min(c.low, price),
      close: price,
    };
    if (
      updated.high !== c.high ||
      updated.low !== c.low ||
      updated.close !== c.close
    ) {
      next[idx] = updated;
      setCandles(next);
    }
  }, [candles, live]);

  return { candles, loading, error, refetch: fetchCandles };
}
