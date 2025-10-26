"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUpIcon, TrendingDownIcon, RefreshCwIcon, DollarSignIcon, CalculatorIcon, BarChart3Icon } from "lucide-react";

interface Trade {
  id: string;
  type: 'BUY' | 'SELL';
  amount: number;
  priceAtTrade: number;
  costInSol: number;
  timestamp: string;
}

interface ProfitLossData {
  totalPurchases: number;
  totalSales: number;
  averagePurchasePrice: number;
  currentHoldings: number;
  databaseHoldings: number;
  profitLoss: number;
  totalInvested: number;
  currentValue: number;
  trades: Trade[];
}

interface ProfitLossStatementProps {
  tokenId: string;
  userAddress: string;
  currentPrice?: number;
  className?: string;
}

export function ProfitLossStatement({ 
  tokenId, 
  userAddress, 
  currentPrice,
  className 
}: ProfitLossStatementProps) {
  const [pnlData, setPnlData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  const fetchProfitLossData = useCallback(async () => {
    if (!tokenId || !userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tokens/${tokenId}?userAddress=${userAddress}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch profit/loss data');
      }

      const data = await response.json();
      
      if (data.userSpecificData) {
        setPnlData(data.userSpecificData);
      } else {
        throw new Error('No user data available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profit/loss data');
    } finally {
      setLoading(false);
    }
  }, [tokenId, userAddress]);

  // Initial fetch
  useEffect(() => {
    fetchProfitLossData();
  }, [fetchProfitLossData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1) {
      return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return amount.toFixed(9);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const calculateRealizedPnL = () => {
    if (!pnlData) return 0;
    
    const buyTrades = pnlData.trades.filter(trade => trade.type === 'BUY');
    const sellTrades = pnlData.trades.filter(trade => trade.type === 'SELL');
    
    const totalBuyValue = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
    const totalSellValue = sellTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
    
    return totalSellValue - totalBuyValue;
  };

  const calculateUnrealizedPnL = () => {
    if (!pnlData || !currentPrice) return 0;
    
    const currentValue = pnlData.currentHoldings * currentPrice;
    const costBasis = pnlData.totalInvested;
    
    return currentValue - costBasis;
  };

  const getPnLColor = (value: number) => {
    if (value > 0) return "text-green-600 dark:text-green-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getPnLBadgeVariant = (value: number) => {
    if (value > 0) return "default";
    if (value < 0) return "destructive";
    return "secondary";
  };

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profit/loss data...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchProfitLossData} variant="outline" size="sm">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!pnlData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No trading data available</p>
        </div>
      </Card>
    );
  }

  const realizedPnL = calculateRealizedPnL();
  const unrealizedPnL = calculateUnrealizedPnL();
  const totalPnL = realizedPnL + unrealizedPnL;
  const totalReturnPercentage = pnlData.totalInvested > 0 ? (totalPnL / pnlData.totalInvested) * 100 : 0;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Profit & Loss Statement</h2>
        </div>
        <Button 
          onClick={fetchProfitLossData} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total P&L */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total P&L</span>
            <Badge variant={getPnLBadgeVariant(totalPnL)}>
              {totalPnL >= 0 ? <TrendingUpIcon className="w-3 h-3 mr-1" /> : <TrendingDownIcon className="w-3 h-3 mr-1" />}
              {formatPercentage(totalReturnPercentage)}
            </Badge>
          </div>
          <div className={`text-2xl font-bold ${getPnLColor(totalPnL)}`}>
            {formatCurrency(totalPnL)}
          </div>
        </div>

        {/* Realized P&L */}
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Realized P&L</span>
            <DollarSignIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className={`text-xl font-semibold ${getPnLColor(realizedPnL)}`}>
            {formatCurrency(realizedPnL)}
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Unrealized P&L</span>
            <CalculatorIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className={`text-xl font-semibold ${getPnLColor(unrealizedPnL)}`}>
            {formatCurrency(unrealizedPnL)}
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Trading Summary</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
          >
            {showDetailedBreakdown ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Invested</div>
            <div className="text-lg font-semibold">{formatCurrency(pnlData.totalInvested)}</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Current Value</div>
            <div className="text-lg font-semibold">{formatCurrency(pnlData.currentValue)}</div>
          </div>
        </div>

        {showDetailedBreakdown && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-sm text-blue-600 dark:text-blue-400">Tokens Bought</div>
                <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  {formatTokenAmount(pnlData.totalPurchases)}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Avg Price: {formatCurrency(pnlData.averagePurchasePrice)}
                </div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="text-sm text-red-600 dark:text-red-400">Tokens Sold</div>
                <div className="text-lg font-semibold text-red-700 dark:text-red-300">
                  {formatTokenAmount(pnlData.totalSales)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Total Value: {formatCurrency(pnlData.totalSales * pnlData.averagePurchasePrice)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-sm text-green-600 dark:text-green-400">Current Holdings</div>
                <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {formatTokenAmount(pnlData.currentHoldings)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  Database: {formatTokenAmount(pnlData.databaseHoldings)}
                </div>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Total Trades</div>
                <div className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                  {pnlData.trades.length}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">
                  {pnlData.trades.filter(t => t.type === 'BUY').length} buys, {pnlData.trades.filter(t => t.type === 'SELL').length} sells
                </div>
              </div>
            </div>

            {/* Recent Trades */}
            {pnlData.trades.length > 0 && (
              <div className="pt-4">
                <h4 className="text-md font-semibold mb-3">Recent Trades</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pnlData.trades.slice(0, 5).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={trade.type === 'BUY' ? 'default' : 'secondary'}
                          className={trade.type === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {trade.type}
                        </Badge>
                        <span className="text-sm font-mono">{formatTokenAmount(trade.amount)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(trade.priceAtTrade)}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
