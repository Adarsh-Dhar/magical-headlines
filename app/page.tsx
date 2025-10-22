"use client";

import { useEffect } from "react";
import { NewsFeed } from "@/components/news-feed"
import { TrendingStories } from "@/components/trending-stories"
import { MarketStats } from "@/components/market-stats"
import { UserInfoLogger } from "@/components/user-info-logger"
import { SeasonCountdown } from "@/components/season-countdown"
import { UserProfile } from "@/components/user-profile"
import { useContract } from "@/lib/use-contract"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { PublicKey } from "@solana/web3.js"

export default function HomePage() {
  const { program } = useContract();
  const { connected, publicKey, connecting } = useWallet();
  const { connection } = useConnection();

  useEffect(() => {
    const fetchNewsTokens = async () => {
      if (!connected || !publicKey || !program) {
        return;
      }

      try {
        
        // Check if program and account namespace exist
        if (!program || !program.account) {
          return;
        }
        
        // Try to access newsAccount with proper error handling
        const newsAccountNamespace = (program.account as any).newsAccount;
        if (!newsAccountNamespace || typeof newsAccountNamespace.all !== 'function') {
          return;
        }
        
        // Fetch all news accounts from the blockchain
        const accounts = await newsAccountNamespace.all();
        
        
      } catch (error) {
      }
    };

    fetchNewsTokens();
  }, [connected, publicKey, program]);

  // Show loading state while wallet is connecting
  if (connecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting wallet...</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <UserInfoLogger />
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Magical Headlines</h1>
            <p className="text-lg text-muted-foreground text-balance mb-8">
              Where breaking news becomes tradable assets. Speculate on attention, profit from trends.
            </p>
            <div className="bg-muted/50 rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
              <p className="text-muted-foreground mb-6">
                Connect your Solana wallet to start trading headline tokens and participating in the news marketplace.
              </p>
              <p className="text-sm text-muted-foreground">
                Click the "Connect Wallet" button in the top right corner to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UserInfoLogger />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Magical Headlines</h1>
          <p className="text-lg text-muted-foreground text-balance">
            Where breaking news becomes tradable assets. Speculate on attention, profit from trends.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <SeasonCountdown />
          <UserProfile />
          <div>{/* Space for additional component */}</div>
        </div>

        <MarketStats />

        <div className="grid lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <NewsFeed />
          </div>
          <div>
            <TrendingStories />
          </div>
        </div>
      </div>
    </div>
  )
}
