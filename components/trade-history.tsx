"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, ExternalLinkIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  priceAtTrade: number;
  costInSol: number;
  signature: string | null;
  timestamp: string;
  token: {
    id: string;
    headline: string;
    authorAddress: string;
    mintAccount: string | null;
  };
  trader: {
    walletAddress: string;
    name: string | null;
  };
}

interface TradeHistoryResponse {
  trades: Trade[];
  pagination: {
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
    limit: number;
    offset: number;
  };
}

interface TradeHistoryProps {
  userAddress: string;
  className?: string;
}

export function TradeHistory({ userAddress, className }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<TradeHistoryResponse['pagination'] | null>(null);

  const limit = 20;

  const fetchTrades = async (page: number = 1, type: 'ALL' | 'BUY' | 'SELL' = 'ALL') => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({
        userAddress,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (type !== 'ALL') {
        params.append('type', type);
      }

      const response = await fetch(`/api/trades?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }

      const data: TradeHistoryResponse = await response.json();
      setTrades(data.trades);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades(1, filterType);
  }, [userAddress, filterType]);

  const handleFilterChange = (type: 'ALL' | 'BUY' | 'SELL') => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    fetchTrades(page, filterType);
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1) {
      return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return amount.toFixed(9);
  };

  const formatPrice = (price: number) => {
    return `$${price.toFixed(6)}`;
  };

  const formatCost = (cost: number) => {
    return `${cost.toFixed(6)} SOL`;
  };

  const getSolanaExplorerUrl = (signature: string) => {
    return `https://explorer.solana.com/tx/${signature}`;
  };

  return (
    <Card className={className}>
      <div className="p-6 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Trade History</h2>
          <Button
            onClick={() => fetchTrades(currentPage, filterType)}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <Button
            variant={filterType === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('ALL')}
          >
            All Trades
          </Button>
          <Button
            variant={filterType === 'BUY' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('BUY')}
          >
            Buys Only
          </Button>
          <Button
            variant={filterType === 'SELL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('SELL')}
          >
            Sells Only
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCwIcon className="w-6 h-6 animate-spin mr-2" />
            <span>Loading trade history...</span>
          </div>
        </div>
      )}

      {!loading && !error && trades.length === 0 && (
        <div className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No trades found for this user.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && trades.length > 0 && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Date/Time</th>
                  <th className="text-left p-4 font-semibold">Token</th>
                  <th className="text-center p-4 font-semibold">Type</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-right p-4 font-semibold">Price</th>
                  <th className="text-right p-4 font-semibold">Total Cost</th>
                  <th className="text-center p-4 font-semibold">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-t hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm">
                        {formatDate(trade.timestamp)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-sm">{trade.token.headline}</p>
                        <p className="text-xs text-muted-foreground">
                          by {trade.token.authorAddress.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-center">
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
                      <span className="font-mono text-sm">
                        {formatCost(trade.costInSol)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {trade.signature ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getSolanaExplorerUrl(trade.signature!), '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLinkIcon className="w-3 h-3" />
                          View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {trades.length} of {pagination.totalCount} trades
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
