"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useContract } from "@/lib/use-contract";

interface LivePriceData {
  currentPrice: number;
  currentSupply: number;
  solReserves: number;
  totalVolume: number;
  isDelegated: boolean;
  timestamp: number;
}

interface UseLivePriceProps {
  marketAddress: string;
  newsAccountAddress: string;
  mintAddress: string;
  enabled?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useLivePrice({
  marketAddress,
  newsAccountAddress,
  mintAddress,
  enabled = true,
  refreshInterval = 5000, // 5 seconds
}: UseLivePriceProps) {
  const [data, setData] = useState<LivePriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { program, estimateBuyCost, getMarketDelegationStatus } = useContract();

  const fetchLivePrice = useCallback(async () => {
    if (!program || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const marketPubkey = new PublicKey(marketAddress);
      
      // Fetch market data from the contract
      const marketData = await getMarketDelegationStatus(marketPubkey);
      
      // Calculate current price using the same logic as the contract
      const currentPrice = await estimateBuyCost(marketPubkey, 1);
      
      const liveData: LivePriceData = {
        currentPrice,
        currentSupply: Number(marketData.currentSupply),
        solReserves: 0, // Not available from getMarketDelegationStatus
        totalVolume: Number(marketData.totalVolume),
        isDelegated: marketData.isDelegated,
        timestamp: Date.now(),
      };

      setData(liveData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch live price data";
      setError(errorMessage);
      console.error("Error fetching live price:", err);
    } finally {
      setLoading(false);
    }
  }, [program, marketAddress, enabled, estimateBuyCost, getMarketDelegationStatus]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchLivePrice();
    }
  }, [enabled, fetchLivePrice]);

  // Set up polling
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(fetchLivePrice, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchLivePrice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchLivePrice,
  };
}
