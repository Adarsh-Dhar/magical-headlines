"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUpIcon, TrendingDownIcon, WalletIcon, RefreshCwIcon } from "lucide-react"
import { useContract } from "@/lib/use-contract"
import { useWallet } from "@solana/wallet-adapter-react"

interface PortfolioHolding {
  newsAccount: string;
  mint: string;
  market: string;
  headline: string;
  arweaveLink: string;
  summaryLink: string;
  author: string;
  publishedAt: number;
  amount: number;
  currentPrice: number;
  totalValue: number;
  marketData: {
    currentSupply: string;
    solReserves: string;
    totalVolume: string;
    isDelegated: boolean;
  };
}

export default function PortfolioPage() {
  const { fetchUserNewsTokens, fetchUserTokenAccounts, getTotalTokenStats } = useContract();
  const { publicKey, connected } = useWallet();
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectingTokens, setDetectingTokens] = useState(false);

  const loadPortfolioData = async () => {
    if (!connected || !publicKey) {
      setError("Please connect your wallet to view your portfolio");
      return;
    }

    setLoading(true);
    setError(null);
    setDetectingTokens(true);

    try {
      console.log("Loading portfolio data for user:", publicKey.toString());
      
      // First, let's just fetch and log all token accounts
      const tokenAccounts = await fetchUserTokenAccounts();
      console.log("User token accounts:", tokenAccounts);
      
      // Try to fetch news tokens (now with proper detection)
      const newsTokens = await fetchUserNewsTokens();
      console.log("Found news tokens:", newsTokens);
      
      // Get total token statistics
      const tokenStats = await getTotalTokenStats();
      console.log("Token statistics:", tokenStats);
      
      setPortfolioHoldings(newsTokens);
      
    } catch (err) {
      console.error("Error loading portfolio:", err);
      setError(err instanceof Error ? err.message : "Failed to load portfolio data");
    } finally {
      setLoading(false);
      setDetectingTokens(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      loadPortfolioData();
    }
  }, [connected, publicKey]);

  const totalValue = portfolioHoldings.reduce((sum, h) => sum + h.totalValue, 0)
  const totalTokens = portfolioHoldings.reduce((sum, h) => sum + h.amount, 0)
  const avgPrice = totalTokens > 0 ? totalValue / totalTokens : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
          <h1 className="text-4xl font-bold mb-3">Portfolio</h1>
          <p className="text-lg text-muted-foreground">Track your holdings and performance</p>
          </div>
          <Button 
            onClick={loadPortfolioData} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <p className="text-3xl font-bold">${totalValue.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Tokens</span>
            </div>
            <p className="text-3xl font-bold">{totalTokens.toLocaleString()}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUpIcon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Avg Price</span>
            </div>
            <p className="text-3xl font-bold">${avgPrice.toFixed(6)}</p>
          </Card>
        </div>

        <Card>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Holdings</h2>
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
                <div>
                  <span>Loading portfolio data...</span>
                  {detectingTokens && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Detecting news tokens from your wallet...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!loading && !error && portfolioHoldings.length === 0 && (
            <div className="p-6">
              <div className="text-center py-8">
                <WalletIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Holdings Found</h3>
                <p className="text-muted-foreground">
                  {connected 
                    ? "You don't have any news tokens in your portfolio yet. Start by purchasing some tokens from the marketplace!"
                    : "Connect your wallet to view your portfolio holdings."
                  }
                </p>
              </div>
            </div>
          )}
          
          {!loading && !error && portfolioHoldings.length > 0 && (
            <div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-green-800 text-sm">
                  ✅ Found {portfolioHoldings.length} news token{portfolioHoldings.length !== 1 ? 's' : ''} in your portfolio
                </p>
              </div>
              <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Token</th>
                  <th className="text-left p-4 font-semibold">Headline</th>
                  <th className="text-right p-4 font-semibold">Amount</th>
                  <th className="text-right p-4 font-semibold">Current Price</th>
                    <th className="text-right p-4 font-semibold">Total Value</th>
                    <th className="text-right p-4 font-semibold">Supply</th>
                </tr>
              </thead>
              <tbody>
                {portfolioHoldings.map((holding) => (
                    <tr key={holding.mint} className="border-t hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <Badge variant="outline" className="font-mono">
                          {holding.mint.slice(0, 8)}...
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{holding.headline}</p>
                        <p className="text-sm text-muted-foreground">
                          by {holding.author.slice(0, 8)}...
                        </p>
                    </td>
                    <td className="p-4 text-right">
                        <span className="font-medium">{holding.amount.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-right">
                        <span className="font-bold">${holding.currentPrice.toFixed(6)}</span>
                    </td>
                    <td className="p-4 text-right">
                        <span className="font-bold">
                          ${holding.totalValue.toFixed(2)}
                        </span>
                    </td>
                    <td className="p-4 text-right">
                        <span className="text-sm text-muted-foreground">
                          {parseInt(holding.marketData.currentSupply).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
