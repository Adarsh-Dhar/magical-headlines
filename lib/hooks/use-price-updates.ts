"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PriceUpdate {
  tokenId: string
  price: number
  timestamp: string
}

export function usePriceUpdates(tokenIds: string[], intervalMs: number = 30000) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchPrices = useCallback(async () => {
    if (tokenIds.length === 0) return

    try {
      setLoading(true)
      setError(null)

      // Fetch prices for all tokens in parallel
      const pricePromises = tokenIds.map(async (tokenId) => {
        try {
          const response = await fetch(`/api/tokens/${tokenId}/price-history?timeframe=1h&limit=1`)
          if (response.ok) {
            const data = await response.json()
            return { tokenId, price: data.currentPrice }
          }
          return null
        } catch (error) {
          console.warn(`Failed to fetch price for token ${tokenId}:`, error)
          return null
        }
      })

      const results = await Promise.all(pricePromises)
      const newPrices: Record<string, number> = {}
      
      results.forEach((result) => {
        if (result) {
          newPrices[result.tokenId] = result.price
        }
      })

      setPrices(prev => ({ ...prev, ...newPrices }))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch prices")
      console.error("Error fetching prices:", error)
    } finally {
      setLoading(false)
    }
  }, [tokenIds])

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Initial fetch
    fetchPrices()

    // Set up interval for periodic updates
    intervalRef.current = setInterval(fetchPrices, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [tokenIds, intervalMs]) // Remove fetchPrices from dependencies

  return {
    prices,
    loading,
    error,
    refetch: fetchPrices
  }
}
