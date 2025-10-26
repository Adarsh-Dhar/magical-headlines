"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  priceAtTrade: number;
  timestamp: string;
  trader: {
    walletAddress: string;
    name: string | null;
  };
}

interface TokenOrderBookProps {
  tokenId: string;
  className?: string;
}

export function TokenOrderBook({ tokenId, className }: TokenOrderBookProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async () => {
    if (!tokenId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/trades?tokenId=${tokenId}&limit=20&offset=0`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const data = await response.json();
      setTrades(data.trades || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  // Initial fetch
  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const formatAmount = (amount: number) => {
    if (amount >= 1) {
      return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return amount.toFixed(9);
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const tradeTime = new Date(timestamp);
    const diffMs = now.getTime() - tradeTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className={className}>
      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Order Book</h2>
          <Button
            onClick={fetchTrades}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && trades.length === 0 && (
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-5 bg-gray-200 rounded"></div>
                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    <div className="w-12 h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && trades.length === 0 && (
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              No trades found for this token yet.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Type</th>
                <th className="text-right p-4 font-semibold text-sm">Amount</th>
                <th className="text-right p-4 font-semibold text-sm">Price</th>
                <th className="text-right p-4 font-semibold text-sm">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-t hover:bg-accent/50 transition-colors">
                  <td className="p-4">
                    <Badge 
                      variant={trade.type === 'BUY' ? 'default' : 'secondary'}
                      className={trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                    >
                      {trade.type}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono text-sm">
                      {formatAmount(trade.amount)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono text-sm">
                      {formatPrice(trade.priceAtTrade)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(trade.timestamp)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
