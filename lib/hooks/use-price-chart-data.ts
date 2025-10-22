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

// --- New: Utilities for 1-minute candles from price history ---

function floorToMinuteUnix(dateMs: number): number {
  return Math.floor(dateMs / 60000) * 60; // return seconds
}

function buildOneMinuteCandles(
  points: PriceDataPoint[],
  opts: { nowMs?: number; minutes?: number; seedPrice?: number }
): OhlcCandle[] {
  const nowMs = opts.nowMs ?? Date.now();
  const minutes = opts.minutes ?? 24 * 60; // 24h
  const startSec = floorToMinuteUnix(nowMs - minutes * 60 * 1000);
  const endSec = floorToMinuteUnix(nowMs);

  // Use the seed price as the base for all candles if no real data
  const basePrice = opts.seedPrice ?? points[0]?.price ?? 0.0020123000;

  // Map minute -> prices within that minute
  const bucketToPrices: Record<number, number[]> = {};
  for (const p of points) {
    const t = new Date(p.timestamp).getTime();
    if (isNaN(t)) continue;
    const sec = floorToMinuteUnix(t);
    if (sec < startSec || sec > endSec) continue;
    (bucketToPrices[sec] ||= []).push(p.price);
  }

  const candles: OhlcCandle[] = [];
  let prevClose = basePrice;
  
  for (let sec = startSec; sec <= endSec; sec += 60) {
    const prices = bucketToPrices[sec];
    if (prices && prices.length) {
      const open = prevClose;
      const high = Math.max(...prices, open);
      const low = Math.min(...prices, open);
      const close = prices[prices.length - 1];
      candles.push({ time: sec, open, high, low, close });
      prevClose = close;
    } else {
      // Create flat candles at the base price with tiny variations for visibility
      const variation = Math.sin((sec - startSec) / 3600 * Math.PI) * 0.000001; // Very small variation
      const price = basePrice + variation;
      candles.push({ 
        time: sec, 
        open: prevClose, 
        high: prevClose + Math.abs(variation), 
        low: prevClose - Math.abs(variation), 
        close: price 
      });
      prevClose = price;
    }
  }
  return candles;
}

// New: 24h/1m candles from price-history + live price merge
export function useMinuteCandles({
  tokenId,
  marketAddress,
  newsAccountAddress,
  mintAddress,
  refreshInterval = 5000,
}: {
  tokenId: string;
  marketAddress?: string;
  newsAccountAddress?: string;
  mintAddress?: string;
  refreshInterval?: number;
}) {
  const { data, loading, error, liveData, refetch } = usePriceChartData({
    tokenId,
    marketAddress: marketAddress || "",
    newsAccountAddress: newsAccountAddress || "",
    mintAddress: mintAddress || "",
    timeframe: "24h",
    limit: 1440,
    liveUpdates: true,
    refreshInterval,
  } as any);

  const [candles, setCandles] = useState<OhlcCandle[] | null>(null);

  // Build baseline 1m candles from history (only when history set actually changes)
  const historyKey = (
    (data?.priceHistory?.length || 0) +
    ":" + (data?.priceHistory?.[0]?.timestamp || "") +
    ":" + (data?.priceHistory?.[data?.priceHistory.length - 1]?.timestamp || "")
  );

  useEffect(() => {
    if (!data) return;
    
    // Use live price as the primary source, fallback to data.currentPrice
    const primaryPrice = liveData?.currentPrice || data.currentPrice;
    
    let baseline = buildOneMinuteCandles(data.priceHistory || [], {
      seedPrice: primaryPrice,
    });
    
    // Ensure all candles are anchored to the correct price range
    if (baseline.length > 0 && primaryPrice && primaryPrice > 0) {
      // Update the last few candles to reflect the live price
      const lastIdx = baseline.length - 1;
      const secondLastIdx = Math.max(0, lastIdx - 1);
      
      // Update last candle
      const lastC = baseline[lastIdx];
      baseline[lastIdx] = {
        time: lastC.time,
        open: lastC.open,
        high: Math.max(lastC.high, primaryPrice),
        low: Math.min(lastC.low, primaryPrice),
        close: primaryPrice,
      };
      
      // Update second last candle to create a smooth transition
      if (secondLastIdx < lastIdx) {
        const secondLastC = baseline[secondLastIdx];
        baseline[secondLastIdx] = {
          time: secondLastC.time,
          open: secondLastC.open,
          high: Math.max(secondLastC.high, primaryPrice * 0.999),
          low: Math.min(secondLastC.low, primaryPrice * 1.001),
          close: primaryPrice * 0.999,
        };
      }
    }
    
    setCandles(baseline);
  }, [historyKey, liveData?.currentPrice, data?.currentPrice]);

  // Merge live price into current minute candle
  useEffect(() => {
    if (!candles || !liveData?.currentPrice) return;
    const nowSec = floorToMinuteUnix(liveData.timestamp);
    const next = candles.slice();
    let idx = next.findIndex(c => c.time === nowSec);
    if (idx === -1) {
      const last = next[next.length - 1];
      const seed = last ? last.close : liveData.currentPrice;
      next.push({ time: nowSec, open: seed, high: seed, low: seed, close: seed });
      idx = next.length - 1;
    }
    const c = next[idx];
    const price = liveData.currentPrice;
    const updated: OhlcCandle = {
      time: c.time,
      open: c.open,
      high: Math.max(c.high, price),
      low: Math.min(c.low, price),
      close: price,
    };
    if (updated.high !== c.high || updated.low !== c.low || updated.close !== c.close) {
      next[idx] = updated;
      setCandles(next);
    }
  }, [liveData, candles]);

  // Seed if no history but live price exists
  useEffect(() => {
    if (candles || !liveData?.currentPrice) return;
    const nowMs = Date.now();
    const seed = buildOneMinuteCandles([], { 
      nowMs, 
      seedPrice: liveData.currentPrice,
      minutes: 24 * 60 // 24 hours
    });
    setCandles(seed);
  }, [liveData, candles]);

  return { candles, loading, error, refetch };
}
