"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  DollarSignIcon, 
  CalculatorIcon, 
  BarChart3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  TargetIcon,
  AwardIcon
} from "lucide-react";

interface TokenPnLData {
  tokenId: string;
  tokenName: string;
  totalPurchases: number;
  totalSales: number;
  averagePurchasePrice: number;
  currentHoldings: number;
  databaseHoldings: number;
  profitLoss: number;
  totalInvested: number;
  currentValue: number;
  trades: Array<{
    id: string;
    type: 'BUY' | 'SELL';
    amount: number;
    priceAtTrade: number;
    costInSol: number;
    timestamp: string;
  }>;
}

interface PortfolioPnLSummaryProps {
  tokenData: TokenPnLData[];
  className?: string;
}

export function PortfolioPnLSummary({ tokenData, className }: PortfolioPnLSummaryProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [sortBy, setSortBy] = useState<'pnl' | 'percentage' | 'name'>('pnl');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate aggregate metrics
  const totalPnL = tokenData.reduce((sum, token) => sum + token.profitLoss, 0);
  const totalInvested = tokenData.reduce((sum, token) => sum + token.totalInvested, 0);
  const totalCurrentValue = tokenData.reduce((sum, token) => sum + token.currentValue, 0);
  const totalReturnPercentage = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  // Calculate realized vs unrealized P&L
  const totalRealizedPnL = tokenData.reduce((sum, token) => {
    const buyTrades = token.trades.filter(trade => trade.type === 'BUY');
    const sellTrades = token.trades.filter(trade => trade.type === 'SELL');
    const totalBuyValue = buyTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
    const totalSellValue = sellTrades.reduce((sum, trade) => sum + (trade.amount * trade.priceAtTrade), 0);
    return sum + (totalSellValue - totalBuyValue);
  }, 0);

  const totalUnrealizedPnL = totalPnL - totalRealizedPnL;

  // Performance metrics
  const profitableTokens = tokenData.filter(token => token.profitLoss > 0).length;
  const winRate = tokenData.length > 0 ? (profitableTokens / tokenData.length) * 100 : 0;
  
  const bestPerformer = tokenData.reduce((best, token) => 
    token.profitLoss > best.profitLoss ? token : best, tokenData[0] || { profitLoss: 0, tokenName: 'N/A' });
  
  const worstPerformer = tokenData.reduce((worst, token) => 
    token.profitLoss < worst.profitLoss ? token : worst, tokenData[0] || { profitLoss: 0, tokenName: 'N/A' });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
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

  // Sort token data
  const sortedTokenData = [...tokenData].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'pnl':
        aValue = a.profitLoss;
        bValue = b.profitLoss;
        break;
      case 'percentage':
        aValue = a.totalInvested > 0 ? (a.profitLoss / a.totalInvested) * 100 : 0;
        bValue = b.totalInvested > 0 ? (b.profitLoss / b.totalInvested) * 100 : 0;
        break;
      case 'name':
        aValue = a.tokenName.toLowerCase();
        bValue = b.tokenName.toLowerCase();
        break;
      default:
        aValue = a.profitLoss;
        bValue = b.profitLoss;
    }
    
    if (sortBy === 'name') {
      return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const handleSort = (newSortBy: 'pnl' | 'percentage' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Portfolio P&L Summary</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2"
        >
          {showBreakdown ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
          {showBreakdown ? 'Hide' : 'Show'} Breakdown
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          <div className={`text-xl font-semibold ${getPnLColor(totalRealizedPnL)}`}>
            {formatCurrency(totalRealizedPnL)}
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Unrealized P&L</span>
            <CalculatorIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className={`text-xl font-semibold ${getPnLColor(totalUnrealizedPnL)}`}>
            {formatCurrency(totalUnrealizedPnL)}
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Win Rate</span>
            <TargetIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="text-xl font-semibold text-yellow-700 dark:text-yellow-300">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            {profitableTokens}/{tokenData.length} tokens
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <AwardIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Best Performer</span>
          </div>
          <div className="text-lg font-semibold text-green-700 dark:text-green-300">
            {bestPerformer.tokenName}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            {formatCurrency(bestPerformer.profitLoss)}
          </div>
        </div>

        <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">Worst Performer</span>
          </div>
          <div className="text-lg font-semibold text-red-700 dark:text-red-300">
            {worstPerformer.tokenName}
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            {formatCurrency(worstPerformer.profitLoss)}
          </div>
        </div>
      </div>

      {/* Token Breakdown Table */}
      {showBreakdown && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Token Breakdown</h3>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'pnl' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('pnl')}
              >
                P&L {sortBy === 'pnl' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
              <Button
                variant={sortBy === 'percentage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('percentage')}
              >
                % {sortBy === 'percentage' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
              <Button
                variant={sortBy === 'name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-sm">Token</th>
                  <th className="text-right p-3 font-semibold text-sm">P&L</th>
                  <th className="text-right p-3 font-semibold text-sm">Return %</th>
                  <th className="text-right p-3 font-semibold text-sm">Invested</th>
                  <th className="text-right p-3 font-semibold text-sm">Current Value</th>
                  <th className="text-right p-3 font-semibold text-sm">Trades</th>
                </tr>
              </thead>
              <tbody>
                {sortedTokenData.map((token) => {
                  const returnPercentage = token.totalInvested > 0 ? (token.profitLoss / token.totalInvested) * 100 : 0;
                  
                  return (
                    <tr key={token.tokenId} className="border-t hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium">{token.tokenName}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-semibold ${getPnLColor(token.profitLoss)}`}>
                          {formatCurrency(token.profitLoss)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`text-sm ${getPnLColor(returnPercentage)}`}>
                          {formatPercentage(returnPercentage)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(token.totalInvested)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(token.currentValue)}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant="outline" className="text-xs">
                          {token.trades.length}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
